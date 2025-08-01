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
    description: `OpenRouter's new stealth model.`,
    api_sdk: openrouter('openrouter/horizon-alpha:nitro'),
    features: [TOOL_CALLING_FEATURE],
  },
];
