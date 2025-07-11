import { groq } from "@ai-sdk/groq"
import { FILE_UPLOAD_FEATURE, PDF_PROCESSING_FEATURE, REASONING_FEATURE_DISABLED } from "../features"

export const GROK_MODELS = [
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "grok",
    premium: true,
    usesPremiumCredits: true,
    description: `High-performance model for fast responses.\\nUseful for a wide range of tasks.`,
    api_sdk: groq("grok-3-latest"),
    features: [
      FILE_UPLOAD_FEATURE,
      PDF_PROCESSING_FEATURE,
      REASONING_FEATURE_DISABLED,
    ],
  },
]