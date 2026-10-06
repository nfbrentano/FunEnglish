import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "./helpers/firebase-admin.js";

export const onLessonUpdated = onDocumentUpdated("users/{teacherUid}/lessons/{lessonId}", async (event) => {
  const db = getAdminFirestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const lessonId = event.params.lessonId;
  const studentId = after.studentId;
  if (!studentId) return;

  // Only handle if status changed
  if (before.status === after.status) return;

  // We only consume credits if the lesson was confirmed by the student
  // "agendou, aceitou a proposta ou entrou na aula confirmando"
  // Assuming a field `confirmed` exists, or if studentId exists, it's scheduled.
  // The spec says: Aula proposta pelo professor e não confirmada nunca consome.
  // For this logic, we assume `studentConfirmed === true`.
  if (after.studentConfirmed === false) return;

  const ledgerRef = db.collection(`students/${studentId}/ledger`);
  const planRef = db.doc(`students/${studentId}/private/billing`);

  let creditChange = 0;
  let reason = "";

  // Helper to determine if cancelled within 24h
  const wasLateCancellation = (lessonAt: any, cancelledAt: any) => {
    if (!lessonAt || !cancelledAt) return false;
    const diffMs = lessonAt.toDate().getTime() - cancelledAt.toDate().getTime();
    return diffMs < 24 * 60 * 60 * 1000; // Less than 24h
  };

  // Determine what to do based on the new status
  if (after.status === "Done") {
    creditChange = -1;
    reason = `Lesson ${after.date || lessonId}`;
  } else if (after.status === "No-show") {
    creditChange = -1;
    reason = `No-show · Lesson ${after.date || lessonId}`;
  } else if (after.status === "Cancelled by student") {
    const cancelledAt = after.cancelledAt || FieldValue.serverTimestamp();
    if (wasLateCancellation(after.startAt, cancelledAt)) {
      creditChange = -1;
      reason = `Late cancellation · Lesson ${after.date || lessonId}`;
    }
  }

  // Handle reversals: if it WAS consuming credit but now it's not (e.g. Done -> Cancelled by teacher)
  let previousConsumed = false;
  if (before.status === "Done" || before.status === "No-show") {
    previousConsumed = true;
  } else if (before.status === "Cancelled by student" && wasLateCancellation(before.startAt, before.cancelledAt)) {
    previousConsumed = true;
  }

  const currentlyConsumed = creditChange === -1;

  await db.runTransaction(async (t) => {
    // If it was consumed before but shouldn't be now, refund
    if (previousConsumed && !currentlyConsumed) {
      const planSnap = await t.get(planRef);
      if (planSnap.exists) {
        const data = planSnap.data()!;
        t.update(planRef, {
          creditsBalance: (data.creditsBalance || 0) + 1,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // Add reversal entry
        const reversalRef = ledgerRef.doc(`refund_${lessonId}_${Date.now()}`);
        t.set(reversalRef, {
          type: "adjustment",
          credits: 1,
          reason: `Refund · ${before.status} -> ${after.status}`,
          lessonId,
          at: FieldValue.serverTimestamp(),
          createdBy: "system"
        });
      }
    } 
    // If it wasn't consumed before but should be now, deduct
    else if (!previousConsumed && currentlyConsumed) {
      const entryRef = ledgerRef.doc(`lesson_${lessonId}`);
      const entrySnap = await t.get(entryRef);
      
      // Idempotency check: if entry already exists, don't deduct again
      if (!entrySnap.exists) {
        const planSnap = await t.get(planRef);
        if (planSnap.exists) {
          const data = planSnap.data()!;
          t.update(planRef, {
            creditsBalance: (data.creditsBalance || 0) - 1,
            updatedAt: FieldValue.serverTimestamp()
          });
          
          t.set(entryRef, {
            type: "lesson",
            credits: -1,
            reason,
            lessonId,
            at: FieldValue.serverTimestamp(),
            createdBy: "system"
          });
        }
      }
    }
  });
});

export const renewMonthlyPlans = onSchedule("every day 00:00", async (event) => {
  const db = getAdminFirestore();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const studentsSnap = await db.collection("students").get();
  
  for (const doc of studentsSnap.docs) {
    const planRef = db.doc(`students/${doc.id}/private/billing`);
    const ledgerRef = db.collection(`students/${doc.id}/ledger`);
    
    await db.runTransaction(async (t) => {
      const planSnap = await t.get(planRef);
      if (!planSnap.exists) return;
      
      const plan = planSnap.data()!;
      if (plan.type !== "monthly" || !plan.nextBillingDate) return;
      
      const nextDate = plan.nextBillingDate.toDate();
      const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      // If it's time to renew (diffDays <= 0)
      if (diffDays <= 0) {
        const renewalId = `renewal_${yearMonth}`;
        const entryRef = ledgerRef.doc(renewalId);
        const entrySnap = await t.get(entryRef);
        
        // Idempotency: skip if already renewed this month
        if (!entrySnap.exists) {
          const addedCredits = plan.monthlyCredits || 4; // Default to 4 if not set
          
          t.update(planRef, {
            creditsBalance: (plan.creditsBalance || 0) + addedCredits,
            // Advance next billing date by 1 month
            nextBillingDate: new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate()),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          t.set(entryRef, {
            type: "renewal",
            credits: addedCredits,
            reason: `Monthly renewal (${yearMonth})`,
            at: FieldValue.serverTimestamp(),
            createdBy: "system"
          });
        }
      }
    });
  }
});
