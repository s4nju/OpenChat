import { xai } from "@ai-sdk/xai"
import { FILE_UPLOAD_FEATURE, PDF_PROCESSING_FEATURE, REASONING_FEATURE_DISABLED, REASONING_FEATURE } from "../features"

export const GROK_MODELS = [
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "xai",
    premium: true,
    usesPremiumCredits: true,
    description: `High-performance model for fast responses.\\nUseful for a wide range of tasks.`,
    api_sdk: xai("grok-3-latest"),
    features: [
      FILE_UPLOAD_FEATURE,
      PDF_PROCESSING_FEATURE,
      REASONING_FEATURE_DISABLED,
    ],
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    provider: "xai",
    premium: true,
    usesPremiumCredits: false,
    description: `Efficient and fast model with reasoning capabilities.\\nOptimized for cost-effective performance.`,
    api_sdk: xai("grok-3-mini"),
    features: [
      FILE_UPLOAD_FEATURE,
      PDF_PROCESSING_FEATURE,
      REASONING_FEATURE,
    ],
  },
]