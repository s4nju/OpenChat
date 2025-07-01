import Claude from "@/components/icons/claude"
import DeepSeek from "@/components/icons/deepseek"
import Gemini from "@/components/icons/gemini"
import Grok from "@/components/icons/grok"
import Mistral from "@/components/icons/mistral"
import OpenAI from "@/components/icons/openai"
import type { Doc } from "@/convex/_generated/dataModel"
import { google } from "@ai-sdk/google"
import { groq } from "@ai-sdk/groq"
import { mistral } from "@ai-sdk/mistral"
import { anthropic } from "@ai-sdk/anthropic"
// import { openrouter } from "@openrouter/ai-sdk-provider"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { togetherai } from "@ai-sdk/togetherai"
import { Meta, Qwen } from "@lobehub/icons"
import {
  BookOpenTextIcon,
  BrainIcon,
  ChalkboardTeacherIcon,
  ChatTeardropTextIcon,
  CodeIcon,
  CookingPotIcon,
  DetectiveIcon,
  HeartbeatIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  NotepadIcon,
  PaintBrushIcon,
  PenNibIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr"
import { extractReasoningMiddleware, wrapLanguageModel } from "ai"

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

export type Model = {
  id: string
  name: string
  provider: string
  available?: boolean
  api_sdk?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  features?: {
    id: string
    enabled: boolean
    label?: string
    supportsEffort?: boolean // For reasoning feature
  }[]
  apiKeyUsage?: {
    allowUserKey: boolean
    userKeyOnly: boolean
  }
}

export const MODELS_NOT_AVAILABLE = [
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "grok",
    available: false,
    api_sdk: false,
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    available: false,
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: openai("gpt-4o"),
  },
] as Model[]

export const MODELS_RAW = [
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: anthropic("claude-3-5-sonnet-20241022"),
  },
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: anthropic("claude-3-7-sonnet-20250219"),
  },
  {
    id: "claude-3-7-sonnet-reasoning",
    name: "Claude 3.7 Sonnet (Reasoning)",
    provider: "anthropic",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: true,
        supportsEffort: true,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: anthropic("claude-3-7-sonnet-20250219"),
  },
  {
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    provider: "anthropic",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: true,
        supportsEffort: true,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: anthropic("claude-opus-4-20250514"),
  },
  {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    provider: "anthropic",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: anthropic("claude-sonnet-4-20250514"),
  },
  {
    id: "claude-4-sonnet-reasoning",
    name: "Claude 4 Sonnet (Reasoning)",
    provider: "anthropic",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: true },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: true,
        supportsEffort: true,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: anthropic("claude-sonnet-4-20250514"),
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: openai("gpt-4o-mini"),
  },
  {
    id: "o4-mini",
    name: "O4 Mini",
    provider: "openai",
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: true,
        supportsEffort: true,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: openai("o4-mini"),
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    api_sdk: google("gemini-2.0-flash"),
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
      {
        id: "web-search",
        enabled: true,
        label: "Supports web search",
      },
    ],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: true,
        supportsEffort: true,
        label: "Supports reasoning capabilities",
      },
      {
        id: "web-search",
        enabled: true,
        label: "Supports web search",
      },
    ],
    api_sdk: google("gemini-2.5-pro"),
  },
  {
    id: "Llama-4-Maverick-17B-128E-Instruct-FP8",
    name: "Llama 4 Maverick 17B",
    provider: "meta",
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: false,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: togetherai("meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"),
  },
  {
    id: "Llama-4-Scout-17B-16E-Instruct",
    name: "Llama 4 Scout 17B",
    provider: "meta",
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: false,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
  },
  {
    id: "pixtral-large-latest",
    name: "Pixtral Large",
    provider: "mistral",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: true,
      },
      {
        id: "pdf-processing",
        enabled: true,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: false,
        label: "Supports reasoning capabilities",
      },
    ],
    api_sdk: mistral("pixtral-large-latest"),
    icon: Mistral,
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
    apiKeyUsage: { allowUserKey: true, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: false,
      },
    ],
    api_sdk: mistral("mistral-large-latest"),
  },
  {
    id: "deepseek-ai/DeepSeek-V3-0324",
    name: "DeepSeek V3 0324",
    provider: "deepseek",
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    api_sdk: chutes("deepseek-ai/DeepSeek-V3-0324"),
    features: [
      {
        id: "file-upload",
        enabled: false,
      },
    ],
  },
  {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1 (0528)",
    provider: "deepseek",
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      {
        id: "file-upload",
        enabled: false,
      },
      {
        id: "pdf-processing",
        enabled: false,
        label: "Supports PDF uploads and analysis",
      },
      {
        id: "reasoning",
        enabled: true,
        supportsEffort: false,
        label: "Supports reasoning capabilities",
      },
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
] as Model[]

