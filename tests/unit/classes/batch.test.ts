import { describe, expect, it } from "vitest";
import { parseStudentBatch } from "@/lib/classes/batch";

describe("parseStudentBatch (RF03, CA02, CT02)", () => {
  it("returns empty array for empty or whitespace-only string", () => {
    expect(parseStudentBatch("").names).toEqual([]);
    expect(parseStudentBatch("   \n\n  \t  ").names).toEqual([]);
  });

  it("trims whitespace and ignores blank lines (CA02, CT02)", () => {
    const raw = `
      Ana Silva   
      
      Lucas Costa
         
      Marina Rocha
    `;
    const result = parseStudentBatch(raw);
    expect(result.error).toBeUndefined();
    expect(result.names).toEqual(["Ana Silva", "Lucas Costa", "Marina Rocha"]);
  });

  it("normalizes internal consecutive spaces", () => {
    const raw = "John    Paul    Smith";
    const result = parseStudentBatch(raw);
    expect(result.names).toEqual(["John Paul Smith"]);
  });

  it("successfully parses 10 names pasted together (CA02)", () => {
    const names = [
      "Alice Brown",
      "Bob Davis",
      "Charlie Evans",
      "Diana Frank",
      "Ethan Green",
      "Fiona Hill",
      "George King",
      "Hannah Lee",
      "Ian Miller",
      "Julia Nelson",
    ];
    const raw = names.join("\n\n");
    const result = parseStudentBatch(raw);
    expect(result.error).toBeUndefined();
    expect(result.names).toHaveLength(10);
    expect(result.names).toEqual(names);
  });

  it("returns an error if batch exceeds the limit of 40 students", () => {
    const names = Array.from({ length: 41 }, (_, i) => `Student ${i + 1}`);
    const result = parseStudentBatch(names.join("\n"));
    expect(result.names).toEqual([]);
    expect(result.error).toMatch(/Cannot add more than 40 students/);
  });

  it("returns an error if a name exceeds 100 characters", () => {
    const longName = "A".repeat(101);
    const result = parseStudentBatch(`Valid Name\n${longName}`);
    expect(result.names).toEqual([]);
    expect(result.error).toMatch(/exceeds maximum of 100 characters/);
  });
});
