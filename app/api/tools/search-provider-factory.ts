import { SearchAdapter, SearchProvider, SEARCH_CONFIG, SearchOptions, SearchResult } from './types';
import { BraveSearchProvider } from './providers/brave-search';
import { TavilySearchProvider } from './providers/tavily-search';
import { ExaSearchProvider } from './providers/exa-search';

export class SearchProviderFactory {
  private static instances: Map<SearchProvider, SearchAdapter> = new Map();

  static getProvider(provider?: SearchProvider): SearchAdapter {
    const selectedProvider = provider || SEARCH_CONFIG.defaultProvider;
    
    // Check if we already have an instance
    const existingInstance = this.instances.get(selectedProvider);
    if (existingInstance) {
      return existingInstance;
    }

    // Create new instance based on provider type
    let instance: SearchAdapter;
    
    switch (selectedProvider) {
      case 'brave':
        const braveKey = process.env.BRAVE_API_KEY;
        if (!braveKey) {
          throw new Error('BRAVE_API_KEY environment variable is not set');
        }
        instance = new BraveSearchProvider(braveKey);
        break;
        
      case 'tavily':
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
          throw new Error('TAVILY_API_KEY environment variable is not set');
        }
        instance = new TavilySearchProvider(tavilyKey);
        break;
        
      case 'exa':
        const exaKey = process.env.EXA_API_KEY;
        if (!exaKey) {
          throw new Error('EXA_API_KEY environment variable is not set');
        }
        instance = new ExaSearchProvider(exaKey);
        break;
        
      default:
        throw new Error(`Unknown search provider: ${selectedProvider}`);
    }

    // Cache the instance
    this.instances.set(selectedProvider, instance);
    return instance;
  }

  static async searchWithFallback(
    query: string,
    options?: SearchOptions,
    providers?: SearchProvider[]
  ): Promise<SearchResult[]> {
    let lastError: Error | null = null;

    // If no providers specified, create a smart fallback order starting with default
    if (!providers) {
      const defaultProvider = SEARCH_CONFIG.defaultProvider;
      const allProviders: SearchProvider[] = ['brave', 'tavily', 'exa'];
      
      // Start with default provider, then add others
      providers = [defaultProvider, ...allProviders.filter(p => p !== defaultProvider)];
    }

    for (const provider of providers) {
      try {
        // Check if API key exists before attempting to create provider
        const hasApiKey = this.hasApiKey(provider);
        if (!hasApiKey) {
          continue;
        }

        const adapter = this.getProvider(provider);
        return await adapter.search(query, options);
      } catch (error) {
        lastError = error as Error;
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(
      `All search providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  private static hasApiKey(provider: SearchProvider): boolean {
    switch (provider) {
      case 'brave':
        return !!process.env.BRAVE_API_KEY;
      case 'tavily':
        return !!process.env.TAVILY_API_KEY;
      case 'exa':
        return !!process.env.EXA_API_KEY;
      default:
        return false;
    }
  }
} 