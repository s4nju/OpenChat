import { xai } from '@ai-sdk/xai';
import {
  REASONING_FEATURE_BASIC,
  REASONING_FEATURE_DISABLED,
  TOOL_CALLING_FEATURE,
} from '../features';

export const XAI_MODELS = [
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    premium: true,
    usesPremiumCredits: true,
    description: `xAI's flagship model.\nFeatures real-time X data access.`,
    api_sdk: xai('grok-3-latest'),
    features: [REASONING_FEATURE_DISABLED],
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xai',
    premium: true,
    usesPremiumCredits: false,
    description:
      'Cost-efficient reasoning model from xAI.\nExcels at STEM tasks requiring less world knowledge.',
    api_sdk: xai('grok-3-mini'),
    features: [REASONING_FEATURE_BASIC, TOOL_CALLING_FEATURE],
  },
];
