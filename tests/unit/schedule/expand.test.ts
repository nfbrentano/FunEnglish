import { describe, expect, it } from "vitest";
import { expandSchedule } from "../../../src/lib/schedule/expand";
import { ScheduleRule, Lesson } from "../../../src/lib/schedule/types";
import { parseISO } from "date-fns";

describe("expandSchedule", () => {
  it("expands a simple weekly rule over two weeks", () => {
    const rules: ScheduleRule[] = [
      {
        id: "rule1",
        studentId: "s1",
        weekday: 2, // Tuesday
        startTime: "19:00",
        durationMin: 60,
        mode: "online",
      },
    ];

    const rangeStart = parseISO("2026-10-05T00:00:00Z"); // Monday
    const rangeEnd = parseISO("2026-10-18T23:59:59Z"); // Sunday two weeks later

    const occurrences = expandSchedule({
      rules,
      exceptions: [],
      rangeStart,
      rangeEnd,
      teacherTimeZone: "America/Sao_Paulo",
      studentMap: { s1: "Ana" },
    });

    expect(occurrences.length).toBe(2);
    expect(occurrences[0].studentName).toBe("Ana");
    expect(occurrences[0].id).toBe("rule1_2026-10-06");
    expect(occurrences[0].start.toISOString()).toBe(
      "2026-10-06T22:00:00.000Z" // 19:00 BRT -> 22:00 UTC
    );
    expect(occurrences[1].id).toBe("rule1_2026-10-13");
  });

  it("handles validFrom and validUntil correctly", () => {
    const rules: ScheduleRule[] = [
      {
        id: "rule1",
        studentId: "s1",
        weekday: 4, // Thursday
        startTime: "10:00",
        durationMin: 60,
        mode: "online",
        validUntil: parseISO("2026-10-14T23:59:59Z"),
      },
    ];

    const rangeStart = parseISO("2026-10-01T00:00:00Z");
    const rangeEnd = parseISO("2026-10-31T23:59:59Z");

    const occurrences = expandSchedule({
      rules,
      exceptions: [],
      rangeStart,
      rangeEnd,
      teacherTimeZone: "America/Sao_Paulo",
      studentMap: { s1: "Ana" },
    });

    // Thursdays in Oct 2026: 1, 8, 15, 22, 29
    // validUntil is Oct 14, so only 1 and 8 should be generated
    expect(occurrences.length).toBe(2);
    expect(occurrences[0].id).toBe("rule1_2026-10-01");
    expect(occurrences[1].id).toBe("rule1_2026-10-08");
  });

  it("skips occurrences that have an exception and includes the exception", () => {
    const rules: ScheduleRule[] = [
      {
        id: "rule1",
        studentId: "s1",
        weekday: 2, // Tuesday
        startTime: "19:00",
        durationMin: 60,
        mode: "online",
      },
    ];

    const rangeStart = parseISO("2026-10-05T00:00:00Z"); 
    const rangeEnd = parseISO("2026-10-18T23:59:59Z"); 

    const exceptions: Lesson[] = [
      {
        id: "rule1_2026-10-06", // The first occurrence
        studentId: "s1",
        studentName: "Ana",
        ruleId: "rule1",
        originalStart: parseISO("2026-10-06T22:00:00.000Z"),
        start: parseISO("2026-10-07T21:00:00.000Z"), // Rescheduled to Wed 18:00
        durationMin: 60,
        mode: "online",
        status: "scheduled",
        extra: false,
      },
    ];

    const occurrences = expandSchedule({
      rules,
      exceptions,
      rangeStart,
      rangeEnd,
      teacherTimeZone: "America/Sao_Paulo",
      studentMap: { s1: "Ana" },
    });

    expect(occurrences.length).toBe(2);
    // The rescheduled exception
    expect(occurrences[0].id).toBe("rule1_2026-10-06");
    expect(occurrences[0].start.toISOString()).toBe("2026-10-07T21:00:00.000Z");
    
    // The second normal occurrence
    expect(occurrences[1].id).toBe("rule1_2026-10-13");
  });
});
