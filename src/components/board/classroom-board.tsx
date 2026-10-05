"use client";

import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  Grid,
  Highlighter,
  Maximize2,
  Minimize2,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Send,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BOARD_COLORS,
  BOARD_PEN_WIDTHS,
  type BoardPenWidthKey,
} from "@/lib/board/types";
import { useWhiteboard, type UseWhiteboardOptions } from "@/lib/board/use-whiteboard";
import { strings } from "@/lib/strings";
import { BoardCanvas } from "./board-canvas";

export interface ClassroomBoardProps extends UseWhiteboardOptions {
  className?: string;
}

export function ClassroomBoard({
  className = "",
  sessionId = "classroom-whiteboard",
  initialPages,
  onSendWords,
  onBoardTextChange,
}: ClassroomBoardProps) {
  const board = useWhiteboard({
    sessionId,
    initialPages,
    onSendWords,
    onBoardTextChange,
  });

  const {
    activeTool,
    activeColor,
    activePenWidthKey,
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
    toggleExpanded,
    clearErrorMessage,
    switchPage,
    addPage,
    deletePage,
    setBackground,
    undo,
    redo,
    clearCurrentPage,
    exportPng,
    getCandidateWords,
    sendWordsToStudents,
  } = board;

  const s = strings.whiteboard;

  // Dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeletePageConfirm, setShowDeletePageConfirm] = useState(false);
  const [showSendWordsModal, setShowSendWordsModal] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wordsNotice, setWordsNotice] = useState<string | null>(null);

  // When opening Send Words modal, extract candidate terms from text boxes
  const handleOpenSendWords = () => {
    const candidates = getCandidateWords();
    setSelectedWords(candidates);
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

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showClearConfirm) setShowClearConfirm(false);
        if (showDeletePageConfirm) setShowDeletePageConfirm(false);
        if (showSendWordsModal) setShowSendWordsModal(false);
        if (isExpanded) toggleExpanded();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showClearConfirm, showDeletePageConfirm, showSendWordsModal, isExpanded, toggleExpanded]);

  return (
    <div
      className={`flex flex-col bg-surface border border-border rounded-2xl shadow-sm overflow-hidden transition-all ${
        isExpanded
          ? "fixed inset-2 md:inset-6 z-50 shadow-2xl bg-surface/98 backdrop-blur"
          : "w-full h-[620px]"
      } ${className}`}
    >
      {/* Top Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-surface-raised border-b border-border text-sm">
        {/* Tool Selector */}
        <div className="flex items-center gap-1">
          <ToolButton
            active={activeTool === "pen"}
            onClick={() => setActiveTool("pen")}
            ariaLabel={s.pen}
            title={s.pen}
            icon={<Pencil className="w-4 h-4" />}
          />
          <ToolButton
            active={activeTool === "highlighter"}
            onClick={() => setActiveTool("highlighter")}
            ariaLabel={s.highlighter}
            title={s.highlighter}
            icon={<Highlighter className="w-4 h-4" />}
          />
          <ToolButton
            active={activeTool === "eraser"}
            onClick={() => setActiveTool("eraser")}
            ariaLabel={s.eraser}
            title={s.eraser}
            icon={<Eraser className="w-4 h-4" />}
          />
          <ToolButton
            active={activeTool === "text"}
            onClick={() => setActiveTool("text")}
            ariaLabel={s.text}
            title={s.text}
            icon={<Type className="w-4 h-4" />}
          />
          <ToolButton
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
            ariaLabel={s.select}
            title={s.select}
            icon={<MousePointer2 className="w-4 h-4" />}
          />

          <div className="h-5 w-px bg-border mx-1" />

          {/* Pen Width options (3 thicknesses) */}
          {(["thin", "medium", "thick"] as BoardPenWidthKey[]).map((key) => {
            const widthPx = BOARD_PEN_WIDTHS[key];
            const isCurrent = activePenWidthKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActivePenWidthKey(key)}
                aria-label={`${s[key]} width`}
                title={`${s[key]} (${widthPx}px)`}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  isCurrent ? "bg-accent/15 text-accent" : "hover:bg-surface text-fg-muted"
                }`}
              >
                <span
                  style={{
                    width: widthPx,
                    height: widthPx,
                    backgroundColor: "currentColor",
                  }}
                  className="rounded-full inline-block"
                />
              </button>
            );
          })}

          <div className="h-5 w-px bg-border mx-1" />

          {/* Color Palette (6 colors) */}
          <div className="flex items-center gap-1">
            {BOARD_COLORS.map((c) => {
              const isSelected = activeColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveColor(c)}
                  aria-label={`Color ${c}`}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border border-black/10 transition-transform ${
                    isSelected ? "ring-2 ring-accent scale-110 shadow-sm" : "hover:scale-105"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label={s.undo}
            title={s.undo}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label={s.redo}
            title={s.redo}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Clear board */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            aria-label={s.clear}
            title={s.clear}
            className="p-1.5 rounded-lg text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Background selector */}
          <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setBackground("white")}
              aria-label={s.backgroundWhite}
              title={s.backgroundWhite}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                board.currentPage.background === "white"
                  ? "bg-accent text-white"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {s.backgroundWhite}
            </button>
            <button
              type="button"
              onClick={() => setBackground("grid")}
              aria-label={s.backgroundGrid}
              title={s.backgroundGrid}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                board.currentPage.background === "grid"
                  ? "bg-accent text-white"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              <Grid className="w-3.5 h-3.5 inline mr-1" />
              {s.backgroundGrid}
            </button>
            <button
              type="button"
              onClick={() => setBackground("lines")}
              aria-label={s.backgroundLines}
              title={s.backgroundLines}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                board.currentPage.background === "lines"
                  ? "bg-accent text-white"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {s.backgroundLines}
            </button>
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Page navigation (RF04, CA05) */}
          <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => switchPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              aria-label={s.prevPage}
              title={s.prevPage}
              className="p-1 rounded hover:bg-surface-raised disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium px-1 text-fg">
              {s.pageOf(currentPageIndex + 1, totalPages)}
            </span>
            <button
              type="button"
              onClick={() => switchPage(currentPageIndex + 1)}
              disabled={currentPageIndex >= totalPages - 1}
              aria-label={s.nextPage}
              title={s.nextPage}
              className="p-1 rounded hover:bg-surface-raised disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {totalPages < maxPages && (
              <button
                type="button"
                onClick={addPage}
                aria-label={s.addPage}
                title={s.addPage}
                className="p-1 rounded text-accent hover:bg-accent/10 transition-colors ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => setShowDeletePageConfirm(true)}
                aria-label={s.deletePage}
                title={s.deletePage}
                className="p-1 rounded text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors ml-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Send words to students (RF05, CA06) */}
          <button
            type="button"
            onClick={handleOpenSendWords}
            aria-label={s.sendWords}
            title={s.sendWords}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface text-fg font-medium hover:bg-surface-raised border border-border text-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">{s.sendWords}</span>
          </button>

          {/* Export PNG (RF06, CA07) */}
          <button
            type="button"
            onClick={exportPng}
            aria-label={s.exportPng}
            title={s.exportPng}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface border border-border transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Expand / Collapse (RF03, CA04) */}
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={isExpanded ? s.collapseBoard : s.expandBoard}
            title={isExpanded ? s.collapseBoard : s.expandBoard}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface border border-border transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Error alert banner (CA09) */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 px-4 py-2 bg-danger/10 text-danger border-b border-danger/20 text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearErrorMessage}
            aria-label="Dismiss error"
            className="p-0.5 hover:bg-danger/20 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Words sent notification toast */}
      {wordsNotice && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800 text-xs font-medium"
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{wordsNotice}</span>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-surface-raised min-h-[300px]">
        <BoardCanvas board={board} />
      </div>

      {/* Clear Page Confirmation Modal */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-board-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-border shadow-xl space-y-4">
            <h3 id="clear-board-title" className="font-display text-lg text-fg">
              {s.clear}
            </h3>
            <p className="text-sm text-fg-muted">{s.clearConfirm}</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>
                {s.cancel}
              </Button>
              <Button
                variant="secondary"
                className="border-danger text-danger hover:bg-danger/10 hover:border-danger hover:text-danger"
                onClick={() => {
                  clearCurrentPage();
                  setShowClearConfirm(false);
                }}
              >
                {s.clearConfirmButton}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirmation Modal */}
      {showDeletePageConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-page-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-border shadow-xl space-y-4">
            <h3 id="delete-page-title" className="font-display text-lg text-fg">
              {s.deletePage}
            </h3>
            <p className="text-sm text-fg-muted">{s.deletePageConfirm}</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowDeletePageConfirm(false)}>
                {s.cancel}
              </Button>
              <Button
                variant="secondary"
                className="border-danger text-danger hover:bg-danger/10 hover:border-danger hover:text-danger"
                onClick={() => {
                  deletePage();
                  setShowDeletePageConfirm(false);
                }}
              >
                {s.deletePage}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Words to Students Modal (RF05, CA06) */}
      {showSendWordsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-words-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="send-words-title" className="font-display text-lg text-fg flex items-center gap-2">
                <Send className="w-5 h-5 text-accent" />
                {s.sendWords}
              </h3>
              <button
                type="button"
                onClick={() => setShowSendWordsModal(false)}
                className="p-1 rounded hover:bg-surface-raised text-fg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-fg-muted">{s.sendWordsDesc}</p>

            {getCandidateWords().length === 0 ? (
              <div className="p-6 text-center text-sm text-fg-muted bg-surface-raised rounded-xl">
                {s.noWordsFound}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-surface-raised rounded-xl border border-border">
                {getCandidateWords().map((word) => {
                  const isChecked = selectedWords.includes(word);
                  return (
                    <label
                      key={word}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface cursor-pointer select-none text-sm text-fg"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWordSelection(word)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="font-medium">{word}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  title: string;
  icon: React.ReactNode;
}

function ToolButton({ active, onClick, ariaLabel, title, icon }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
        active
          ? "bg-accent text-white shadow-xs font-semibold"
          : "text-fg-muted hover:text-fg hover:bg-surface"
      }`}
    >
      {icon}
    </button>
  );
}
