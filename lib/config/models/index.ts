import { extractReasoningMiddleware, wrapLanguageModel } from "ai"
import { z } from "zod"
import { ModelSchema } from "../schemas"
import { OPENAI_MODELS } from "./openai"
import { ANTHROPIC_MODELS } from "./anthropic"
import { GOOGLE_MODELS } from "./google"
import { GROK_MODELS } from "./grok"
import { META_MODELS } from "./meta"
import { MISTRAL_MODELS } from "./mistral"
import { DEEPSEEK_MODELS } from "./deepseek"
import { FAL_MODELS } from "./fal"

const reasoningMiddleware = extractReasoningMiddleware({ tagName: "think" })

// Combine all models from different providers
export const MODELS_DATA = [
  ...GROK_MODELS,
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...META_MODELS,
  ...MISTRAL_MODELS,
  ...DEEPSEEK_MODELS,
  ...FAL_MODELS,
]

export const MODELS_RAW = z.array(ModelSchema).parse(MODELS_DATA)

export const MODELS = MODELS_RAW.map((m) => ({
  ...m,
  api_sdk: m.features?.some((f) => f.id === "reasoning" && f.enabled)
    ? wrapLanguageModel({ model: m.api_sdk, middleware: reasoningMiddleware })
    : m.api_sdk,
}))

// Add a map for O(1) lookup by id
export const MODELS_MAP: Record<string, typeof MODELS[0]> = Object.fromEntries(
  MODELS.map((model) => [model.id, model])
)

export const MODELS_OPTIONS = MODELS