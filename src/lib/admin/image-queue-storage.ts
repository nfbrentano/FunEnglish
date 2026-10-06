// IndexedDB storage for admin image upload queue (spec: fila de imagens no painel, RNF01, RNF03, RNF05).
// Stores processed WebP blobs locally with limits (max 200 items, max 40 MB total).

export const DB_NAME = "fun-english-admin";
export const DB_VERSION = 1;
export const STORE_NAME = "image-queue";

export const MAX_QUEUE_ITEMS = 200;
export const MAX_QUEUE_BYTES = 40 * 1024 * 1024; // 40 MB

export class QueueFullError extends Error {
  constructor(message = "Queue is full — send what you have first") {
    super(message);
    this.name = "QueueFullError";
  }
}

export type QueuedImageRecord = {
  src: string;
  blob: Blob;
  addedAt: number;
  size: number;
  fileName: string;
  title?: string;
};

// In-memory fallback if IndexedDB is blocked (private mode) or unavailable (RNF05, CA10).
const memoryStore = new Map<string, QueuedImageRecord>();

export function isIndexedDBAvailable(): boolean {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    return false;
  }
  return true;
}

/** Open the IndexedDB database or throw if blocked/unavailable. */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error("IndexedDB is not available"));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "src" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error ?? new Error("Could not open IndexedDB"));
      };

      request.onblocked = () => {
        reject(new Error("IndexedDB database is blocked"));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Calculates total size in bytes of all queued records.
 */
export function calculateQueueBytes(items: readonly QueuedImageRecord[]): number {
  return items.reduce((acc, item) => acc + item.size, 0);
}

/**
 * Retrieves all items currently in the queue, sorted by addedAt asc.
 */
export async function getAllQueuedImages(): Promise<{
  items: QueuedImageRecord[];
  storageAvailable: boolean;
}> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const rawItems = (request.result ?? []) as QueuedImageRecord[];
          rawItems.sort((a, b) => a.addedAt - b.addedAt);
          resolve({ items: rawItems, storageAvailable: true });
        };

        request.onerror = () => {
          resolve({
            items: Array.from(memoryStore.values()).sort((a, b) => a.addedAt - b.addedAt),
            storageAvailable: false,
          });
        };
      } catch {
        resolve({
          items: Array.from(memoryStore.values()).sort((a, b) => a.addedAt - b.addedAt),
          storageAvailable: false,
        });
      }
    });
  } catch {
    return {
      items: Array.from(memoryStore.values()).sort((a, b) => a.addedAt - b.addedAt),
      storageAvailable: false,
    };
  }
}

/**
 * Saves or updates a queued image item.
 * Enforces maximum 200 items and 40 MB total payload limit (RNF03, CA09).
 */
export async function saveQueuedImage(
  item: QueuedImageRecord,
): Promise<{ storageAvailable: boolean }> {
  // First, verify limits against existing items
  const { items, storageAvailable } = await getAllQueuedImages();
  const existingIndex = items.findIndex((i) => i.src === item.src);

  const isNewItem = existingIndex === -1;
  if (isNewItem && items.length >= MAX_QUEUE_ITEMS) {
    throw new QueueFullError();
  }

  const existingSize = !isNewItem ? items[existingIndex].size : 0;
  const currentTotalBytes = calculateQueueBytes(items);
  const newTotalBytes = currentTotalBytes - existingSize + item.size;

  if (newTotalBytes > MAX_QUEUE_BYTES) {
    throw new QueueFullError();
  }

  if (!storageAvailable) {
    memoryStore.set(item.src, item);
    return { storageAvailable: false };
  }

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);

        request.onsuccess = () => {
          memoryStore.set(item.src, item);
          resolve({ storageAvailable: true });
        };

        request.onerror = () => {
          memoryStore.set(item.src, item);
          resolve({ storageAvailable: false });
        };
      } catch {
        memoryStore.set(item.src, item);
        resolve({ storageAvailable: false });
      }
    });
  } catch {
    memoryStore.set(item.src, item);
    return { storageAvailable: false };
  }
}

/**
 * Removes an image item from the queue by its `src`.
 */
export async function removeQueuedImage(src: string): Promise<void> {
  memoryStore.delete(src);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(src);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch {
    // If IndexedDB fails, memoryStore deletion already completed
  }
}

/**
 * Clears all items in the image queue.
 */
export async function clearQueuedImages(): Promise<void> {
  memoryStore.clear();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch {
    // If IndexedDB fails, memoryStore clear already completed
  }
}

/** For tests: reset memory store. */
export function _resetMemoryStoreForTesting(): void {
  memoryStore.clear();
}
