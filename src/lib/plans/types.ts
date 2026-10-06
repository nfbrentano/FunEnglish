export type PlanItemKind = "activity" | "block";

export interface PlanItem {
  kind: PlanItemKind;
  activityId?: string; // Used when kind === "activity"
  title: string;
  minutes: number;
}

export type PlanStatus = "draft" | "used";

export interface Plan {
  id: string;
  classId: string;
  title: string;
  goal?: string;
  scheduledFor?: Date;
  items: PlanItem[];
  words: string[];
  status: PlanStatus;
  sessionId?: string;
  updatedAt: Date;
}
