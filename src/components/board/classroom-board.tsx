"use client";

import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  Download,
  Ellipsis,
  Eraser,
  Highlighter,
  LoaderCircle,
  Maximize2,
  Minimize2,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Send,
  Spline,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Popover } from "@/components/ui/popover";
import { renderBoardPageToCanvas } from "@/lib/board/board-persistence";
import { BOARD_INKS, BOARD_SURFACES, type BoardInk, type BoardSurface } from "@/lib/board/ink";
import {
  setDockPosition,
  setSurfacePreference,
  useBoardSurface,
  useDockPosition,
  useSurfacePreference,
} from "@/lib/board/preferences";
import type { BoardBackground, BoardPage } from "@/lib/board/types";
import { useWhiteboard, type UseWhiteboardOptions } from "@/lib/board/use-whiteboard";
import { strings } from "@/lib/strings";
import { BoardCanvas } from "./board-canvas";
import {
  BoardButton,
  Divider,
  Dock,
  DockDivider,
  DockPositionToggle,
  InkPicker,
  Island,
  MenuItem,
  SegmentedOptions,
  StyleSwatch,
  dockPopoverClasses,
} from "./board-ui";

export interface ClassroomBoardProps extends UseWhiteboardOptions {
  className?: string;
  /** Content for the top-left island, e.g. the /lousa back link, title and live controls. */
  leading?: ReactNode;
}

type Panel = "style" | "eraser" | "more" | "pages" | null;

const s = strings.whiteboard;
const icon = "size-4";

/**
 * Classroom whiteboard (SDD/2026-10-03_07-lousa-virtual.md), redesigned in
 * SDD/2026-10-06_redesign-ux-ui-lousa.md: full-bleed page with floating islands, a tool dock on
 * the left or top, style and options in popovers, and surfaces that follow the site theme.
 */
