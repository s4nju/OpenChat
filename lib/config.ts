import type { Doc } from "@/convex/_generated/dataModel"
import { google } from "@ai-sdk/google"
import { groq } from "@ai-sdk/groq"
import { mistral } from "@ai-sdk/mistral"
import { anthropic } from "@ai-sdk/anthropic"
// import { openrouter } from "@openrouter/ai-sdk-provider"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { togetherai } from "@ai-sdk/togetherai"
import { DeepSeek, Gemini, GrokDark, GrokLight, MistralAI, OpenAIDark, OpenAILight, Meta, QwenLight, AnthropicDark, AnthropicLight } from "@ridemountainpig/svgl-react"
import {
  BookOpenTextIcon,
  BrainIcon,
  CodeIcon,
  DetectiveIcon,
  LightbulbIcon,
  NotepadIcon,
  PaintBrushIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr"
import { extractReasoningMiddleware, wrapLanguageModel } from "ai"
import { z } from "zod"

const reasoningMiddleware = extractReasoningMiddleware({ tagName: "think" })

const chutes = createOpenAI({
  // custom settings, e.g.
  // compatibility: 'strict', // strict mode, enable when using the OpenAI API
  baseURL: "https://llm.chutes.ai/v1/",
  apiKey: process.env.CHUTES_API_KEY,
  headers: {
    Authorization: `Bearer ${process.env.CHUTES_API_KEY}`,
    "Content-Type": "application/json",
  },
  // other options...
})

const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
})

export const PREMIUM_CREDITS = 100
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5

const ModelFeatureSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  label: z.string().optional(),
  supportsEffort: z.boolean().optional(),
})

const ApiKeyUsageSchema = z.object({
  allowUserKey: z.boolean(),
  userKeyOnly: z.boolean(),
})

const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  api_sdk: z.any().optional(),
  premium: z.boolean(),
  usesPremiumCredits: z.boolean(),
  features: z.array(ModelFeatureSchema).default([]),
  apiKeyUsage: ApiKeyUsageSchema.default({
    allowUserKey: false,
    userKeyOnly: false,
  }),
})

export type Model = z.infer<typeof ModelSchema>

// User-facing model definitions.
// To-do: Review each model to ensure all configurations (premium, features, etc.) are correct.
export const MODELS_DATA = [
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "grok",
    premium: true,
    usesPremiumCredits: true,
    api_sdk: groq("grok-3-latest"),
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    premium: true,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("gpt-4o"),
  },
    {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("gpt-4o-mini"),
  },
  {
    id: "o4-mini",
    name: "o4 Mini",
    provider: "openai",
    premium: true,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("o4-mini"),
  },
    {
    id: "o3",
    name: "o3",
    provider: "openai",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("o3"),
  },
  {
    id: "o3-pro",
    name: "o3 Pro",
    provider: "openai",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("o3-pro"),
  },
    {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    premium: true,
    usesPremiumCredits: false,
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("gpt-4.1"),
  },
    {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    premium: false,
    usesPremiumCredits: false,
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("gpt-4.1-mini"),
  },
    {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    premium: false,
    usesPremiumCredits: false,
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("gpt-4.1-nano"),
  },
    {
    id: "gpt-4.5",
    name: "GPT-4.5",
    provider: "openai",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: openai("gpt-4.5"),
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: anthropic("claude-3-5-sonnet-20241022"),
  },
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: anthropic("claude-3-7-sonnet-20250219"),
  },
  {
    id: "claude-3-7-sonnet-reasoning",
    name: "Claude 3.7 Sonnet (Reasoning)",
    provider: "anthropic",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
    ],
    api_sdk: anthropic("claude-3-7-sonnet-20250219"),
  },
  {
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    provider: "anthropic",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
    ],
    api_sdk: anthropic("claude-opus-4-20250514"),
  },
  {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    provider: "anthropic",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: anthropic("claude-sonnet-4-20250514"),
  },
  {
    id: "claude-4-sonnet-reasoning",
    name: "Claude 4 Sonnet (Reasoning)",
    provider: "anthropic",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
    ],
    api_sdk: anthropic("claude-sonnet-4-20250514"),
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    api_sdk: google("gemini-2.0-flash"),
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
      { id: "web-search", enabled: true, label: "Supports web search" },
    ],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    premium: true,
    usesPremiumCredits: true,
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: true, label: "Supports reasoning capabilities" },
      { id: "web-search", enabled: true, label: "Supports web search" },
    ],
    api_sdk: google("gemini-2.5-pro"),
  },
  {
    id: "Llama-4-Maverick-17B-128E-Instruct-FP8",
    name: "Llama 4 Maverick",
    provider: "meta",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: togetherai("meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"),
  },
  {
    id: "Llama-4-Scout-17B-16E-Instruct",
    name: "Llama 4 Scout",
    provider: "meta",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
  },
  {
    id: "pixtral-large-latest",
    name: "Pixtral Large",
    provider: "mistral",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: true },
      { id: "pdf-processing", enabled: true, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: mistral("pixtral-large-latest"),
    icon: MistralAI,
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: false },
    ],
    api_sdk: mistral("mistral-large-latest"),
  },
  {
    id: "deepseek-ai/DeepSeek-V3-0324",
    name: "DeepSeek V3 0324",
    provider: "deepseek",
    premium: false,
    usesPremiumCredits: false,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    api_sdk: chutes("deepseek-ai/DeepSeek-V3-0324"),
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
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      { id: "file-upload", enabled: false },
      { id: "pdf-processing", enabled: false, label: "Supports PDF uploads and analysis" },
      { id: "reasoning", enabled: true, supportsEffort: false, label: "Supports reasoning capabilities" },
    ],
    api_sdk: nim("deepseek-ai/deepseek-r1-0528"),
  },
  // {
  //   id: "qwen/qwq-32b:free",
  //   name: "QWEN 32B",
  //   provider: "Qwen",
  //   apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
  //   features: [
  //     {
  //       id: "file-upload",
  //       enabled: false,
  //     },
  //   ],
  //   api_sdk: openrouter("qwen/qwq-32b:free"),
  // },
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
);

