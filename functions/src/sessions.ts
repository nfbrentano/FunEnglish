import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDatabase, getAdminFirestore } from "./helpers/firebase-admin.js";

/**
 * Task logic to close active sessions inactive for over 6 hours (RF11).
 * Marks their status as "draft" and endedAt as now, without publishing summaries.
 */
export async function closeInactiveSessionsTask(
  db: ReturnType<typeof getAdminFirestore>,
  now: Date = new Date(),
): Promise<number> {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - SIX_HOURS_MS);

  const snapshot = await db
    .collectionGroup("sessions")
    .where("status", "==", "active")
    .get();

  let closedCount = 0;
  const batch = db.batch();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const lastActivity = data.lastActivityAt?.toDate
      ? data.lastActivityAt.toDate()
      : data.lastActivityAt
        ? new Date(data.lastActivityAt)
        : data.startedAt?.toDate
          ? data.startedAt.toDate()
          : data.startedAt
            ? new Date(data.startedAt)
            : null;

    if (lastActivity && lastActivity.getTime() < cutoff.getTime()) {
      batch.update(docSnap.ref, {
        status: "draft",
        endedAt: now,
        autoClosedReason: "inactivity_timeout_6h",
      });
      closedCount++;
    }
  }

  if (closedCount > 0) {
    await batch.commit();
  }

  return closedCount;
}

/**
 * Task logic to cleanup live rooms older than 24 hours (RNF08).
 */
export async function cleanupExpiredLiveRoomsTask(
  rtdb: ReturnType<typeof getAdminDatabase>,
  now: Date = new Date(),
): Promise<number> {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const cutoffTime = now.getTime() - TWENTY_FOUR_HOURS_MS;

  const snap = await rtdb.ref("liveRooms").once("value");
  if (!snap.exists()) return 0;

  let cleaned = 0;
  const rooms = snap.val();
  const updates: Record<string, null> = {};

  for (const [code, roomData] of Object.entries(rooms as Record<string, any>)) {
    const createdAt = roomData?.createdAt || 0;
    if (createdAt < cutoffTime) {
      updates[`liveRooms/${code}`] = null;
      updates[`liveRoomPins/${code}`] = null;
      cleaned++;
    }
  }

  if (cleaned > 0) {
    await rtdb.ref().update(updates);
  }

  return cleaned;
}

/**
 * Scheduled Cloud Function running every hour to auto-close inactive sessions (RF11)
 * and cleanup expired live rooms older than 24 hours (RNF08).
 */
export const autoCloseInactiveSessions = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
  },
  async () => {
    const db = getAdminFirestore();
    const count = await closeInactiveSessionsTask(db);
    console.log(`Auto-closed ${count} inactive classroom sessions.`);

    try {
      const rtdb = getAdminDatabase();
      const cleanedRooms = await cleanupExpiredLiveRoomsTask(rtdb);
      console.log(`Cleaned up ${cleanedRooms} expired live rooms.`);
    } catch (e) {
      console.warn("Error cleaning up expired live rooms:", e);
    }
  },
);

/**
 * Trigger to auto-complete learning track steps when a session ends (spec 11: RF06, RNF03).
 */
export const onSessionEnded = onDocumentUpdated(
  "users/{teacherUid}/sessions/{sessionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || before?.status === "ended" || after.status !== "ended") return;

    const activities: Array<{ id: string }> = Array.isArray(after.activitiesPlayed)
      ? after.activitiesPlayed
      : [];
    const attendance = after.attendance || {};
    const presentStudentIds = Object.keys(attendance).filter((id) => attendance[id] === true);
    if (activities.length === 0 || presentStudentIds.length === 0) return;

    const db = getAdminFirestore();
    const actIdsPlayed = activities.map((a) => a.id);

    for (const studentId of presentStudentIds) {
      try {
        const tracksSnap = await db.collection(`students/${studentId}/tracks`).get();
        for (const tDoc of tracksSnap.docs) {
          const tData = tDoc.data();
          if (!tData.countClassActivities) continue;
          const trackActIds: string[] = Array.isArray(tData.activityIds) ? tData.activityIds : [];
          const comp = tData.completed || {};
          const updates: Record<string, unknown> = {};
          let updatedAny = false;

          for (const actId of actIdsPlayed) {
            if (trackActIds.includes(actId) && !comp[actId]) {
              updates[`completed.${actId}`] = {
                at: new Date().toISOString(),
                source: "class",
              };
              updatedAny = true;
            }
          }

          if (updatedAny) {
            updates.updatedAt = FieldValue.serverTimestamp();
            await tDoc.ref.update(updates);
          }
        }
      } catch (e) {
        console.warn("Error auto-completing track step on session end:", e);
      }
    }
  },
);

