import { openrouter } from "@openrouter/ai-sdk-provider"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { REASONING_FEATURE_BASIC } from "../features"

const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
})

export const DEEPSEEK_MODELS = [
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek V3 0324",
    provider: "deepseek",
    premium: false,
    usesPremiumCredits: false,
    description: `Early DeepSeek release for experimentation.\\nFocuses on research-friendly output.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    api_sdk: openrouter("deepseek/deepseek-chat-v3-0324:free"),
    features: [
      { id: "file-upload", enabled: false },
    ],
  },
  {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1 (0528)",
    provider: "deepseek",
    premium: false,
    usesPremiumCredits: false,
    description: `Stable release with reasoning enabled.\\nRecommended for developers exploring new features.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: false },
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      REASONING_FEATURE_BASIC,
    ],
    api_sdk: nim("deepseek-ai/deepseek-r1-0528"),
  },
  {
    id: "deepseek/deepseek-r1-distill-llama-70b:free",
    name: "DeepSeek R1 (Llama Distilled)",
    provider: "deepseek",
    premium: true,
    usesPremiumCredits: false,
    description: `Llama-distilled variant with enhanced reasoning.\\nOptimized for efficiency while maintaining quality.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: false },
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      REASONING_FEATURE_BASIC,
    ],
    api_sdk: openrouter("deepseek/deepseek-r1-distill-llama-70b:free"),
  },
]