import { fal } from "@ai-sdk/fal"
import { IMAGE_GENERATION_FEATURE } from "../features"

export const FAL_MODELS = [
  {
    id: "flux-schnell",
    name: "Flux Schnell",
    provider: "fal",
    premium: true,
    usesPremiumCredits: true,
    description: `Fast and efficient image generation model from Fal.ai.\\nOptimized for quick image creation with good quality.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      IMAGE_GENERATION_FEATURE,
    ],
    api_sdk: fal.image("fal-ai/flux/schnell"),
  },
]