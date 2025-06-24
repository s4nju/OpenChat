import { SearchAdapter, SearchOptions, SearchResult, PROVIDER_LIMITS } from '../types';
import Exa from "exa-js";

export class ExaSearchProvider implements SearchAdapter {
  readonly name = 'exa';
  private client: Exa;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Exa Search API key is required');
    }
    this.client = new Exa(apiKey);
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { 
      maxResults = 3, 
      scrapeContent = false,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate
    } = options;

    const limit = Math.min(maxResults, PROVIDER_LIMITS.exa.maxResults);

    try {
      const searchOptions: Record<string, unknown> = {
        numResults: limit,
        type: "auto",
      };

      // Add text content if scraping is enabled
      if (scrapeContent) {
        searchOptions.text = {
          maxCharacters: 500
        };
      }

      // Add domain filters
      if (includeDomains && includeDomains.length > 0) {
        searchOptions.includeDomains = includeDomains;
      }
      if (excludeDomains && excludeDomains.length > 0) {
        searchOptions.excludeDomains = excludeDomains;
      }

      // Add date filters
      if (startPublishedDate) {
        searchOptions.startPublishedDate = startPublishedDate;
      }
      if (endPublishedDate) {
        searchOptions.endPublishedDate = endPublishedDate;
      }

      const result = await this.client.search(query, searchOptions);
      
      return this.formatResults(result.results || [], scrapeContent);
    } catch (error) {
      throw new Error(
        `Failed to search with Exa: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private formatResults(results: unknown[], includeContent: boolean): SearchResult[] {
    return results.map((result: unknown) => {
      const item = result as {
        url?: string;
        title?: string;
        snippet?: string;
        text?: string;
      };
      
      return {
        url: item.url || '',
        title: item.title || '',
        description: item.snippet || '',
        content: includeContent && item.text ? item.text : undefined,
        markdown: this.formatMarkdown(item, includeContent),
      };
    });
  }

  private formatMarkdown(result: unknown, includeContent: boolean): string {
    const item = result as {
      url?: string;
      title?: string;
      snippet?: string;
      text?: string;
    };
    
    let markdown = `### [${item.title || 'Untitled'}](${item.url || '#'})\n${item.snippet || ''}`;
    
    if (includeContent && item.text) {
      // Truncate content if too long
      const truncatedContent = item.text.length > 500 
        ? item.text.substring(0, 497) + '...' 
        : item.text;
      markdown += `\n\n> ${truncatedContent}`;
    }
    
    return markdown;
  }
} 