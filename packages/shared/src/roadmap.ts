export type RoadmapEntryKind = 'flow' | 'pillar';

export interface RoadmapLink {
  label: string;
  path: string;
}

export interface RoadmapEntry {
  id: string;
  slug: string;
  kind: RoadmapEntryKind;
  sortOrder: number;
  title: string;
  summary: string;
  description: string;
  statusLabel: string | null;
  icon: string;
  featured: boolean;
  links: RoadmapLink[];
}

export interface RoadmapResponse {
  entries: RoadmapEntry[];
  updatedAt: string | null;
}

export type RoadmapEntryInput = Omit<RoadmapEntry, 'id'> & { id?: string };

export interface RoadmapUpdateRequest {
  expectedUpdatedAt: string | null;
  entries: RoadmapEntryInput[];
}
