// Search provider interfaces and types
export interface SearchAdapter {
  readonly name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface SearchResult {
  url: string;
  title: string;
  description: string;
  content?: string;
  markdown?: string;
}

export interface SearchOptions {
  maxResults?: number;
  scrapeContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
}

export type SearchProvider = 'exa' | 'tavily' | 'brave';

// Provider-specific limits from documentation
export const PROVIDER_LIMITS = {
  exa: { maxResults: 10, maxChunks: 3 },
  tavily: { maxResults: 20, maxChunks: 8 },
  brave: { maxResults: 20, maxChunks: 3 }
} as const;

// Search configuration
export const SEARCH_CONFIG = {
  defaultProvider: (process.env.DEFAULT_SEARCH_PROVIDER || 'brave') as SearchProvider,
  maxResults: 3,
  scrapeContent: true,
  maxTextCharacters: 500,
}; 