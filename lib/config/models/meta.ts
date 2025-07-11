import { openrouter } from "@openrouter/ai-sdk-provider"
import { FILE_UPLOAD_FEATURE, PDF_PROCESSING_FEATURE, REASONING_FEATURE_DISABLED } from "../features"

export const META_MODELS = [
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick",
    provider: "meta",
    premium: false,
    usesPremiumCredits: false,
    description: `Meta's first natively multimodal model with 400B parameters.\\nOffers industry-leading 10M token context window.`,
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
    description: `Efficient multimodal model fitting on single H100 GPU.\\nBest-in-class performance with 17B active parameters.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      FILE_UPLOAD_FEATURE,
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      REASONING_FEATURE_DISABLED,
    ],
    api_sdk: openrouter("meta-llama/llama-4-scout:free"),
  },
]