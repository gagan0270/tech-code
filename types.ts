
export interface GroundingSource {
  title: string;
  uri: string;
}

export interface EditRecord {
  prompt: string;
  timestamp: number;
  code: string;
}

export interface GeneratedSite {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
  sources?: GroundingSource[];
}

export type ViewMode = 'desktop' | 'mobile';

export interface AppState {
  currentSite: GeneratedSite | null;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
}
