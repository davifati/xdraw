import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { STORAGE_KEYS } from "../app_constants";

import {
  adoptExistingSceneIfNeeded,
  createCollection,
  deleteCollection,
  deleteDrawing,
  getCollections,
  getDrawings,
  loadDrawingToEditor,
  newDrawingForEditor,
  updateDrawingMeta,
} from "./dashboardStore";
import "./Dashboard.scss";

import type { Collection, DrawingMeta, SortOption } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Icons (inline SVG – no external deps)
// ---------------------------------------------------------------------------

const IconSearch = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconSort = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </svg>
);

const IconPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconEdit = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrash = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const IconFolder = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconClose = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCanvas = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconExcalidraw = () => (
  <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
    <path
      d="M10 30 Q 5 20 15 10 Q 20 5 30 10 Q 35 15 32 25 Q 28 35 18 35 Q 12 35 10 30Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M16 20 Q 20 14 26 20 Q 20 26 16 20Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// DrawingCard
// ---------------------------------------------------------------------------

interface DrawingCardProps {
  drawing: DrawingMeta;
  collections: Collection[];
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAssignCollection: (drawingId: string, collectionId: string | null) => void;
  onTagsChange: (id: string, tags: string[]) => void;
}

function DrawingCard({
  drawing,
  collections,
  onOpen,
  onRename,
  onDelete,
  onAssignCollection,
  onTagsChange,
}: DrawingCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(drawing.name);
  const [showColMenu, setShowColMenu] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Sync nameValue when drawing.name changes externally
  useEffect(() => {
    if (!editingName) {
      setNameValue(drawing.name);
    }
  }, [drawing.name, editingName]);

  // Focus inputs
  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingTags) {
      tagInputRef.current?.focus();
    }
  }, [editingTags]);

  // Close col menu on outside click
  useEffect(() => {
    if (!showColMenu) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (!colMenuRef.current?.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColMenu]);

  const commitName = () => {
    const trimmed = nameValue.trim() || "Untitled";
    setEditingName(false);
    if (trimmed !== drawing.name) {
      onRename(drawing.id, trimmed);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !drawing.tags.includes(tag)) {
      onTagsChange(drawing.id, [...drawing.tags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(
      drawing.id,
      drawing.tags.filter((t) => t !== tag),
    );
  };

  return (
    <div className="drawing-card" onClick={() => onOpen(drawing.id)}>
      <div className="drawing-card-thumbnail">
        <IconCanvas />
      </div>

      <div className="drawing-card-body">
        <div className="drawing-card-name">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitName();
                }
                if (e.key === "Escape") {
                  setNameValue(drawing.name);
                  setEditingName(false);
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            drawing.name
          )}
        </div>
        <div className="drawing-card-meta">
          {formatRelativeTime(drawing.lastOpenedAt)}
          {drawing.openedCount > 1 ? ` · ${drawing.openedCount}×` : ""}
        </div>
        {(drawing.tags.length > 0 || editingTags) && (
          <div
            className="drawing-card-tags"
            onClick={(e) => e.stopPropagation()}
          >
            {drawing.tags.map((tag) => (
              <span key={tag} className="drawing-card-tag">
                {tag}
                {editingTags && (
                  <span
                    style={{ marginLeft: 3, cursor: "pointer" }}
                    onClick={(e) => removeTag(tag, e)}
                  >
                    ×
                  </span>
                )}
              </span>
            ))}
            {editingTags && (
              <div className="drawing-card-tag-editor">
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  placeholder="add tag…"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                    if (e.key === "Escape") {
                      setEditingTags(false);
                    }
                    e.stopPropagation();
                  }}
                  onBlur={() => {
                    if (tagInput) {
                      addTag();
                    }
                    setEditingTags(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="drawing-card-actions"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rename */}
        <button
          className="drawing-card-action-btn"
          title="Rename"
          onClick={(e) => {
            e.stopPropagation();
            setEditingName(true);
          }}
        >
          <IconEdit />
        </button>

        {/* Tag */}
        <button
          className="drawing-card-action-btn"
          title="Edit tags"
          onClick={(e) => {
            e.stopPropagation();
            setEditingTags((v) => !v);
          }}
          style={{
            fontSize: "0.625rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          #
        </button>

        {/* Move to collection */}
        {collections.length > 0 && (
          <div
            ref={colMenuRef}
            className="dashboard-sort-wrapper"
            style={{ position: "relative" }}
          >
            <button
              className="drawing-card-action-btn"
              title="Move to collection"
              onClick={(e) => {
                e.stopPropagation();
                setShowColMenu((v) => !v);
              }}
            >
              <IconFolder />
            </button>
            {showColMenu && (
              <div
                className="drawing-card-collection-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={`drawing-card-col-menu-item${
                    drawing.collectionId === null ? " active" : ""
                  }`}
                  onClick={() => {
                    onAssignCollection(drawing.id, null);
                    setShowColMenu(false);
                  }}
                >
                  No collection
                </button>
                {collections.map((col) => (
                  <button
                    key={col.id}
                    className={`drawing-card-col-menu-item${
                      drawing.collectionId === col.id ? " active" : ""
                    }`}
                    onClick={() => {
                      onAssignCollection(drawing.id, col.id);
                      setShowColMenu(false);
                    }}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete */}
        <button
          className="drawing-card-action-btn danger"
          title="Delete"
          style={{ marginLeft: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${drawing.name}"?`)) {
              onDelete(drawing.id);
            }
          }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

interface DashboardProps {
  onOpenEditor: () => void;
}

export function Dashboard({ onOpenEditor }: DashboardProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [drawings, setDrawings] = useState<DrawingMeta[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(
    "all",
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNewColInput, setShowNewColInput] = useState(false);
  const [newColName, setNewColName] = useState("");
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const newColInputRef = useRef<HTMLInputElement>(null);

  // Theme: read from localStorage to apply dark mode class
  const [isDark] = useState(() => {
    const theme = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_THEME);
    if (theme === "dark") {
      return true;
    }
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    adoptExistingSceneIfNeeded();
    setDrawings(getDrawings());
    setCollections(getCollections());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Close sort menu on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!showSortMenu) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (!sortMenuRef.current?.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

  // Focus new col input when shown
  useEffect(() => {
    if (showNewColInput) {
      newColInputRef.current?.focus();
    }
  }, [showNewColInput]);

  // ── Drawing actions ───────────────────────────────────────────────────────
  const handleOpenDrawing = useCallback(
    (id: string) => {
      loadDrawingToEditor(id);
      onOpenEditor();
    },
    [onOpenEditor],
  );

  const handleNewDrawing = useCallback(() => {
    newDrawingForEditor(
      "Untitled",
      activeCollection !== "all" ? activeCollection : null,
    );
    onOpenEditor();
  }, [onOpenEditor, activeCollection]);

  const handleRename = useCallback((id: string, name: string) => {
    updateDrawingMeta(id, { name });
    setDrawings(getDrawings());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteDrawing(id);
    setDrawings(getDrawings());
  }, []);

  const handleAssignCollection = useCallback(
    (drawingId: string, collectionId: string | null) => {
      updateDrawingMeta(drawingId, { collectionId });
      setDrawings(getDrawings());
    },
    [],
  );

  const handleTagsChange = useCallback((id: string, tags: string[]) => {
    updateDrawingMeta(id, { tags });
    setDrawings(getDrawings());
  }, []);

  // ── Collection actions ────────────────────────────────────────────────────
  const handleCreateCollection = useCallback(() => {
    const name = newColName.trim();
    if (!name) {
      return;
    }
    createCollection(name);
    setCollections(getCollections());
    setNewColName("");
    setShowNewColInput(false);
  }, [newColName]);

  const handleDeleteCollection = useCallback(
    (id: string) => {
      if (!confirm("Delete this collection? Drawings will be unassigned.")) {
        return;
      }
      deleteCollection(id);
      setCollections(getCollections());
      setDrawings(getDrawings());
      if (activeCollection === id) {
        setActiveCollection("all");
      }
    },
    [activeCollection],
  );

  // ── Filtered & sorted drawings ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = drawings;

    // Filter by collection
    if (activeCollection !== "all") {
      list = list.filter((d) => d.collectionId === activeCollection);
    }

    // Filter by search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sort
    const sorted = [...list];
    if (sort === "recent") {
      sorted.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    } else if (sort === "mostOpened") {
      sorted.sort((a, b) => b.openedCount - a.openedCount);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [drawings, activeCollection, query, sort]);

  // Recent: top-5 by openedCount (across all collections, no search filter)
  const recent = useMemo(() => {
    return [...drawings]
      .sort((a, b) => b.openedCount - a.openedCount)
      .slice(0, 5);
  }, [drawings]);

  const showRecent =
    activeCollection === "all" && !query.trim() && recent.length > 0;

  const SORT_LABELS: Record<SortOption, string> = {
    recent: "Most recent",
    mostOpened: "Most opened",
    alphabetical: "Alphabetical",
  };

  const cardProps = {
    collections,
    onOpen: handleOpenDrawing,
    onRename: handleRename,
    onDelete: handleDelete,
    onAssignCollection: handleAssignCollection,
    onTagsChange: handleTagsChange,
  };

  return (
    <div className={`excalidraw dashboard${isDark ? " theme--dark" : ""}`}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-brand">
          <IconExcalidraw />
          Excalidraw
        </div>

        <nav className="dashboard-sidebar-nav">
          <button
            className={`dashboard-sidebar-item${
              activeCollection === "all" ? " active" : ""
            }`}
            onClick={() => setActiveCollection("all")}
          >
            All drawings
            <span className="dashboard-sidebar-item-count">
              {drawings.length}
            </span>
          </button>

          {collections.length > 0 && (
            <div className="dashboard-sidebar-section-title">Collections</div>
          )}

          {collections.map((col) => {
            const count = drawings.filter(
              (d) => d.collectionId === col.id,
            ).length;
            return (
              <div key={col.id} className="dashboard-sidebar-collection-row">
                <button
                  className={`dashboard-sidebar-item${
                    activeCollection === col.id ? " active" : ""
                  }`}
                  onClick={() => setActiveCollection(col.id)}
                >
                  <span>{col.name}</span>
                  <span className="dashboard-sidebar-item-count">{count}</span>
                </button>
                <button
                  className="dashboard-sidebar-delete-col"
                  title="Delete collection"
                  onClick={() => handleDeleteCollection(col.id)}
                >
                  <IconClose />
                </button>
              </div>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-footer">
          {showNewColInput ? (
            <div className="dashboard-new-col-input">
              <input
                ref={newColInputRef}
                value={newColName}
                placeholder="Collection name…"
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateCollection();
                  }
                  if (e.key === "Escape") {
                    setShowNewColInput(false);
                    setNewColName("");
                  }
                }}
              />
              <button onClick={handleCreateCollection} title="Create">
                <IconPlus />
              </button>
              <button
                onClick={() => {
                  setShowNewColInput(false);
                  setNewColName("");
                }}
                title="Cancel"
              >
                <IconClose />
              </button>
            </div>
          ) : (
            <button
              className="dashboard-sidebar-new-collection"
              onClick={() => setShowNewColInput(true)}
            >
              <IconPlus />
              New collection
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="dashboard-main">
        {/* Toolbar */}
        <div className="dashboard-toolbar">
          <div className="dashboard-search">
            <IconSearch />
            <input
              placeholder="Search by name or tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  display: "flex",
                  color: "inherit",
                  padding: 0,
                }}
                onClick={() => setQuery("")}
              >
                <IconClose />
              </button>
            )}
          </div>

          <div className="dashboard-sort-wrapper" ref={sortMenuRef}>
            <button
              className="dashboard-sort-btn"
              onClick={() => setShowSortMenu((v) => !v)}
            >
              <IconSort />
              {SORT_LABELS[sort]}
            </button>
            {showSortMenu && (
              <div className="dashboard-sort-menu">
                {(["recent", "mostOpened", "alphabetical"] as SortOption[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      className={`dashboard-sort-menu-item${
                        sort === opt ? " active" : ""
                      }`}
                      onClick={() => {
                        setSort(opt);
                        setShowSortMenu(false);
                      }}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <button className="dashboard-new-btn" onClick={handleNewDrawing}>
            <IconPlus />
            New drawing
          </button>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {/* Recent section */}
          {showRecent && (
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2>Recent</h2>
                <span>top {recent.length}</span>
              </div>
              <div className="dashboard-cards-row">
                {recent.map((d) => (
                  <DrawingCard key={d.id} drawing={d} {...cardProps} />
                ))}
              </div>
            </section>
          )}

          {/* All / filtered section */}
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>
                {activeCollection === "all"
                  ? "All drawings"
                  : collections.find((c) => c.id === activeCollection)?.name ??
                    "Collection"}
              </h2>
              <span>{filtered.length}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="dashboard-empty">
                <IconCanvas />
                <p>
                  {query
                    ? "No drawings match your search."
                    : "No drawings here yet."}
                </p>
                {!query && (
                  <small>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-primary, #6965db)",
                        font: "inherit",
                        fontSize: "0.8125rem",
                        padding: 0,
                      }}
                      onClick={handleNewDrawing}
                    >
                      Create your first drawing →
                    </button>
                  </small>
                )}
              </div>
            ) : (
              <div className="dashboard-cards-grid">
                {filtered.map((d) => (
                  <DrawingCard key={d.id} drawing={d} {...cardProps} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
