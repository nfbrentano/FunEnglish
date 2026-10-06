import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateQueueBytes,
  clearQueuedImages,
  getAllQueuedImages,
  MAX_QUEUE_BYTES,
  MAX_QUEUE_ITEMS,
  QueueFullError,
  removeQueuedImage,
  saveQueuedImage,
  type QueuedImageRecord,
  _resetMemoryStoreForTesting,
} from "@/lib/admin/image-queue-storage";

describe("image-queue-storage (spec: fila de imagens no painel, RNF01, RNF03, RNF05, CA03, CA09, CA10, CT03, CT09, CT10)", () => {
  beforeEach(async () => {
    _resetMemoryStoreForTesting();
    await clearQueuedImages();
  });

  it("stores and retrieves queued images sorted by addedAt (RNF01, CA03, CT03)", async () => {
    const blob1 = new Blob(["test1"], { type: "image/webp" });
    const blob2 = new Blob(["test2"], { type: "image/webp" });

    const item1: QueuedImageRecord = {
      src: "/images/activities/act-1/thumb.webp",
      blob: blob1,
      size: blob1.size,
      addedAt: 1000,
      fileName: "act-1--thumb.png",
      title: "Activity 1",
    };

    const item2: QueuedImageRecord = {
      src: "/images/activities/act-2/thumb.webp",
      blob: blob2,
      size: blob2.size,
      addedAt: 2000,
      fileName: "act-2--thumb.png",
      title: "Activity 2",
    };

    await saveQueuedImage(item2);
    await saveQueuedImage(item1);

    const { items } = await getAllQueuedImages();
    expect(items).toHaveLength(2);
    // Oldest first
    expect(items[0].src).toBe("/images/activities/act-1/thumb.webp");
    expect(items[1].src).toBe("/images/activities/act-2/thumb.webp");
    expect(calculateQueueBytes(items)).toBe(blob1.size + blob2.size);
  });

  it("replaces existing record with same src without duplicating (CA04, CT04)", async () => {
    const blob1 = new Blob(["v1"], { type: "image/webp" });
    const blob2 = new Blob(["v2-longer"], { type: "image/webp" });

    const item1: QueuedImageRecord = {
      src: "/images/activities/act-1/thumb.webp",
      blob: blob1,
      size: blob1.size,
      addedAt: 1000,
      fileName: "thumb.png",
    };

    await saveQueuedImage(item1);

    const item2: QueuedImageRecord = {
      src: "/images/activities/act-1/thumb.webp",
      blob: blob2,
      size: blob2.size,
      addedAt: 2000,
      fileName: "thumb-new.png",
    };

    await saveQueuedImage(item2);

    const { items } = await getAllQueuedImages();
    expect(items).toHaveLength(1);
    expect(items[0].fileName).toBe("thumb-new.png");
    expect(items[0].size).toBe(blob2.size);
  });

  it("removes a queued record by src (CA04, CT04)", async () => {
    const item: QueuedImageRecord = {
      src: "/images/activities/act-1/thumb.webp",
      blob: new Blob(["data"]),
      size: 4,
      addedAt: 1000,
      fileName: "thumb.png",
    };

    await saveQueuedImage(item);
    expect((await getAllQueuedImages()).items).toHaveLength(1);

    await removeQueuedImage("/images/activities/act-1/thumb.webp");
    expect((await getAllQueuedImages()).items).toHaveLength(0);
  });

  it("clears all queued images (RF03, CA02)", async () => {
    await saveQueuedImage({
      src: "/img1.webp",
      blob: new Blob(["a"]),
      size: 1,
      addedAt: 1,
      fileName: "1.png",
    });
    await saveQueuedImage({
      src: "/img2.webp",
      blob: new Blob(["b"]),
      size: 1,
      addedAt: 2,
      fileName: "2.png",
    });

    expect((await getAllQueuedImages()).items).toHaveLength(2);
    await clearQueuedImages();
    expect((await getAllQueuedImages()).items).toHaveLength(0);
  });

  it("rejects adding past the maximum item count limit of 200 (RNF03, CA09, CT09)", async () => {
    // Fill to 200 items
    for (let i = 0; i < MAX_QUEUE_ITEMS; i++) {
      await saveQueuedImage({
        src: `/images/activities/act-${i}/thumb.webp`,
        blob: new Blob(["x"]),
        size: 1,
        addedAt: i,
        fileName: `act-${i}.png`,
      });
    }

    const { items } = await getAllQueuedImages();
    expect(items).toHaveLength(200);

    // 201st item should throw QueueFullError
    await expect(
      saveQueuedImage({
        src: "/images/activities/overflow/thumb.webp",
        blob: new Blob(["x"]),
        size: 1,
        addedAt: 201,
        fileName: "overflow.png",
      }),
    ).rejects.toBeInstanceOf(QueueFullError);
  });

  it("rejects adding when total size exceeds 40 MB (RNF03, CA09, CT09)", async () => {
    // Attempt to add a single oversized blob > 40 MB
    const hugeBlob = new Blob([new Uint8Array(MAX_QUEUE_BYTES + 100)]);
    await expect(
      saveQueuedImage({
        src: "/huge.webp",
        blob: hugeBlob,
        size: hugeBlob.size,
        addedAt: 1,
        fileName: "huge.png",
      }),
    ).rejects.toBeInstanceOf(QueueFullError);
  });

  it("falls back to in-memory store seamlessly when IndexedDB is not available or blocked (RNF05, CA10, CT10)", async () => {
    _resetMemoryStoreForTesting();
    // In node/jsdom test environment without fake-indexeddb, openDb falls back to memory store
    const item: QueuedImageRecord = {
      src: "/test-memory.webp",
      blob: new Blob(["fallback"]),
      size: 8,
      addedAt: 123,
      fileName: "fallback.png",
    };

    const saveResult = await saveQueuedImage(item);
    // Returns boolean indicating availability
    expect(typeof saveResult.storageAvailable).toBe("boolean");

    const { items } = await getAllQueuedImages();
    expect(items).toHaveLength(1);
    expect(items[0].src).toBe("/test-memory.webp");
  });
});
