"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearBoardLocally,
  downloadBoardPageAsPng,
  downloadBoardAsPdf,
  extractBoardText,
  extractBoardWords,
  loadBoardLocally,
  saveBoardLocally,
} from "./board-persistence";
import { findItemsAt } from "./hit-test";
import { validateAndResizeBoardImage } from "./image-utils";
import type { BoardInk, BoardSurface } from "./ink";
import {
  BOARD_ERASER_WIDTH,
  BOARD_HIGHLIGHTER_WIDTH,
  BOARD_PEN_WIDTH_KEYS,
  BOARD_PEN_WIDTHS,
  MAX_PAGES,
  MAX_UNDO_STEPS,
  type BoardBackground,
  type BoardEraserMode,
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
  const [activeColor, setActiveColor] = useState<BoardInk>("ink");
  const [activePenWidthKey, setActivePenWidthKey] = useState<BoardPenWidthKey>("medium");
  const [eraserMode, setEraserMode] = useState<BoardEraserMode>("area");
  // Items the whole-stroke eraser has touched in the current gesture, removed on release (RF06).
  const [pendingEraseIds, setPendingEraseIds] = useState<ReadonlySet<string>>(new Set());
  const pendingEraseRef = useRef<Set<string> | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [clipboardItems, setClipboardItems] = useState<BoardItem[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<BoardStroke | null>(null);
  const currentStrokeRef = useRef<BoardStroke | null>(null);

  // Undo / Redo stacks: history of items array per page id
  const [undoStacks, setUndoStacks] = useState<Record<string, BoardItem[][]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<string, BoardItem[][]>>({});

  // Safe page reference
  const safePageIndex = Math.min(Math.max(0, currentPageIndex), Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex] || createEmptyPage();

  // Reset undo/redo when switching page
  const switchPage = useCallback(
    (newIndex: number) => {
      if (newIndex >= 0 && newIndex < pages.length) {
        setCurrentPageIndex(newIndex);
        setSelectedItemIds([]);
      }
    },
    [pages.length],
  );

  // Auto-save debounced to localStorage (RNF01, CA08). "Saving…" lasts while pages differ
  // from the last saved snapshot (RF10).
  const [lastSavedPages, setLastSavedPages] = useState(pages);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveBoardLocally(sessionId, { pages, currentPageIndex });
      setLastSavedPages(pages);
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
  const pushToUndo = useCallback(
    (prevItems: BoardItem[], pageId: string) => {
      setUndoStacks((prev) => {
        const stack = prev[pageId] || [];
        const next = [...stack, prevItems];
        if (next.length > MAX_UNDO_STEPS) {
          return { ...prev, [pageId]: next.slice(next.length - MAX_UNDO_STEPS) };
        }
        return { ...prev, [pageId]: next };
      });
      setRedoStacks((prev) => ({ ...prev, [pageId]: [] }));
    },
    [],
  );

  // Update items of current page
  const updateCurrentPageItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[], recordUndo = true) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const page = nextPages[safePageIndex];
        if (!page) return prevPages;

        if (recordUndo) {
          pushToUndo(page.items, page.id);
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
    const pageId = currentPage.id;
    const stack = undoStacks[pageId] || [];
    if (stack.length === 0) return;
    
    const previousItems = stack[stack.length - 1];
    setUndoStacks((prev) => ({ ...prev, [pageId]: stack.slice(0, stack.length - 1) }));

    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = nextPages[safePageIndex];
      if (!page) return prevPages;

      setRedoStacks((prev) => {
        const rStack = prev[pageId] || [];
        return { ...prev, [pageId]: [...rStack, page.items] };
      });
      nextPages[safePageIndex] = { ...page, items: previousItems };
      return nextPages;
    });
    setSelectedItemIds([]);
  }, [undoStacks, safePageIndex, currentPage.id]);

  // Redo (CA02)
  const redo = useCallback(() => {
    const pageId = currentPage.id;
    const stack = redoStacks[pageId] || [];
    if (stack.length === 0) return;
    
    const nextItems = stack[stack.length - 1];
    setRedoStacks((prev) => ({ ...prev, [pageId]: stack.slice(0, stack.length - 1) }));

    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = nextPages[safePageIndex];
      if (!page) return prevPages;

      setUndoStacks((prev) => {
        const uStack = prev[pageId] || [];
        return { ...prev, [pageId]: [...uStack, page.items] };
      });
      nextPages[safePageIndex] = { ...page, items: nextItems };
      return nextPages;
    });
    setSelectedItemIds([]);
  }, [redoStacks, safePageIndex, currentPage.id]);

  // Clear current page (RF01)
  const clearCurrentPage = useCallback(() => {
    updateCurrentPageItems(() => []);
    setSelectedItemIds([]);
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
    setSelectedItemIds([]);
  }, [pages.length]);

  const deletePage = useCallback(
    (indexToDelete = safePageIndex) => {
      if (pages.length <= 1) return;
      setPages((prev) => prev.filter((_, idx) => idx !== indexToDelete));
      setCurrentPageIndex((prev) => (prev >= indexToDelete && prev > 0 ? prev - 1 : prev));
      setSelectedItemIds([]);
    },
    [pages.length, safePageIndex],
  );

  const duplicatePage = useCallback(
    (indexToDuplicate = safePageIndex) => {
      if (pages.length >= MAX_PAGES) return;
      const pageToDuplicate = pages[indexToDuplicate];
      const newPage: BoardPage = {
        ...pageToDuplicate,
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        items: pageToDuplicate.items.map(item => {
          const newId = `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          if (item.type === "stroke" || item.type === "text" || item.type === "image") {
            return { ...item, id: newId } as BoardItem;
          }
          return item as BoardItem;
        })
      };
      
      setPages((prev) => {
        const next = [...prev];
        next.splice(indexToDuplicate + 1, 0, newPage);
        return next;
      });
      setCurrentPageIndex(indexToDuplicate + 1);
      setSelectedItemIds([]);
    },
    [pages, safePageIndex],
  );

  const reorderPage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return;
      setPages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      setCurrentPageIndex((prev) => {
        if (prev === fromIndex) return toIndex;
        if (fromIndex < prev && toIndex >= prev) return prev - 1;
        if (fromIndex > prev && toIndex <= prev) return prev + 1;
        return prev;
      });
    },
    [pages.length],
  );

  // Whole-stroke eraser: collect touched items while dragging (RF06, CA20)
  const collectEraseAt = useCallback(
    (pt: Point) => {
      const pending = pendingEraseRef.current;
      if (!pending) return;
      const hits = findItemsAt(currentPage.items, pt, BOARD_ERASER_WIDTH / 2);
      if (hits.some((id) => !pending.has(id))) {
        hits.forEach((id) => pending.add(id));
        setPendingEraseIds(new Set(pending));
      }
    },
    [currentPage.items],
  );

  // Drawing interactions (RF01, CA01)
  const startDrawing = useCallback(
    (pt: Point) => {
      if (activeTool === "select" || activeTool === "text") return;

      setIsDrawing(true);
      if (activeTool === "eraser" && eraserMode === "object") {
        pendingEraseRef.current = new Set();
        collectEraseAt(pt);
        return;
      }
      let width: number = BOARD_PEN_WIDTHS[activePenWidthKey];
      if (activeTool === "highlighter") width = BOARD_HIGHLIGHTER_WIDTH;
      if (activeTool === "eraser") width = BOARD_ERASER_WIDTH;

      const stroke: BoardStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "stroke",
        tool: activeTool,
        color: activeColor,
        width,
        points: [pt],
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    },
    [activeTool, activeColor, activePenWidthKey, eraserMode, collectEraseAt],
  );

  const continueDrawing = useCallback(
    (pt: Point) => {
      if (pendingEraseRef.current) {
        collectEraseAt(pt);
        return;
      }
      if (!currentStrokeRef.current) return;
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, pt],
      };
      setCurrentStroke(currentStrokeRef.current);
    },
    [collectEraseAt],
  );

  const finishDrawing = useCallback(() => {
    const erased = pendingEraseRef.current;
    if (erased) {
      pendingEraseRef.current = null;
      setPendingEraseIds(new Set());
      setIsDrawing(false);
      if (erased.size > 0) {
        updateCurrentPageItems((items) => items.filter((item) => !erased.has(item.id)));
        setSelectedItemIds((prev) => prev.filter(id => !erased.has(id)));
      }
      return;
    }
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 0 && stroke.tool !== "laser") {
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
        width: 320,
        height: 60,
        fontSize: 24,
        color: activeColor,
      };
      updateCurrentPageItems((items) => [...items, newTextBox]);
      setSelectedItemIds([newTextBox.id]);
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

  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.length === 0) return;
      updateCurrentPageItems((items) => {
        return items.map((item) => {
          if (selectedItemIds.includes(item.id)) {
            if (item.type === "text" || item.type === "image") {
              return { ...item, x: item.x + dx, y: item.y + dy };
            } else if (item.type === "stroke") {
              return { ...item, points: item.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            }
          }
          return item;
        });
      });
    },
    [selectedItemIds, updateCurrentPageItems],
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
      setSelectedItemIds((prev) => prev.filter(selected => selected !== id));
    },
    [updateCurrentPageItems],
  );
  
  const deleteSelectedItems = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    updateCurrentPageItems((items) => items.filter((item) => !selectedItemIds.includes(item.id)));
    setSelectedItemIds([]);
  }, [selectedItemIds, updateCurrentPageItems]);

  const copySelectedItems = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    const itemsToCopy = currentPage.items.filter(item => selectedItemIds.includes(item.id));
    setClipboardItems(itemsToCopy);
  }, [selectedItemIds, currentPage.items]);

  const duplicateSelectedItems = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    const itemsToCopy = currentPage.items.filter(item => selectedItemIds.includes(item.id));
    if (itemsToCopy.length === 0) return;
    
    updateCurrentPageItems((items) => {
      const newItems = itemsToCopy.map(item => {
        const newId = `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (item.type === "text" || item.type === "image") {
          return { ...item, id: newId, x: item.x + 20, y: item.y + 20 };
        } else if (item.type === "stroke") {
          return { ...item, id: newId, points: item.points.map(p => ({ x: p.x + 20, y: p.y + 20 })) };
        }
        return item as BoardItem;
      });
      
      setSelectedItemIds(newItems.map(i => i.id));
      return [...items, ...newItems];
    });
  }, [selectedItemIds, currentPage.items, updateCurrentPageItems]);

  const pasteItems = useCallback(() => {
    if (clipboardItems.length === 0) return;
    updateCurrentPageItems((items) => {
      const newItems = clipboardItems.map(item => {
        const newId = `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (item.type === "text" || item.type === "image") {
          return { ...item, id: newId, x: item.x + 20, y: item.y + 20 };
        } else if (item.type === "stroke") {
          return { ...item, id: newId, points: item.points.map(p => ({ x: p.x + 20, y: p.y + 20 })) };
        }
        return item as BoardItem;
      });
      
      setSelectedItemIds(newItems.map(i => i.id));
      return [...items, ...newItems];
    });
  }, [clipboardItems, updateCurrentPageItems]);

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
        setSelectedItemIds([newImage.id]);
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
  const exportPng = useCallback(
    async (surface: BoardSurface) => {
      await downloadBoardPageAsPng(currentPage, safePageIndex, surface);
    },
    [currentPage, safePageIndex],
  );

  // Export PDF (RF08, CA09)
  const exportPdf = useCallback(async () => {
    await downloadBoardAsPdf(pages);
  }, [pages]);

  // "[" and "]" step through the pen widths (RF12)
  const stepPenWidth = useCallback((direction: 1 | -1) => {
    setActivePenWidthKey((current) => {
      const index = BOARD_PEN_WIDTH_KEYS.indexOf(current) + direction;
      return BOARD_PEN_WIDTH_KEYS[Math.max(0, Math.min(BOARD_PEN_WIDTH_KEYS.length - 1, index))];
    });
  }, []);

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
    setSelectedItemIds([]);
    setUndoStacks({});
    setRedoStacks({});
    setClipboardItems([]);
  }, [sessionId]);

  return {
    pages,
    currentPage,
    currentPageIndex: safePageIndex,
    activeTool,
    activeColor,
    activePenWidthKey,
    eraserMode,
    pendingEraseIds,
    isSaving: lastSavedPages !== pages,
    isExpanded,
    errorMessage,
    selectedItemIds,
    clipboardItems,
    isDrawing,
    currentStroke,
    canUndo: (undoStacks[currentPage.id]?.length || 0) > 0,
    canRedo: (redoStacks[currentPage.id]?.length || 0) > 0,
    totalPages: pages.length,
    maxPages: MAX_PAGES,

    // Actions
    setActiveTool,
    setActiveColor,
    setActivePenWidthKey,
    stepPenWidth,
    setEraserMode,
    setIsExpanded,
    toggleExpanded: () => setIsExpanded((prev) => !prev),
    setSelectedItemIds,
    clearErrorMessage: () => setErrorMessage(null),
    switchPage,
    addPage,
    deletePage,
    duplicatePage,
    reorderPage,
    setBackground,
    startDrawing,
    continueDrawing,
    finishDrawing,
    addTextBox,
    updateTextBox,
    updateItemPosition,
    updateItemDimensions,
    moveSelectedItems,
    deleteItem,
    deleteSelectedItems,
    copySelectedItems,
    duplicateSelectedItems,
    pasteItems,
    pasteOrDropFile,
    undo,
    redo,
    clearCurrentPage,
    exportPng,
    exportPdf,
    getCandidateWords,
    sendWordsToStudents,
    resetBoard,
  };
}

export type WhiteboardInstance = ReturnType<typeof useWhiteboard>;