export function ClassroomBoard({
  className = "",
  sessionId = "classroom-whiteboard",
  initialPages,
  onSendWords,
  onBoardTextChange,
  leading,
}: ClassroomBoardProps) {
  const board = useWhiteboard({
    sessionId,
    initialPages,
    onSendWords,
    onBoardTextChange,
  });

  const {
    pages,
    currentPage,
    activeTool,
    activeColor,
    activePenWidthKey,
    eraserMode,
    selectedItemId,
    isSaving,
    isExpanded,
    errorMessage,
    currentPageIndex,
    totalPages,
    maxPages,
    canUndo,
    canRedo,
    setActiveTool,
    setActiveColor,
    setActivePenWidthKey,
    stepPenWidth,
    setEraserMode,
    toggleExpanded,
    clearErrorMessage,
    switchPage,
    addPage,
    deletePage,
    deleteItem,
    setBackground,
    undo,
    redo,
    clearCurrentPage,
    exportPng,
    getCandidateWords,
    sendWordsToStudents,
  } = board;

  const surface = useBoardSurface();
  const surfacePreference = useSurfacePreference();
  const dockPosition = useDockPosition();
  const rootRef = useRef<HTMLDivElement>(null);

  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const togglePanel = (panel: Exclude<Panel, null>) =>
    setOpenPanel((current) => (current === panel ? null : panel));
  const closePanel = () => setOpenPanel(null);

  // Dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeletePageConfirm, setShowDeletePageConfirm] = useState(false);
  const [showSendWordsModal, setShowSendWordsModal] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wordsNotice, setWordsNotice] = useState<string | null>(null);

  const candidateWords = getCandidateWords();

  const handleOpenSendWords = () => {
    closePanel();
    setSelectedWords(candidateWords);
    setShowSendWordsModal(true);
  };

  const handleConfirmSendWords = () => {
    if (selectedWords.length > 0) {
      sendWordsToStudents(selectedWords);
      setWordsNotice(s.sendWordsSuccess(selectedWords.length));
      setTimeout(() => setWordsNotice(null), 3000);
    }
    setShowSendWordsModal(false);
  };

  const toggleWordSelection = (word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  };

  /** Picking a color while erasing or selecting goes back to the pen (RF03). */
  const chooseColor = (ink: BoardInk) => {
    setActiveColor(ink);
    if (activeTool === "eraser" || activeTool === "select") setActiveTool("pen");
  };

  const handleEraserClick = () => {
    if (activeTool === "eraser") togglePanel("eraser");
    else {
      setActiveTool("eraser");
      closePanel();
    }
  };

  // Keyboard shortcuts (RF12). The latest handler lives in a ref so the listener is added once.
  const handleShortcut = (e: KeyboardEvent) => {
    const root = rootRef.current;
    const focused = document.activeElement;
    if (!root || e.defaultPrevented) return;
    if (focused && focused !== document.body && !root.contains(focused)) return;
    if (document.querySelector("dialog[open]")) return;
    if ((e.target as HTMLElement).closest?.("input, textarea, select, [contenteditable='true']")) {
      return;
    }

    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
      return;
    }
    if (e.altKey) return;

    if (e.key === "Escape") {
      if (openPanel) closePanel();
      else if (isExpanded) toggleExpanded();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
      e.preventDefault();
      deleteItem(selectedItemId);
      return;
    }

    const tools = { v: "select", p: "pen", h: "highlighter", t: "text" } as const;
    if (key in tools) {
      setActiveTool(tools[key as keyof typeof tools]);
    } else if (key === "e") {
      if (e.shiftKey) setEraserMode(eraserMode === "area" ? "object" : "area");
      setActiveTool("eraser");
    } else if (/^[1-6]$/.test(e.key)) {
      chooseColor(BOARD_INKS[Number(e.key) - 1]);
    } else if (e.key === "[" || e.key === "]") {
      stepPenWidth(e.key === "]" ? 1 : -1);
    } else {
      return;
    }
    closePanel();
  };
  const shortcutRef = useRef(handleShortcut);
  useEffect(() => {
    shortcutRef.current = handleShortcut;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => shortcutRef.current(e);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const focusMoreButton = () =>
    rootRef.current?.querySelector<HTMLElement>(`[aria-label="${s.more}"]`);

  const tooltip = dockPosition;
  const besideDock = dockPopoverClasses(dockPosition);

  return (
    <div
      ref={rootRef}
      data-board-surface={surface}
      className={`@container isolate overflow-hidden rounded-2xl border border-border-subtle bg-secondary text-fg transition-colors duration-300 ${
        // Only one position utility at a time: with both, "relative" wins and the board collapses.
        isExpanded
          ? "fixed inset-2 z-50 shadow-2xl md:inset-6"
          : `relative h-155 w-full ${className}`
      }`}
    >
      <BoardCanvas board={board} surface={surface} />

      {/* Top-left: page context and save status (RF10, RF13) */}
      <div className="pointer-events-none absolute top-3 left-3 z-30 flex max-w-[calc(100%-13rem)] items-center gap-2">
        {leading}
        <span
          role="status"
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-elevated/90 px-2.5 text-xs text-muted shadow-sm backdrop-blur-md"
        >
          {isSaving ? (
            <LoaderCircle aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <CloudCheck aria-hidden="true" className="size-3.5 text-success" />
          )}
          <span className="sr-only @4xl:not-sr-only">{isSaving ? s.saving : s.saved}</span>
        </span>
      </div>

      {/* Top-right: history, options, expand */}
      <Island className="absolute top-3 right-3 z-30">
        <BoardButton
          label={s.undo}
          shortcut="⌘Z"
          icon={<Undo2 aria-hidden="true" className={icon} />}
          onClick={undo}
          disabled={!canUndo}
        />
        <BoardButton
          label={s.redo}
          shortcut="⇧⌘Z"
          icon={<Redo2 aria-hidden="true" className={icon} />}
          onClick={redo}
          disabled={!canRedo}
        />
        <Divider vertical />
        {candidateWords.length > 0 && (
          <button
            type="button"
            onClick={handleOpenSendWords}
            aria-label={s.sendWords}
            className="hidden h-9 items-center gap-1.5 rounded-xl bg-accent-muted px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-accent @4xl:flex pointer-coarse:h-11"
          >
            <Send aria-hidden="true" className="size-3.5" />
            {s.sendWords}
          </button>
        )}
        <div className="relative">
          <BoardButton
            label={s.more}
            icon={<Ellipsis aria-hidden="true" className={icon} />}
            onClick={() => togglePanel("more")}
            active={openPanel === "more"}
            expanded={openPanel === "more"}
          />
          <Popover
            open={openPanel === "more"}
            onClose={closePanel}
            label={s.more}
            className="top-full right-0 mt-3 w-72 space-y-1"
          >
            <SegmentedOptions<BoardBackground>
              label={s.background}
              value={currentPage.background}
              onChange={setBackground}
              options={[
                { value: "white", label: s.backgroundWhite },
                { value: "grid", label: s.backgroundGrid },
                { value: "lines", label: s.backgroundLines },
              ]}
            />
            <SegmentedOptions
              label={s.surface}
              value={surfacePreference}
              onChange={setSurfacePreference}
              options={[
                { value: "auto", label: s.surfaceAuto },
                { value: "light", label: s.surfaceLight, preview: <SurfaceDot surface="light" /> },
                { value: "dark", label: s.surfaceDark, preview: <SurfaceDot surface="dark" /> },
              ]}
            />
            <SegmentedOptions
              label={s.toolbarPosition}
              value={dockPosition}
              onChange={setDockPosition}
              options={[
                { value: "left", label: s.toolbarLeft },
                { value: "top", label: s.toolbarTop },
              ]}
            />
            <div className="my-1 h-px bg-border-subtle" />
            <MenuItem
              icon={<Download aria-hidden="true" className={icon} />}
              label={s.exportPng}
              onClick={() => {
                closePanel();
                void exportPng(surface);
              }}
            />
            <MenuItem
              icon={<Send aria-hidden="true" className={icon} />}
              label={s.sendWords}
              onClick={handleOpenSendWords}
            />
            <MenuItem
              danger
              icon={<Trash2 aria-hidden="true" className={icon} />}
              label={s.clear}
              onClick={() => {
                closePanel();
                setShowClearConfirm(true);
              }}
            />
          </Popover>
        </div>
        <BoardButton
          label={isExpanded ? s.collapseBoard : s.expandBoard}
          icon={
            isExpanded ? (
              <Minimize2 aria-hidden="true" className={icon} />
            ) : (
              <Maximize2 aria-hidden="true" className={icon} />
            )
          }
          onClick={toggleExpanded}
        />
      </Island>

      {/* Tool dock: left (default) or top (RF01, RF02, RF17) */}
      <Dock position={dockPosition} label={s.tools}>
        <BoardButton
          label={s.select}
          shortcut="V"
          tooltip={tooltip}
          icon={<MousePointer2 aria-hidden="true" className={icon} />}
          onClick={() => setActiveTool("select")}
          active={activeTool === "select"}
          pressed={activeTool === "select"}
        />
        <BoardButton
          label={s.pen}
          shortcut="P"
          tooltip={tooltip}
          icon={<Pencil aria-hidden="true" className={icon} />}
          onClick={() => setActiveTool("pen")}
          active={activeTool === "pen"}
          pressed={activeTool === "pen"}
        />
        <BoardButton
          label={s.highlighter}
          shortcut="H"
          tooltip={tooltip}
          icon={<Highlighter aria-hidden="true" className={icon} />}
          onClick={() => setActiveTool("highlighter")}
          active={activeTool === "highlighter"}
          pressed={activeTool === "highlighter"}
        />
        <div className="relative">
          <BoardButton
            label={s.eraser}
            shortcut="E"
            tooltip={tooltip}
            icon={
              eraserMode === "area" ? (
                <Eraser aria-hidden="true" className={icon} />
              ) : (
                <Spline aria-hidden="true" className={icon} />
              )
            }
            onClick={handleEraserClick}
            active={activeTool === "eraser"}
            pressed={activeTool === "eraser"}
            expanded={openPanel === "eraser"}
          />
          <Popover
            open={openPanel === "eraser"}
            onClose={closePanel}
            label={s.eraserModes}
            className={`w-56 ${besideDock}`}
          >
            <div role="radiogroup" aria-label={s.eraserModes} className="space-y-0.5">
              {(
                [
                  ["area", s.eraseArea, <Eraser key="a" aria-hidden="true" className={icon} />],
                  [
                    "object",
                    s.eraseObjects,
                    <Spline key="o" aria-hidden="true" className={icon} />,
                  ],
                ] as const
              ).map(([mode, label, modeIcon]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={eraserMode === mode}
                  onClick={() => {
                    setEraserMode(mode);
                    closePanel();
                  }}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11 ${
                    eraserMode === mode
                      ? "bg-accent-muted text-fg"
                      : "text-fg-secondary hover:bg-accent-muted hover:text-fg"
                  }`}
                >
                  {modeIcon}
                  <span className="flex-1">{label}</span>
                  {eraserMode === mode && (
                    <Check aria-hidden="true" className="size-4 text-accent" />
                  )}
                </button>
              ))}
            </div>
            <p className="px-3 pt-1.5 pb-1 text-[11px] text-muted">⇧E</p>
          </Popover>
        </div>
        <BoardButton
          label={s.text}
          shortcut="T"
          tooltip={tooltip}
          icon={<Type aria-hidden="true" className={icon} />}
          onClick={() => setActiveTool("text")}
          active={activeTool === "text"}
          pressed={activeTool === "text"}
        />
        <DockDivider position={dockPosition} />
        <div className="relative">
          <BoardButton
            label={s.style}
            tooltip={tooltip}
            icon={
              <StyleSwatch color={activeColor} widthKey={activePenWidthKey} surface={surface} />
            }
            onClick={() => togglePanel("style")}
            active={false}
            expanded={openPanel === "style"}
            className={openPanel === "style" ? "bg-accent-muted" : ""}
          />
          <Popover
            open={openPanel === "style"}
            onClose={closePanel}
            label={s.style}
            className={`w-64 ${besideDock}`}
          >
            <InkPicker
              surface={surface}
              color={activeColor}
              onColor={chooseColor}
              widthKey={activePenWidthKey}
              onWidth={setActivePenWidthKey}
            />
          </Popover>
        </div>
        <span className="hidden @3xl:contents">
          <DockDivider position={dockPosition} />
        </span>
        <DockPositionToggle position={dockPosition} />
      </Dock>

      {/* Bottom-right: pages (RF08) */}
      <Island className="absolute right-3 bottom-3 z-30">
        <BoardButton
          label={s.prevPage}
          tooltip="above"
          icon={<ChevronLeft aria-hidden="true" className={icon} />}
          onClick={() => switchPage(currentPageIndex - 1)}
          disabled={currentPageIndex === 0}
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePanel("pages")}
            aria-label={s.pageOf(currentPageIndex + 1, totalPages)}
            aria-expanded={openPanel === "pages"}
            className="flex h-9 min-w-14 items-center justify-center rounded-xl px-2 text-xs font-semibold text-fg tabular-nums transition-colors hover:bg-accent-muted focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:h-11"
          >
            {currentPageIndex + 1} / {totalPages}
          </button>
          <Popover
            open={openPanel === "pages"}
            onClose={closePanel}
            label={s.pages}
            className="right-0 bottom-full mb-3 w-[min(22rem,calc(100cqw-1.5rem))]"
          >
            <div className="grid grid-cols-2 gap-2 p-1">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => {
                    switchPage(index);
                    closePanel();
                  }}
                  aria-label={s.goToPage(index + 1)}
                  aria-current={index === currentPageIndex ? "page" : undefined}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    index === currentPageIndex
                      ? "border-accent"
                      : "border-border-subtle hover:border-border-strong"
                  }`}
                >
                  <PageThumb page={page} surface={surface} />
                  <span className="absolute bottom-1 left-1 rounded-md bg-elevated/90 px-1.5 text-[10px] font-semibold text-fg">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <>
                <div className="my-1 h-px bg-border-subtle" />
                <MenuItem
                  danger
                  icon={<Trash2 aria-hidden="true" className={icon} />}
                  label={s.deletePage}
                  onClick={() => {
                    closePanel();
                    setShowDeletePageConfirm(true);
                  }}
                />
              </>
            )}
          </Popover>
        </div>
        <BoardButton
          label={s.nextPage}
          tooltip="above"
          icon={<ChevronRight aria-hidden="true" className={icon} />}
          onClick={() => switchPage(currentPageIndex + 1)}
          disabled={currentPageIndex >= totalPages - 1}
        />
        {totalPages < maxPages && (
          <>
            <Divider vertical />
            <BoardButton
              label={s.addPage}
              tooltip="above"
              icon={<Plus aria-hidden="true" className={icon} />}
              onClick={addPage}
            />
          </>
        )}
      </Island>

      {/* Floating notices: they never push the page around (RF09) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-40 flex flex-col items-center gap-2 px-4">
        {errorMessage && (
          <div
            role="alert"
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-error/40 bg-elevated py-1.5 pr-1.5 pl-4 text-sm font-medium text-error shadow-lg"
          >
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={clearErrorMessage}
              aria-label={s.dismissError}
              className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-accent-muted hover:text-fg"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
        {wordsNotice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-full border border-border-strong bg-elevated px-4 py-2 text-sm font-medium text-fg shadow-lg"
          >
            <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
            <span>{wordsNotice}</span>
          </div>
        )}
      </div>

      <Dialog
        returnFocus={focusMoreButton}
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title={s.clear}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>
              {s.cancel}
            </Button>
            <Button
              variant="secondary"
              className="border-error text-error hover:border-error hover:bg-error/10 hover:text-error"
              onClick={() => {
                clearCurrentPage();
                setShowClearConfirm(false);
              }}
            >
              {s.clearConfirmButton}
            </Button>
          </>
        }
      >
        <p>{s.clearConfirm}</p>
      </Dialog>

      <Dialog
        returnFocus={focusMoreButton}
        open={showDeletePageConfirm}
        onClose={() => setShowDeletePageConfirm(false)}
        title={s.deletePage}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeletePageConfirm(false)}>
              {s.cancel}
            </Button>
            <Button
              variant="secondary"
              className="border-error text-error hover:border-error hover:bg-error/10 hover:text-error"
              onClick={() => {
                deletePage();
                setShowDeletePageConfirm(false);
              }}
            >
              {s.deletePage}
            </Button>
          </>
        }
      >
        <p>{s.deletePageConfirm}</p>
      </Dialog>

      <Dialog
        returnFocus={focusMoreButton}
        open={showSendWordsModal}
        onClose={() => setShowSendWordsModal(false)}
        title={s.sendWords}
        icon={<Send aria-hidden="true" className="size-5 text-accent" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSendWordsModal(false)}>
              {s.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={selectedWords.length === 0}
              onClick={handleConfirmSendWords}
            >
              {s.sendWordsConfirm} ({selectedWords.length})
            </Button>
          </>
        }
      >
        <p className="mb-3">{s.sendWordsDesc}</p>
        {candidateWords.length === 0 ? (
          <div className="rounded-xl bg-secondary p-6 text-center text-muted">{s.noWordsFound}</div>
        ) : (
          <div className="max-h-60 space-y-0.5 overflow-y-auto rounded-xl border border-border-subtle bg-secondary p-1.5">
            {candidateWords.map((word) => (
              <label
                key={word}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-fg select-none hover:bg-accent-muted"
              >
                <input
                  type="checkbox"
                  checked={selectedWords.includes(word)}
                  onChange={() => toggleWordSelection(word)}
                  className="size-4 accent-accent"
                />
                <span className="font-medium">{word}</span>
              </label>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function SurfaceDot({ surface }: { surface: BoardSurface }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: BOARD_SURFACES[surface].background }}
      className="size-3 rounded-full border border-border-strong"
    />
  );
}

/** Small preview of a page for the page picker (RF08). */
function PageThumb({ page, surface }: { page: BoardPage; surface: BoardSurface }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    void renderBoardPageToCanvas(ctx, page, canvas.width, canvas.height, {
      scale: canvas.width / 1280,
      surface,
    });
  }, [page, surface]);

  return (
    <canvas
      ref={ref}
      width={320}
      height={180}
      aria-hidden="true"
      style={{ backgroundColor: BOARD_SURFACES[surface].background }}
      className="block aspect-video w-full"
    />
  );
}