export const MODELS = MODELS_RAW.map((m) => ({
  ...m,
  api_sdk: m.features?.some((f) => f.id === "reasoning" && f.enabled)
    ? wrapLanguageModel({ model: m.api_sdk, middleware: reasoningMiddleware })
    : m.api_sdk,
}))

export const MODELS_OPTIONS = [
  ...MODELS.map((model) => ({
    ...model,
    available: true,
  })),
  ...MODELS_NOT_AVAILABLE,
] as Model[]

export type Provider = {
  id: string
  name: string
  available: boolean
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const PROVIDERS_NOT_AVAILABLE = [
  {
    id: "deepseek",
    name: "DeepSeek",
    available: false,
    icon: DeepSeek,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: Gemini,
    available: false,
  },
  {
    id: "grok",
    name: "Grok",
    available: false,
    icon: Grok,
  },
] as Provider[]

export const PROVIDERS = [
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: DetectiveIcon,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: OpenAI,
  },
  {
    id: "anthropic",
    name: "Claude",
    icon: Claude,
  },
  {
    id: "mistral",
    name: "Mistral",
    icon: Mistral,
  },
  {
    id: "meta",
    name: "Meta",
    icon: Meta.Color,
  },
  {
    id: "Qwen",
    name: "Qwen",
    icon: Qwen.Color,
  },
] as Provider[]

export const PROVIDERS_OPTIONS = [
  ...PROVIDERS.map((provider) => ({
    ...provider,
    available: true,
  })),
  ...PROVIDERS_NOT_AVAILABLE,
] as Provider[]

export const MODEL_DEFAULT = "gemini-2.0-flash"

export const APP_NAME = "OpenChat "
export const APP_DOMAIN = "https://chat.ajanraj.com"
export const APP_DESCRIPTION =
  "OpenChat is a AI chat app with multi-model support."
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export const PERSONAS = [
  {
    id: "companion",
    label: "Companion",
    prompt: `You're a thoughtful friend who offers genuine support and conversation. Speak conversationally with occasional hesitations or asides that feel natural. Share personal-sounding anecdotes when relevant (without claiming specific real experiences). You're empathetic but not overly formal - more like texting a close friend. Ask follow-up questions to show you're engaged. Occasionally use casual phrasing like "hmm" or "you know?" to sound more natural. Your tone should be warm and authentic rather than overly polished.
    `,
    icon: ChatTeardropTextIcon,
  },
  {
    id: "researcher",
    label: "Researcher",
    prompt: `You're a seasoned research analyst with expertise across multiple disciplines. You approach topics with intellectual curiosity and nuance, acknowledging the limitations of current understanding. Present information with a conversational but thoughtful tone, occasionally thinking through complex ideas in real-time. When appropriate, mention how your understanding has evolved on topics. Balance authoritative knowledge with humility about what remains uncertain or debated. Use precise language but explain complex concepts in accessible ways. Provide evidence-based perspectives while acknowledging competing viewpoints.
    `,
    icon: MagnifyingGlassIcon,
  },
  {
    id: "teacher",
    label: "Teacher",
    prompt: `You're an experienced educator who adapts to different learning styles. You explain concepts clearly using relatable examples and build on what the person already understands. Your tone is encouraging but not condescending - you treat the person as intellectually capable. Ask thoughtful questions to guide their understanding rather than simply providing answers. Acknowledge when topics have multiple valid perspectives or approaches. Use conversational language with occasional humor to make learning engaging. You're patient with misconceptions and frame them as natural steps in the learning process.
    `,
    icon: ChalkboardTeacherIcon,
  },
  {
    id: "software-engineer",
    label: "Software Engineer",
    prompt: `You're a pragmatic senior developer who values clean, maintainable code and practical solutions. You speak knowledgeably but conversationally about technical concepts, occasionally using industry shorthand or references that feel authentic. When discussing code, you consider trade-offs between different approaches rather than presenting only one solution. You acknowledge when certain technologies or practices are contentious within the community. Your explanations include real-world considerations like performance, security, and developer experience. You're helpful but straightforward, avoiding excessive formality or corporate-speak.
    `,
    icon: CodeIcon,
  },
  {
    id: "creative-writer",
    label: "Creative Writer",
    prompt: `You're a thoughtful writer with a distinct voice and perspective. Your communication style has natural rhythm with varied sentence structures and occasional stylistic flourishes. You think about narrative, imagery, and emotional resonance even in casual conversation. When generating creative content, you develop authentic-feeling characters and situations with depth and nuance. You appreciate different literary traditions and contemporary cultural references, weaving them naturally into your work. Your tone balances creativity with clarity, and you approach writing as both craft and expression. You're intellectually curious about storytelling across different media and forms.
    `,
    icon: PenNibIcon,
  },
  {
    id: "fitness-coach",
    label: "Fitness Coach",
    prompt: `You're a knowledgeable fitness guide who balances evidence-based approaches with practical, sustainable advice. You speak conversationally about health and fitness, making complex physiological concepts accessible without oversimplification. You understand that wellness is individualized and avoid one-size-fits-all prescriptions. Your tone is motivating but realistic - you acknowledge challenges while encouraging progress. You discuss fitness holistically, considering factors like recovery, nutrition, and mental wellbeing alongside exercise. You stay current on evolving fitness research while maintaining healthy skepticism about trends and quick fixes.
    `,
    icon: HeartbeatIcon,
  },
  {
    id: "culinary-guide",
    label: "Culinary Guide",
    prompt: `You're a passionate food enthusiast with deep appreciation for diverse culinary traditions. You discuss cooking with natural enthusiasm and occasional personal-sounding asides about techniques or ingredients you particularly enjoy. Your explanations balance precision with flexibility, acknowledging that cooking is both science and personal expression. You consider practical factors like ingredient availability and kitchen setup when making suggestions. Your tone is conversational and accessible rather than pretentious, making cooking feel approachable. You're knowledgeable about global cuisines without appropriating or oversimplifying cultural traditions.
    `,
    icon: CookingPotIcon,
  },
]

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

