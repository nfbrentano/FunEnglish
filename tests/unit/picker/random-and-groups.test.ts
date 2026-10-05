import { describe, expect, it } from "vitest";
import {
  pickRandom,
  shuffleArray,
} from "@/lib/picker/crypto-random";
import {
  createBalancedGroups,
  createGroupsBySize,
  formatGroupsAsText,
} from "@/lib/picker/group-maker";

describe("Crypto Random & Group Maker (SDD/2026-10-03_06-sorteador-de-alunos-e-grupos.md)", () => {
  // CT07 / CA07 (estatístico): Dado 4 nomes e "Don't repeat" desligado,
  // quando sorteio 4.000 vezes em teste automatizado,
  // então cada nome sai entre 900 e 1.100 vezes.
  it("CT07 / CA07: statistical distribution of 4,000 picks is uniform within [900, 1100]", () => {
    const names = ["Alice", "Bob", "Charlie", "David"];
    const counts: Record<string, number> = {
      Alice: 0,
      Bob: 0,
      Charlie: 0,
      David: 0,
    };

    const TOTAL_PICKS = 4000;
    for (let i = 0; i < TOTAL_PICKS; i++) {
      const result = pickRandom(names);
      expect(result).not.toBeNull();
      counts[result!.item]++;
    }

    // Expected value = 1000 per name; tolerance ±100 (900 to 1100)
    for (const name of names) {
      expect(counts[name]).toBeGreaterThanOrEqual(900);
      expect(counts[name]).toBeLessThanOrEqual(1100);
    }
  });

  // Fisher-Yates shuffle properties
  it("shuffleArray preserves all elements without mutation", () => {
    const original = ["A", "B", "C", "D", "E"];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.slice().sort()).toEqual(original.slice().sort());
    // Original array must not be mutated
    expect(original).toEqual(["A", "B", "C", "D", "E"]);
  });

  // CT04 / CA04: Grupos equilibrados
  // Dado 10 presentes, quando peço "3 groups", então vejo 3 grupos de 4, 3 e 3, sem aluno repetido nem faltando
  it("CT04 / CA04: divides 10 students into 3 groups of sizes 4, 3, and 3", () => {
    const students = [
      "Student 1",
      "Student 2",
      "Student 3",
      "Student 4",
      "Student 5",
      "Student 6",
      "Student 7",
      "Student 8",
      "Student 9",
      "Student 10",
    ];

    const groups = createBalancedGroups(students, 3);
    expect(groups).toHaveLength(3);

    const sizes = groups.map((g) => g.length);
    expect(sizes).toEqual([4, 3, 3]);

    // Check complete partition without duplicates
    const allMembers = groups.flat();
    expect(allMembers).toHaveLength(10);
    expect(new Set(allMembers).size).toBe(10);
  });

  // Property-based check for balanced groups: |max - min| <= 1 for all n in [2, 40] and g groups
  it("CT04 (property): balanced group division satisfies |Δ| ≤ 1 for n ∈ [2, 40] and any valid group count", () => {
    for (let n = 2; n <= 40; n++) {
      const students = Array.from({ length: n }, (_, i) => `Student ${i + 1}`);
      for (let g = 1; g <= n; g++) {
        const groups = createBalancedGroups(students, g);
        expect(groups).toHaveLength(g);

        const sizes = groups.map((grp) => grp.length);
        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);

        // Difference must be at most 1
        expect(maxSize - minSize).toBeLessThanOrEqual(1);

        // Partition is exact and complete
        const flat = groups.flat();
        expect(flat).toHaveLength(n);
        expect(new Set(flat).size).toBe(n);
      }
    }
  });

  // createGroupsBySize
  it("createGroupsBySize creates balanced groups targeting student count per group", () => {
    const students = Array.from({ length: 12 }, (_, i) => `Student ${i + 1}`);
    const groups = createGroupsBySize(students, 4);

    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.length).toBe(4);
    }
  });

  // formatGroupsAsText
  it("formatGroupsAsText produces clean plain text output for clipboard", () => {
    const groups = [
      ["Alice", "Bob"],
      ["Charlie", "David"],
    ];
    const text = formatGroupsAsText(groups);

    expect(text).toContain("Group 1 (2):");
    expect(text).toContain("- Alice");
    expect(text).toContain("- Bob");
    expect(text).toContain("Group 2 (2):");
    expect(text).toContain("- Charlie");
    expect(text).toContain("- David");
  });

  // CT09 / CA09 validation for groups > students
  it("CT09 / CA09: throws error when asking for more groups than students", () => {
    const students = ["Ana", "Bruno"];
    expect(() => createBalancedGroups(students, 3)).toThrow(
      "Not enough students for 3 groups"
    );
  });
});
