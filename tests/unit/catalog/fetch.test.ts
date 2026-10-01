import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  getDoc: vi.fn(),
  doc: vi.fn((_db, ...path: string[]) => path.join("/")),
}));
vi.mock("firebase/firestore/lite", () => firestore);
vi.mock("@/lib/firebase", () => ({ getLiteDb: () => ({}) }));

describe("fetchCatalogIndexOnce", () => {
  beforeEach(() => {
    vi.resetModules();
    firestore.getDoc.mockReset();
  });

  it("reads catalog/index once per page session", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ schemaVersion: 1, updatedAt: "2026-09-30T00:00:00.000Z", items: [] }),
    });
    const { fetchCatalogIndexOnce } = await import("@/lib/catalog/fetch");

    await Promise.all([fetchCatalogIndexOnce(), fetchCatalogIndexOnce(), fetchCatalogIndexOnce()]);

    expect(firestore.getDoc).toHaveBeenCalledTimes(1);
    expect(firestore.doc.mock.calls[0].slice(1)).toEqual(["catalog", "index"]);
  });

  it("falls back to an empty catalog when the document is invalid", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ items: "nope" }) });
    const { fetchCatalogIndex } = await import("@/lib/catalog/fetch");

    expect((await fetchCatalogIndex()).items).toEqual([]);
  });
});