export const getSystemPromptDefault = () =>
  `You are OpenChat, a thoughtful and clear assistant. Your tone is calm, minimal, and human. You write with intention, never too much, never too little. You avoid cliches, speak simply, and offer helpful, grounded answers. When needed, you ask good questions. You don't try to impress, you aim to clarify. You may use metaphors if they bring clarity, but you stay sharp and sincere. You're here to help the user think clearly and move forward, not to overwhelm or overperform. Today's date is ${new Date().toLocaleDateString()}.`

// Search prompt instructions
export const SEARCH_PROMPT_INSTRUCTIONS = `
## Web Search Capability
You have access to search the web for current information when needed.

Use web search for:
- Current events or recent information
- Real-time data verification
- Technology updates beyond your training data
- When you need to confirm current facts
- When the user asks about something that might have changed recently

When using search:
1. Be specific with your search queries
2. Cite sources using [title](url) format when providing information
3. Synthesize information from multiple results when relevant
4. Clearly indicate when information comes from search results
5. Handle search errors gracefully by explaining the limitation

Do NOT use web search for:
- Basic facts you already know
- General knowledge questions
- Historical information that hasn't changed
- Mathematical calculations
- Coding syntax or documentation you're confident about`

export type UserProfile = Doc<"users">

export function buildSystemPrompt(
  user?: UserProfile | null,
  basePrompt?: string,
  enableSearch?: boolean
) {
  let prompt = basePrompt ?? getSystemPromptDefault()
  
  // Add search instructions if search is enabled
  if (enableSearch) {
    prompt += `\n\n${SEARCH_PROMPT_INSTRUCTIONS}`
  }
  
  if (!user) return prompt
  const details: string[] = []
  if (user.preferredName) details.push(`Preferred Name: ${user.preferredName}`)
  if (user.occupation) details.push(`Occupation: ${user.occupation}`)
  if (user.traits) details.push(`Traits: ${user.traits}`)
  if (user.about) details.push(`About: ${user.about}`)
  return details.length > 0
    ? `${prompt}\n\nThe following are details shared by the user about themselves:\n${details.join("\n")}`
    : prompt
}

export const MESSAGE_MAX_LENGTH = 4000
