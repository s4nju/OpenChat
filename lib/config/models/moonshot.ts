import { groq } from "@ai-sdk/groq"
import { TOOL_CALLING_FEATURE } from "../features"

export const MOONSHOT_MODELS = [
  {
    id: "moonshotai/kimi-k2",
    name: "Kimi K2",
    provider: "moonshotai",
    premium: false,
    usesPremiumCredits: false,
    description: `Moonshot AI's Kimi K2 model.\nOffers agentic tools capabilities for various tasks.`,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      TOOL_CALLING_FEATURE,
    ],
    api_sdk: groq("moonshotai/kimi-k2-instruct"),
  },
]