import { openrouter } from "@openrouter/ai-sdk-provider"
import { FILE_UPLOAD_FEATURE, PDF_PROCESSING_FEATURE, REASONING_FEATURE_DISABLED } from "../features"

export const META_MODELS = [
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick",
    provider: "meta",
    premium: false,
    usesPremiumCredits: false,
    description: `Meta's efficient open model for experimentation.\\nProvides image support with good speed.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      FILE_UPLOAD_FEATURE,
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      REASONING_FEATURE_DISABLED,
    ],
    api_sdk: openrouter("meta-llama/llama-4-maverick:free"),
  },
  {
    id: "meta-llama/llama-4-scout:free",
    name: "Llama 4 Scout",
    provider: "meta",
    premium: false,
    usesPremiumCredits: false,
    description: `Optimized for lower resource usage.\\nA good fit for cost-effective deployments.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      FILE_UPLOAD_FEATURE,
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      REASONING_FEATURE_DISABLED,
    ],
    api_sdk: openrouter("meta-llama/llama-4-scout:free"),
  },
]