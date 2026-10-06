import { addDays, format, isAfter, isBefore, isEqual, parse, startOfDay } from "date-fns";
import { formatInTimeZone, toDate, toZonedTime, fromZonedTime } from "date-fns-tz";
import { Lesson, ScheduleRule, LessonStatus } from "./types";

interface ExpandScheduleOptions {
  rules: ScheduleRule[];
  exceptions: Lesson[]; // Existing lessons (done, no-show, cancelled, rescheduled) or extras
  rangeStart: Date;
  rangeEnd: Date;
  teacherTimeZone?: string; // e.g. "America/Sao_Paulo"
  studentMap: Record<string, string>; // studentId -> studentName
}

export function expandSchedule({
  rules,
  exceptions,
  rangeStart,
  rangeEnd,
  teacherTimeZone = "America/Sao_Paulo",
  studentMap,
}: ExpandScheduleOptions): Lesson[] {
  const occurrences: Lesson[] = [];
  const exceptionMap = new Map<string, Lesson>();

  for (const ex of exceptions) {
    // Usually exceptions have a ruleId + date in their ID, or they are just completely custom
    // If it's a modification of a rule occurrence, it should match `ruleId_yyyy-MM-dd`
    exceptionMap.set(ex.id, ex);
    
    // Add extra lessons that fall in the range
    if (ex.extra) {
      if (ex.start >= rangeStart && ex.start <= rangeEnd) {
        occurrences.push(ex);
      }
    } else {
      // If the exception itself falls in the range, or its originalStart falls in the range
      // For simplicity, we just add all non-extra exceptions that happen in this range
      if (ex.start >= rangeStart && ex.start <= rangeEnd) {
        occurrences.push(ex);
      }
    }
  }

  // Iterate over each day in the range
  // To avoid timezone issues where rangeStart is 23:00 UTC and it's the next day in Brazil,
  // we step day by day in the target timezone.
  
  let currentZoned = toZonedTime(rangeStart, teacherTimeZone);
  currentZoned = startOfDay(currentZoned);
  
  const endZoned = toZonedTime(rangeEnd, teacherTimeZone);

  while (currentZoned <= endZoned) {
    const weekday = currentZoned.getDay();
    const dateString = format(currentZoned, "yyyy-MM-dd");

    for (const rule of rules) {
      if (rule.weekday !== weekday) continue;

      // Check validFrom and validUntil using pure UTC comparisons
      const occurrenceStartUtc = fromZonedTime(
        `${dateString} ${rule.startTime}`,
        teacherTimeZone
      );

      if (occurrenceStartUtc < rangeStart || occurrenceStartUtc > rangeEnd) continue;

      if (rule.validFrom && occurrenceStartUtc < rule.validFrom) continue;
      if (rule.validUntil && occurrenceStartUtc > rule.validUntil) continue;

      const occurrenceId = `${rule.id}_${dateString}`;

      // If there's an exception for this exact occurrence, we skip adding the generated one
      // The exception is either already in occurrences (if its new time is within range)
      // or it was moved out of range (in which case we don't show it here).
      if (exceptionMap.has(occurrenceId)) continue;

      const studentName = studentMap[rule.studentId] || "Unknown Student";

      occurrences.push({
        id: occurrenceId,
        studentId: rule.studentId,
        studentName,
        ruleId: rule.id,
        start: occurrenceStartUtc,
        durationMin: rule.durationMin,
        mode: rule.mode,
        status: "scheduled",
        extra: false,
      });
    }

    currentZoned = addDays(currentZoned, 1);
  }

  // Sort chronologically
  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());

  return occurrences;
}
