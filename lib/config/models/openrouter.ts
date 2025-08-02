import { TOOL_CALLING_FEATURE } from '../features';
import { openrouter } from '../openrouter';

export const OPENROUTER_MODELS = [
  {
    id: 'openrouter/horizon-alpha',
    name: 'Horizon Alpha',
    provider: 'openrouter',
    apiProvider: 'openrouter',
    premium: false,
    usesPremiumCredits: false,
    skipRateLimit: true,
    description: `OpenRouter's new stealth model.`,
    api_sdk: openrouter('openrouter/horizon-alpha:nitro'),
    features: [TOOL_CALLING_FEATURE],
  },
  {
    id: 'openrouter/horizon-beta',
    name: 'Horizon Beta',
    provider: 'openrouter',
    apiProvider: 'openrouter',
    premium: false,
    usesPremiumCredits: false,
    skipRateLimit: true,
    description: `OpenRouter's new stealth model. Improved version of Horizon Alpha with enhanced capabilities.`,
    api_sdk: openrouter('openrouter/horizon-beta:nitro'),
    features: [TOOL_CALLING_FEATURE],
  },
];
