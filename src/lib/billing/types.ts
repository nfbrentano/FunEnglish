export type BillingPlanType = "package" | "monthly" | "pay_per_lesson";
export type PaymentMethod = "Pix" | "Transferência" | "Dinheiro" | "Cartão" | "Outro";

export interface BillingPlan {
  type: BillingPlanType;
  priceCents: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  creditsBalance: number;
  monthlyCredits?: number; // How many credits to add on renewal
  nextBillingDate?: Date; // For monthly/overdue logic
  updatedAt: Date;
}

export type LedgerEntryType = "lesson" | "adjustment" | "payment" | "renewal";

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  credits: number;
  amountCents?: number;
  method?: PaymentMethod;
  lessonId?: string;
  reason?: string;
  at: Date;
  createdBy: string;
}

export type BillingStatus = "Paid" | "Due soon" | "Overdue" | "Low credits" | "No credits";
