export type TrackStepSource = "manual" | "homework" | "class";

export interface TrackStepCompletion {
  at: string;
  source: TrackStepSource;
}

export interface LearningTrack {
  id: string;
  name: string;
  description?: string;
  level?: string;
  activityIds: string[];
  countClassActivities?: boolean;
  assignedStudentIds?: string[];
  assignedClassIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentTrackProgress {
  trackId: string;
  trackName: string;
  activityIds: string[];
  countClassActivities?: boolean;
  completed: Record<string, TrackStepCompletion>;
  assignedAt: Date;
  updatedAt?: Date;
}

export type TrackStepStatus = "completed" | "current" | "pending" | "unavailable";

export interface TrackStepView {
  activityId: string;
  order: number;
  status: TrackStepStatus;
  available: boolean;
  completion?: TrackStepCompletion;
}

export interface TrackCalculatedProgress {
  total: number;
  completedCount: number;
  percent: number;
  steps: TrackStepView[];
}

export const MAX_TRACK_NAME_LENGTH = 60;
export const MAX_TRACK_ACTIVITIES = 30;
export const MIN_TRACK_ACTIVITIES = 1;
