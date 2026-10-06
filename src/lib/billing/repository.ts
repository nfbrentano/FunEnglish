import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  runTransaction,
  collectionGroup,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { type BillingPlan, type LedgerEntry, type BillingStatus } from "./types";
import { getTeacherStudents } from "@/lib/classes/repository";

function toDate(val: unknown): Date {
  if (val && typeof (val as Timestamp).toDate === "function") {
    return (val as Timestamp).toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  return new Date();
}

/**
 * Gets the billing plan for a student.
 */
export async function getBillingPlan(studentId: string): Promise<BillingPlan | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, `students/${studentId}/private/billing`));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    updatedAt: toDate(data.updatedAt),
  } as BillingPlan;
}

/**
 * Updates the billing plan settings for a student.
 */
export async function updateBillingPlan(
  studentId: string, 
  plan: Partial<BillingPlan>
): Promise<void> {
  const db = getDb();
  const ref = doc(db, `students/${studentId}/private/billing`);
  await setDoc(ref, {
    ...plan,
    updatedAt: new Date(),
  }, { merge: true });
}

/**
 * Gets the ledger entries for a student, ordered by date descending.
 */
export async function getLedgerEntries(studentId: string): Promise<LedgerEntry[]> {
  const db = getDb();
  const ledgerCol = collection(db, `students/${studentId}/ledger`);
  const q = query(ledgerCol, orderBy("at", "desc"));
  const snap = await getDocs(q);
  
  return snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      at: toDate(data.at),
    } as LedgerEntry;
  });
}

/**
 * Adds a new entry to the ledger and updates the credits balance transactionally.
 */
export async function addLedgerEntry(
  studentId: string,
  entry: Omit<LedgerEntry, "id" | "at">,
  entryId?: string
): Promise<void> {
  const db = getDb();
  const planRef = doc(db, `students/${studentId}/private/billing`);
  const ledgerCol = collection(db, `students/${studentId}/ledger`);
  const ledgerRef = entryId ? doc(ledgerCol, entryId) : doc(ledgerCol);
  
  await runTransaction(db, async (transaction) => {
    if (entryId) {
      const existingEntry = await transaction.get(ledgerRef);
      if (existingEntry.exists()) {
        throw new Error("Lançamento já existe");
      }
    }

    const planSnap = await transaction.get(planRef);
    let currentBalance = 0;
    if (planSnap.exists()) {
      currentBalance = planSnap.data().creditsBalance || 0;
    }
    
    const newBalance = currentBalance + entry.credits;
    
    transaction.set(planRef, {
      creditsBalance: newBalance,
      updatedAt: new Date(),
    }, { merge: true });
    
    transaction.set(ledgerRef, {
      ...entry,
      at: new Date(),
    });
  });
}

/**
 * Calculates the total revenue received in a given month.
 */
export async function getTeacherMonthlyRevenue(teacherUid: string, year: number, month: number): Promise<number> {
  const db = getDb();
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  const q = query(
    collectionGroup(db, "ledger"),
    where("createdBy", "==", teacherUid),
    where("type", "==", "payment"),
    where("at", ">=", startOfMonth),
    where("at", "<=", endOfMonth)
  );
  
  const snap = await getDocs(q);
  let totalCents = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.amountCents) {
      totalCents += data.amountCents;
    }
  }
  return totalCents;
}

export interface BillingAlert {
  studentId: string;
  studentName: string;
  status: BillingStatus;
  creditsBalance: number;
}

/**
 * Gets billing alerts for all students of a teacher.
 */
export async function getBillingAlerts(teacherUid: string): Promise<BillingAlert[]> {
  const students = await getTeacherStudents(teacherUid);
  const alerts: BillingAlert[] = [];
  
  await Promise.all(
    students.map(async (student) => {
      const plan = await getBillingPlan(student.id);
      if (!plan) return;
      
      let status: BillingStatus = "Paid";
      
      // Determine status based on plan
      if (plan.type === "package") {
        if (plan.creditsBalance <= 0) {
          status = "No credits";
        } else if (plan.creditsBalance <= 1) {
          status = "Low credits";
        }
      } else if (plan.type === "monthly") {
        if (plan.nextBillingDate) {
          const now = new Date();
          const diffDays = Math.ceil((plan.nextBillingDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
          if (diffDays < 0) {
            status = "Overdue";
          } else if (diffDays <= 3) {
            status = "Due soon";
          }
        }
      }
      
      if (status !== "Paid") {
        alerts.push({
          studentId: student.id,
          studentName: student.name,
          status,
          creditsBalance: plan.creditsBalance,
        });
      }
    })
  );
  
  // Sort alerts by severity
  const severityOrder: Record<BillingStatus, number> = {
    "No credits": 1,
    "Overdue": 2,
    "Low credits": 3,
    "Due soon": 4,
    "Paid": 5,
  };
  
  alerts.sort((a, b) => severityOrder[a.status] - severityOrder[b.status]);
  
  return alerts;
}
