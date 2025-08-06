// import { groq } from '@ai-sdk/groq';

import { TOOL_CALLING_FEATURE } from '../features';
import { openrouter } from '../openrouter';

export const MOONSHOT_MODELS = [
  {
    id: 'moonshotai/kimi-k2',
    name: 'Kimi K2',
    provider: 'openrouter',
    displayProvider: 'moonshotai',
    premium: false,
    usesPremiumCredits: false,
    description: `Moonshot AI's Kimi K2 model.\nOffers agentic tools capabilities for various tasks.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [TOOL_CALLING_FEATURE],
    api_sdk: openrouter('moonshotai/kimi-k2:nitro'),
  },
];
