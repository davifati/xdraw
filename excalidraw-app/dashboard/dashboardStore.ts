import { STORAGE_KEYS } from "../app_constants";

import type { Collection, DrawingMeta } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[dashboard] localStorage write failed:", e);
  }
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function getCollections(): Collection[] {
  return getItem<Collection[]>(STORAGE_KEYS.DASHBOARD_COLLECTIONS, []);
}

export function saveCollections(collections: Collection[]): void {
  setItem(STORAGE_KEYS.DASHBOARD_COLLECTIONS, collections);
}

export function createCollection(name: string): Collection {
  const collection: Collection = { id: `col-${uid()}`, name };
  saveCollections([...getCollections(), collection]);
  return collection;
}

export function renameCollection(id: string, name: string): void {
  const cols = getCollections().map((c) => (c.id === id ? { ...c, name } : c));
  saveCollections(cols);
}

export function deleteCollection(id: string): void {
  saveCollections(getCollections().filter((c) => c.id !== id));
  // Unassign drawings that were in this collection
  const drawings = getDrawings().map((d) =>
    d.collectionId === id ? { ...d, collectionId: null } : d,
  );
  saveDrawings(drawings);
}

// ---------------------------------------------------------------------------
// Drawing metadata
// ---------------------------------------------------------------------------

export function getDrawings(): DrawingMeta[] {
  return getItem<DrawingMeta[]>(STORAGE_KEYS.DASHBOARD_DRAWINGS, []);
}

export function saveDrawings(drawings: DrawingMeta[]): void {
  setItem(STORAGE_KEYS.DASHBOARD_DRAWINGS, drawings);
}

export function getDrawingElementsKey(id: string): string {
  return `${STORAGE_KEYS.DASHBOARD_DRAWING_ELEMENTS_PREFIX}${id}`;
}

export function getDrawingElements(id: string): unknown[] {
  return getItem<unknown[]>(getDrawingElementsKey(id), []);
}

export function saveDrawingElements(id: string, elements: unknown[]): void {
  setItem(getDrawingElementsKey(id), elements);
}

export function getActiveDrawingId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.DASHBOARD_ACTIVE_DRAWING_ID);
}

export function setActiveDrawingId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEYS.DASHBOARD_ACTIVE_DRAWING_ID);
  } else {
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_ACTIVE_DRAWING_ID, id);
  }
}

export function updateDrawingMeta(
  id: string,
  patch: Partial<Omit<DrawingMeta, "id" | "createdAt">>,
): void {
  const drawings = getDrawings();
  const idx = drawings.findIndex((d) => d.id === id);
  if (idx === -1) {
    return;
  }
  drawings[idx] = { ...drawings[idx], ...patch, updatedAt: Date.now() };
  saveDrawings(drawings);
}

export function deleteDrawing(id: string): void {
  saveDrawings(getDrawings().filter((d) => d.id !== id));
  try {
    localStorage.removeItem(getDrawingElementsKey(id));
  } catch {}
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Flush the current editor canvas (localStorage "excalidraw") into the
 * drawing store entry for the active drawing.
 */
export function syncActiveDrawingToStore(): void {
  const id = getActiveDrawingId();
  if (!id) {
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    if (raw) {
      setItem(getDrawingElementsKey(id), JSON.parse(raw));
    }
    updateDrawingMeta(id, { updatedAt: Date.now() });
  } catch {}
}

/**
 * Load a drawing's elements into the editor localStorage slot and
 * update its metadata.
 */
export function loadDrawingToEditor(id: string): void {
  syncActiveDrawingToStore();

  const elements = getDrawingElements(id);
  try {
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS,
      JSON.stringify(elements),
    );
    // Clear saved appState so zoom/pan resets cleanly
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
  } catch {}

  const now = Date.now();
  updateDrawingMeta(id, {
    openedCount: (getDrawings().find((d) => d.id === id)?.openedCount ?? 0) + 1,
    lastOpenedAt: now,
  });
  setActiveDrawingId(id);
}

/**
 * Create a fresh drawing entry, clear the editor slot, and make it active.
 */
export function newDrawingForEditor(
  name = "Untitled",
  collectionId: string | null = null,
): DrawingMeta {
  syncActiveDrawingToStore();

  const now = Date.now();
  const drawing: DrawingMeta = {
    id: `drw-${uid()}`,
    name,
    tags: [],
    collectionId,
    openedCount: 1,
    lastOpenedAt: now,
    updatedAt: now,
    createdAt: now,
  };
  saveDrawings([drawing, ...getDrawings()]);

  try {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
  } catch {}

  setActiveDrawingId(drawing.id);
  return drawing;
}

/**
 * On first ever launch: if there are elements in the editor slot but no
 * drawings in the store, adopt them as the first drawing.
 */
export function adoptExistingSceneIfNeeded(): void {
  if (getDrawings().length > 0) {
    return;
  }

  let elements: unknown[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    if (raw) {
      elements = JSON.parse(raw);
    }
  } catch {}

  const now = Date.now();
  const drawing: DrawingMeta = {
    id: `drw-${uid()}`,
    name: "My drawing",
    tags: [],
    collectionId: null,
    openedCount: 1,
    lastOpenedAt: now,
    updatedAt: now,
    createdAt: now,
  };

  if (elements.length > 0) {
    saveDrawingElements(drawing.id, elements);
  }
  saveDrawings([drawing]);
  setActiveDrawingId(drawing.id);
}
