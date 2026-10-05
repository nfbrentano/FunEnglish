"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearBoardLocally,
  downloadBoardPageAsPng,
  extractBoardText,
  extractBoardWords,
  loadBoardLocally,
  saveBoardLocally,
} from "./board-persistence";
import { validateAndResizeBoardImage } from "./image-utils";
import {
  BOARD_COLORS,
  BOARD_ERASER_WIDTH,
  BOARD_HIGHLIGHTER_WIDTH,
  BOARD_PEN_WIDTHS,
  MAX_PAGES,
  MAX_UNDO_STEPS,
  type BoardBackground,
  type BoardColor,
  type BoardImage,
  type BoardItem,
  type BoardPage,
  type BoardPenWidthKey,
  type BoardStroke,
  type BoardTextBox,
  type BoardTool,
  type Point,
} from "./types";

export interface UseWhiteboardOptions {
  sessionId?: string;
  initialPages?: BoardPage[];
  onSendWords?: (words: string[]) => void;
  onBoardTextChange?: (text: string) => void;
}

function createEmptyPage(id = "page-1"): BoardPage {
  return {
    id,
    items: [],
    background: "white",
  };
}

export function useWhiteboard(options: UseWhiteboardOptions = {}) {
  const { sessionId = "default-session", initialPages, onSendWords, onBoardTextChange } = options;

  // Initialize pages from localStorage or initialPages or empty
  const [pages, setPages] = useState<BoardPage[]>(() => {
    if (initialPages && initialPages.length > 0) {
      return initialPages;
    }
    const saved = loadBoardLocally(sessionId);
    if (saved && saved.pages && saved.pages.length > 0) {
      return saved.pages;
    }
    return [createEmptyPage()];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<BoardTool>("pen");
  const [activeColor, setActiveColor] = useState<BoardColor>(BOARD_COLORS[0]);
  const [activePenWidthKey, setActivePenWidthKey] = useState<BoardPenWidthKey>("medium");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<BoardStroke | null>(null);
  const currentStrokeRef = useRef<BoardStroke | null>(null);

  // Undo / Redo stacks: history of items array for current page
  const [undoStack, setUndoStack] = useState<BoardItem[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardItem[][]>([]);

  // Safe page reference
  const safePageIndex = Math.min(Math.max(0, currentPageIndex), Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex] || createEmptyPage();

  // Reset undo/redo when switching page
  const switchPage = useCallback(
    (newIndex: number) => {
      if (newIndex >= 0 && newIndex < pages.length) {
        setCurrentPageIndex(newIndex);
        setSelectedItemId(null);
        setUndoStack([]);
        setRedoStack([]);
      }
    },
    [pages.length],
  );

  // Auto-save debounced to localStorage (RNF01, CA08)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveBoardLocally(sessionId, { pages, currentPageIndex });
      if (onBoardTextChange) {
        const text = extractBoardText(pages);
        onBoardTextChange(text);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pages, currentPageIndex, sessionId, onBoardTextChange]);

  // Push new state to undo stack
  const pushToUndo = useCallback((prevItems: BoardItem[]) => {
    setUndoStack((prev) => {
      const next = [...prev, prevItems];
      if (next.length > MAX_UNDO_STEPS) {
        return next.slice(next.length - MAX_UNDO_STEPS);
      }
      return next;
    });
    setRedoStack([]);
  }, []);

  // Update items of current page
  const updateCurrentPageItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[], recordUndo = true) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const page = nextPages[safePageIndex];
        if (!page) return prevPages;

        if (recordUndo) {
          pushToUndo(page.items);
        }

        const newItems = updater(page.items);
        nextPages[safePageIndex] = { ...page, items: newItems };
        return nextPages;
      });
    },
    [safePageIndex, pushToUndo],
  );

  // Undo (CA02)
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousItems = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = nextPages[safePageIndex];
      if (!page) return prevPages;

      setRedoStack((prev) => [...prev, page.items]);
      nextPages[safePageIndex] = { ...page, items: previousItems };
      return nextPages;
    });
    setSelectedItemId(null);
  }, [undoStack, safePageIndex]);

  // Redo (CA02)
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextItems = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));

    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = nextPages[safePageIndex];
      if (!page) return prevPages;

      setUndoStack((prev) => [...prev, page.items]);
      nextPages[safePageIndex] = { ...page, items: nextItems };
      return nextPages;
    });
    setSelectedItemId(null);
  }, [redoStack, safePageIndex]);

  // Clear current page (RF01)
  const clearCurrentPage = useCallback(() => {
    updateCurrentPageItems(() => []);
    setSelectedItemId(null);
  }, [updateCurrentPageItems]);

  // Set background of current page
  const setBackground = useCallback(
    (background: BoardBackground) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const page = nextPages[safePageIndex];
        if (!page) return prevPages;
        nextPages[safePageIndex] = { ...page, background };
        return nextPages;
      });
    },
    [safePageIndex],
  );

  // Page operations (RF04, CA05)
  const addPage = useCallback(() => {
    if (pages.length >= MAX_PAGES) return;
    const newPage = createEmptyPage(`page-${Date.now()}`);
    setPages((prev) => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
    setSelectedItemId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [pages.length]);

  const deletePage = useCallback(
    (indexToDelete = safePageIndex) => {
      if (pages.length <= 1) return;
      setPages((prev) => prev.filter((_, idx) => idx !== indexToDelete));
      setCurrentPageIndex((prev) => (prev >= indexToDelete && prev > 0 ? prev - 1 : prev));
      setSelectedItemId(null);
      setUndoStack([]);
      setRedoStack([]);
    },
    [pages.length, safePageIndex],
  );

  // Drawing interactions (RF01, CA01)
  const startDrawing = useCallback(
    (pt: Point) => {
      if (activeTool === "select" || activeTool === "text") return;

      setIsDrawing(true);
      let width: number = BOARD_PEN_WIDTHS[activePenWidthKey];
      if (activeTool === "highlighter") width = BOARD_HIGHLIGHTER_WIDTH;
      if (activeTool === "eraser") width = BOARD_ERASER_WIDTH;

      const stroke: BoardStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "stroke",
        tool: activeTool,
        color: activeTool === "eraser" ? "#ffffff" : activeColor,
        width,
        points: [pt],
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    },
    [activeTool, activeColor, activePenWidthKey],
  );

  const continueDrawing = useCallback(
    (pt: Point) => {
      if (!currentStrokeRef.current) return;
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, pt],
      };
      setCurrentStroke(currentStrokeRef.current);
    },
    [],
  );

  const finishDrawing = useCallback(() => {
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 0) {
      updateCurrentPageItems((items) => [...items, stroke]);
    }
    currentStrokeRef.current = null;
    setIsDrawing(false);
    setCurrentStroke(null);
  }, [updateCurrentPageItems]);

  // Text Box Operations (RF01, CA06)
  const addTextBox = useCallback(
    (x: number, y: number, initialText = "Text") => {
      const newTextBox: BoardTextBox = {
        id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "text",
        text: initialText,
        x,
        y,
        width: 200,
        height: 60,
        fontSize: 24,
        color: activeColor,
      };
      updateCurrentPageItems((items) => [...items, newTextBox]);
      setSelectedItemId(newTextBox.id);
      return newTextBox.id;
    },
    [activeColor, updateCurrentPageItems],
  );

  const updateTextBox = useCallback(
    (id: string, text: string) => {
      updateCurrentPageItems(
        (items) =>
          items.map((item) => {
            if (item.id === id && item.type === "text") {
              return { ...item, text };
            }
            return item;
          }),
        false, // Don't record undo for every keystroke; callers can record on blur
      );
    },
    [updateCurrentPageItems],
  );

  // Item Position & Dimensions (RF02, CA03)
  const updateItemPosition = useCallback(
    (id: string, x: number, y: number) => {
      updateCurrentPageItems((items) =>
        items.map((item) => {
          if (item.id === id) {
            if (item.type === "text" || item.type === "image") {
              return { ...item, x, y };
            }
          }
          return item;
        }),
      );
    },
    [updateCurrentPageItems],
  );

  const updateItemDimensions = useCallback(
    (id: string, width: number, height: number) => {
      updateCurrentPageItems((items) =>
        items.map((item) => {
          if (item.id === id) {
            if (item.type === "image" || item.type === "text") {
              return { ...item, width, height };
            }
          }
          return item;
        }),
      );
    },
    [updateCurrentPageItems],
  );

  const deleteItem = useCallback(
    (id: string) => {
      updateCurrentPageItems((items) => items.filter((item) => item.id !== id));
      if (selectedItemId === id) {
        setSelectedItemId(null);
      }
    },
    [updateCurrentPageItems, selectedItemId],
  );

  // Pasting or dropping images (RF02, CA03, CA09)
  const pasteOrDropFile = useCallback(
    async (file: Blob, defaultX = 100, defaultY = 100): Promise<boolean> => {
      try {
        setErrorMessage(null);
        const processed = await validateAndResizeBoardImage(file);

        // Display dimensions on canvas: fit comfortably within viewport (e.g. max 600px initially)
        const displayScale = Math.min(1, 600 / Math.max(processed.width, processed.height));
        const displayWidth = Math.round(processed.width * displayScale);
        const displayHeight = Math.round(processed.height * displayScale);

        const newImage: BoardImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "image",
          url: processed.dataUrl,
          x: defaultX,
          y: defaultY,
          width: displayWidth,
          height: displayHeight,
          naturalWidth: processed.width,
          naturalHeight: processed.height,
        };

        updateCurrentPageItems((items) => [...items, newImage]);
        setSelectedItemId(newImage.id);
        setActiveTool("select");
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to process image";
        setErrorMessage(msg);
        return false;
      }
    },
    [updateCurrentPageItems],
  );

  // Export PNG (RF06, CA07)
  const exportPng = useCallback(async () => {
    await downloadBoardPageAsPng(currentPage, safePageIndex);
  }, [currentPage, safePageIndex]);

  // Extract vocabulary words (RF05, CA06)
  const getCandidateWords = useCallback(() => {
    return extractBoardWords(pages);
  }, [pages]);

  const sendWordsToStudents = useCallback(
    (words: string[]) => {
      if (onSendWords && words.length > 0) {
        onSendWords(words);
      }
    },
    [onSendWords],
  );

  // Clear all data for session
  const resetBoard = useCallback(() => {
    clearBoardLocally(sessionId);
    setPages([createEmptyPage()]);
    setCurrentPageIndex(0);
    setSelectedItemId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [sessionId]);

  return {
    pages,
    currentPage,
    currentPageIndex: safePageIndex,
    activeTool,
    activeColor,
    activePenWidthKey,
    isExpanded,
    errorMessage,
    selectedItemId,
    isDrawing,
    currentStroke,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    totalPages: pages.length,
    maxPages: MAX_PAGES,

    // Actions
    setActiveTool,
    setActiveColor,
    setActivePenWidthKey,
    setIsExpanded,
    toggleExpanded: () => setIsExpanded((prev) => !prev),
    setSelectedItemId,
    clearErrorMessage: () => setErrorMessage(null),
    switchPage,
    addPage,
    deletePage,
    setBackground,
    startDrawing,
    continueDrawing,
    finishDrawing,
    addTextBox,
    updateTextBox,
    updateItemPosition,
    updateItemDimensions,
    deleteItem,
    pasteOrDropFile,
    undo,
    redo,
    clearCurrentPage,
    exportPng,
    getCandidateWords,
    sendWordsToStudents,
    resetBoard,
  };
}

export type WhiteboardInstance = ReturnType<typeof useWhiteboard>;
