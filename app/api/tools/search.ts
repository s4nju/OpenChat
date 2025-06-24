import { tool } from "ai";
import { z } from "zod";
import { SearchProviderFactory } from './search-provider-factory';
import { SearchOptions, SearchResult } from './types';

// Result processing utilities
export const truncateContent = (content: string, maxLength: number = 500): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + '...';
};

export const formatMarkdown = (result: SearchResult): string => {
  let markdown = `### [${result.title}](${result.url})\n${result.description}`;
  
  if (result.content) {
    const truncatedContent = truncateContent(result.content);
    markdown += `\n\n> ${truncatedContent}`;
  }
  
  return markdown;
};

export const processResults = (results: SearchResult[]): SearchResult[] => {
  return results.map(result => ({
    ...result,
    content: result.content ? truncateContent(result.content) : undefined,
    markdown: result.markdown || formatMarkdown(result)
  }));
};

// Main search tool
export const searchTool = tool({
  description: "Search the web for current information and facts. Use this when you need to verify current facts, find recent events, or get real-time data.",
  parameters: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().default(3).describe("Maximum number of results to return"),
    scrapeContent: z.boolean().optional().default(false).describe("Whether to include scraped content from the pages"),
    includeDomains: z.array(z.string()).optional().describe("List of domains to include in search"),
    excludeDomains: z.array(z.string()).optional().describe("List of domains to exclude from search"),
    startPublishedDate: z.string().optional().describe("Start date for published results (YYYY-MM-DD)"),
    endPublishedDate: z.string().optional().describe("End date for published results (YYYY-MM-DD)")
  }),
  execute: async ({ 
    query, 
    maxResults, 
    scrapeContent,
    includeDomains,
    excludeDomains,
    startPublishedDate,
    endPublishedDate 
  }) => {
    const options: SearchOptions = {
      maxResults,
      scrapeContent,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate
    };

    try {
      // Try primary provider first, then fallback to others if needed
      const results = await SearchProviderFactory.searchWithFallback(query, options);
      const processedResults = processResults(results);
      
      return {
        success: true,
        query,
        results: processedResults,
        count: processedResults.length
      };
    } catch (error) {
      // Return error response that can be handled gracefully
      return {
        success: false,
        query,
        results: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
}); 