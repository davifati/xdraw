export interface DrawingMeta {
  id: string;
  name: string;
  tags: string[];
  collectionId: string | null;
  openedCount: number;
  lastOpenedAt: number;
  updatedAt: number;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
}

export type SortOption = "recent" | "mostOpened" | "alphabetical";