export const MODELS_OPTIONS = MODELS

export type Provider = {
  id: string
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  icon_light?: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export const PROVIDERS = [
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: DeepSeek,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: Gemini,
  },
  {
    id: "grok",
    name: "Grok",
    icon: GrokDark,
    icon_light: GrokLight,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: DetectiveIcon,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: OpenAIDark,
    icon_light: OpenAILight,
  },
  {
    id: "anthropic",
    name: "Claude",
    icon: AnthropicDark,
    icon_light: AnthropicLight,
  },
  {
    id: "mistral",
    name: "Mistral",
    icon: MistralAI,
  },
  {
    id: "meta",
    name: "Meta",
    icon: Meta,
  },
  {
    id: "Qwen",
    name: "Qwen",
    icon: QwenLight,
  },
] as Provider[]

export const PROVIDERS_OPTIONS = PROVIDERS

export const MODEL_DEFAULT = "gemini-2.0-flash"

export const APP_NAME = "OpenChat "
export const APP_DOMAIN = "https://chat.ajanraj.com"
export const APP_DESCRIPTION =
  "OpenChat is a AI chat app with multi-model support."
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export const SUGGESTIONS = [
  {
    label: "Summary",
    highlight: "Summarize",
    prompt: `Summarize`,
    items: [
      "Summarize the French Revolution",
      "Summarize the plot of Inception",
      "Summarize World War II in 5 sentences",
      "Summarize the benefits of meditation",
    ],
    icon: NotepadIcon,
  },
  {
    label: "Code",
    highlight: "Help me",
    prompt: `Help me`,
    items: [
      "Help me write a function to reverse a string in JavaScript",
      "Help me create a responsive navbar in HTML/CSS",
      "Help me write a SQL query to find duplicate emails",
      "Help me convert this Python function to JavaScript",
    ],
    icon: CodeIcon,
  },
  {
    label: "Design",
    highlight: "Design",
    prompt: `Design`,
    items: [
      "Design a color palette for a tech blog",
      "Design a UX checklist for mobile apps",
      "Design 5 great font pairings for a landing page",
      "Design better CTAs with useful tips",
    ],
    icon: PaintBrushIcon,
  },
  {
    label: "Research",
    highlight: "Research",
    prompt: `Research`,
    items: [
      "Research the pros and cons of remote work",
      "Research the differences between Apple Vision Pro and Meta Quest",
      "Research best practices for password security",
      "Research the latest trends in renewable energy",
    ],
    icon: BookOpenTextIcon,
  },
  {
    label: "Get inspired",
    highlight: "Inspire me",
    prompt: `Inspire me`,
    items: [
      "Inspire me with a beautiful quote about creativity",
      "Inspire me with a writing prompt about solitude",
      "Inspire me with a poetic way to start a newsletter",
      "Inspire me by describing a peaceful morning in nature",
    ],
    icon: SparkleIcon,
  },
  {
    label: "Think deeply",
    highlight: "Reflect on",
    prompt: `Reflect on`,
    items: [
      "Reflect on why we fear uncertainty",
      "Reflect on what makes a conversation meaningful",
      "Reflect on the concept of time in a simple way",
      "Reflect on what it means to live intentionally",
    ],
    icon: BrainIcon,
  },
  {
    label: "Learn gently",
    highlight: "Explain",
    prompt: `Explain`,
    items: [
      "Explain quantum physics like I'm 10",
      "Explain stoicism in simple terms",
      "Explain how a neural network works",
      "Explain the difference between AI and AGI",
    ],
    icon: LightbulbIcon,
  },
]

export const MESSAGE_MAX_LENGTH = 4000
