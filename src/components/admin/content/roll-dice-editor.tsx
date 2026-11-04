"use client";

import { asArray, asObject, TextField, type Json } from "./fields";
import type { Path } from "./form-context";

export function RollDiceEditor({
  value,
  onChange,
  path,
}: {
  value: unknown;
  onChange: (value: Json) => void;
  path: Path;
}) {
  const content = asObject(value);
  const grid = asArray<Json>(content.grid);

  return (
    <div className="space-y-6">
      <TextField
        label="Instructions"
        value={String(content.instructions ?? "")}
        onChange={(instructions) => onChange({ ...content, instructions })}
        path={[...path, "instructions"]}
        hint="Optional guidance shown above the board"
      />
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">6x6 Board Questions ({grid.length} of 36)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((row) =>
            [1, 2, 3, 4, 5, 6].map((col) => {
              const index = grid.findIndex((item) => {
                const obj = asObject(item);
                return obj.row === row && obj.col === col;
              });
              const current = index >= 0 ? asObject(grid[index]) : { row, col, question: "" };
              return (
                <div key={`${row}-${col}`} className="border rounded-xl p-3 bg-card space-y-2">
                  <div className="font-mono text-xs text-muted font-bold">
                    Row {row}, Col {col}
                  </div>
                  <input
                    type="text"
                    value={String(current.question ?? "")}
                    placeholder={`Question for (${row}, ${col})...`}
                    onChange={(e) => {
                      const updated = { ...current, row, col, question: e.target.value };
                      const nextGrid = [...grid];
                      if (index >= 0) {
                        nextGrid[index] = updated;
                      } else {
                        nextGrid.push(updated);
                      }
                      onChange({ ...content, grid: nextGrid });
                    }}
                    className="w-full text-xs rounded border p-1.5 bg-background text-foreground"
                  />
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
