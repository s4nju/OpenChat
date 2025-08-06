import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { REASONING_FEATURE_BASIC, TOOL_CALLING_FEATURE } from '../features';
import { openrouter } from '../openrouter';

const nim = createOpenAICompatible({
  name: 'nim',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
});

export const DEEPSEEK_MODELS = [
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek V3 0324',
    provider: 'openrouter',
    displayProvider: 'deepseek',
    premium: false,
    usesPremiumCredits: false,
    description: `DeepSeek's experimental chat model for research exploration.\nProvides cost-effective access to DeepSeek capabilities.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    api_sdk: openrouter('deepseek/deepseek-chat-v3-0324:free'),
    features: [TOOL_CALLING_FEATURE],
  },
  {
    id: 'deepseek-r1-0528',
    name: 'DeepSeek R1 (0528)',
    provider: 'deepseek',
    premium: false,
    usesPremiumCredits: false,
    description:
      'Reasoning model which rocked the world.\nExcels at mathematical reasoning and competitive programming.',
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [REASONING_FEATURE_BASIC],
    api_sdk: nim('deepseek-ai/deepseek-r1-0528'),
  },
  {
    id: 'deepseek/deepseek-r1-distill-llama-70b:free',
    name: 'DeepSeek R1',
    subName: 'Llama Distilled',
    provider: 'openrouter',
    displayProvider: 'deepseek',
    premium: true,
    usesPremiumCredits: false,
    description:
      'Llama-distilled reasoning model optimized for efficiency.\nCombines DeepSeek R1 capabilities with improved performance.',
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [REASONING_FEATURE_BASIC],
    api_sdk: openrouter('deepseek/deepseek-r1-distill-llama-70b:free'),
  },
];
