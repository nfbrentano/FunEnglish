"use client";

import {
  Keyboard,
  Paintbrush,
  Palette,
  Sparkles,
  Type,
  Undo2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { strings } from "@/lib/strings";

interface BoardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  returnFocus?: () => HTMLElement | null | undefined;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-md border border-border-strong bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-semibold text-fg shadow-xs">
      {children}
    </kbd>
  );
}

function ShortcutRow({
  label,
  keys,
}: {
  label: string;
  keys: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-fg-secondary">{label}</span>
      <div className="flex items-center gap-1 shrink-0">{keys}</div>
    </div>
  );
}

export function BoardShortcutsDialog({
  open,
  onClose,
  returnFocus,
}: BoardShortcutsDialogProps) {
  const [isMac, setIsMac] = useState(false);
  const s = strings.whiteboard;

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent));
  }, []);

  const mod = isMac ? "⌘" : "Ctrl";
  const shift = isMac ? "⇧" : "Shift";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title={s.shortcutsTitle}
      icon={<Keyboard aria-hidden="true" className="size-5 text-accent" />}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-fg-secondary">{s.shortcutsSubtitle}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Text & Typography */}
          <div className="rounded-xl border border-border-subtle bg-secondary/40 p-3 space-y-1">
            <div className="flex items-center gap-2 pb-1 font-semibold text-xs tracking-wider uppercase text-fg">
              <Type aria-hidden="true" className="size-3.5 text-accent" />
              <span>{s.shortcutCategories.text}</span>
            </div>
            <div className="divide-y divide-border-subtle/40">
              <ShortcutRow
                label={s.shortcutsItems.fontLarger}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>{shift}</Kbd>
                    <span>+</span>
                    <Kbd>&gt;</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.fontSmaller}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>{shift}</Kbd>
                    <span>+</span>
                    <Kbd>&lt;</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.bold}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>B</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.presetSizes}
                keys={<span className="text-[11px] font-semibold text-fg">S · M · L · XL</span>}
              />
              <ShortcutRow
                label={s.shortcutsItems.textColor}
                keys={<span className="text-[11px] font-semibold text-fg">6 colors</span>}
              />
            </div>
          </div>

          {/* Tools */}
          <div className="rounded-xl border border-border-subtle bg-secondary/40 p-3 space-y-1">
            <div className="flex items-center gap-2 pb-1 font-semibold text-xs tracking-wider uppercase text-fg">
              <Paintbrush aria-hidden="true" className="size-3.5 text-accent" />
              <span>{s.shortcutCategories.tools}</span>
            </div>
            <div className="divide-y divide-border-subtle/40">
              <ShortcutRow label={s.shortcutsItems.select} keys={<Kbd>V</Kbd>} />
              <ShortcutRow label={s.shortcutsItems.pen} keys={<Kbd>P</Kbd>} />
              <ShortcutRow label={s.shortcutsItems.highlighter} keys={<Kbd>H</Kbd>} />
              <ShortcutRow label={s.shortcutsItems.eraser} keys={<Kbd>E</Kbd>} />
              <ShortcutRow
                label={s.shortcutsItems.toggleEraserMode}
                keys={
                  <>
                    <Kbd>{shift}</Kbd>
                    <span>+</span>
                    <Kbd>E</Kbd>
                  </>
                }
              />
              <ShortcutRow label={s.shortcutsItems.text} keys={<Kbd>T</Kbd>} />
              <ShortcutRow label={s.shortcutsItems.laser} keys={<Kbd>L</Kbd>} />
              <ShortcutRow label="Shape" keys={<Kbd>S</Kbd>} />
              <ShortcutRow label="Reveal Curtain" keys={<Kbd>C</Kbd>} />
            </div>
          </div>

          {/* Colors & Stroke */}
          <div className="rounded-xl border border-border-subtle bg-secondary/40 p-3 space-y-1">
            <div className="flex items-center gap-2 pb-1 font-semibold text-xs tracking-wider uppercase text-fg">
              <Palette aria-hidden="true" className="size-3.5 text-accent" />
              <span>{s.shortcutCategories.brush}</span>
            </div>
            <div className="divide-y divide-border-subtle/40">
              <ShortcutRow
                label={s.shortcutsItems.paletteColors}
                keys={
                  <>
                    <Kbd>1</Kbd>
                    <span>…</span>
                    <Kbd>6</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.strokeThinner}
                keys={<Kbd>[</Kbd>}
              />
              <ShortcutRow
                label={s.shortcutsItems.strokeThicker}
                keys={<Kbd>]</Kbd>}
              />
            </div>
          </div>

          {/* Editing & History */}
          <div className="rounded-xl border border-border-subtle bg-secondary/40 p-3 space-y-1">
            <div className="flex items-center gap-2 pb-1 font-semibold text-xs tracking-wider uppercase text-fg">
              <Undo2 aria-hidden="true" className="size-3.5 text-accent" />
              <span>{s.shortcutCategories.general}</span>
            </div>
            <div className="divide-y divide-border-subtle/40">
              <ShortcutRow
                label={s.shortcutsItems.undo}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>Z</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.redo}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>{shift}</Kbd>
                    <span>+</span>
                    <Kbd>Z</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.copy}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>C</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.paste}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>V</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.duplicate}
                keys={
                  <>
                    <Kbd>{mod}</Kbd>
                    <span>+</span>
                    <Kbd>D</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.delete}
                keys={
                  <>
                    <Kbd>Backspace</Kbd>
                    <span>/</span>
                    <Kbd>Del</Kbd>
                  </>
                }
              />
              <ShortcutRow
                label={s.shortcutsItems.escape}
                keys={<Kbd>Esc</Kbd>}
              />
              <ShortcutRow
                label={s.shortcutsItems.shortcutsHelp}
                keys={<Kbd>?</Kbd>}
              />
            </div>
          </div>
        </div>

        {/* Tip banner */}
        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent-muted/40 px-3 py-2.5 text-xs text-fg">
          <Sparkles aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <span>{s.shortcutsTip}</span>
        </div>
      </div>
    </Dialog>
  );
}
