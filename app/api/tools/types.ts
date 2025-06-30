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
  brave: { maxResults: 20, maxChunks: 3 },
} as const;

// Validation function to ensure environment variable is a valid SearchProvider
function isValidSearchProvider(
  value: string | undefined
): value is SearchProvider {
  return value === 'exa' || value === 'tavily' || value === 'brave';
}

// Get validated search provider from environment variable
function getValidatedSearchProvider(): SearchProvider {
  const envProvider = process.env.DEFAULT_SEARCH_PROVIDER;
  return isValidSearchProvider(envProvider) ? envProvider : 'brave';
}

// Search configuration
export const SEARCH_CONFIG = {
  defaultProvider: getValidatedSearchProvider(),
  maxResults: 3,
  scrapeContent: true,
  maxTextCharacters: 500,
};
