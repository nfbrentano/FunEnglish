export type PickerHistoryEntry = {
  id: string;
  name: string;
  timestamp: number;
};

export const PICKER_CUSTOM_NAMES_STORAGE_KEY = "fun-english-picker-custom-names";
export const PICKER_NO_REPEAT_STORAGE_KEY = "fun-english-picker-no-repeat";
export const PICKER_PICKED_CYCLE_STORAGE_KEY = "fun-english-picker-picked-cycle";
export const PICKER_HISTORY_STORAGE_KEY = "fun-english-picker-history";

export type GroupMode = "count" | "size";

export type ClassroomPickerProps = {
  /** Students from active classroom session or class roster */
  students?: readonly string[];
  /** Whether class roster is actively provided */
  hasActiveSession?: boolean;
  className?: string;
};
