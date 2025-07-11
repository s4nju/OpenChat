export const PREMIUM_CREDITS = 100
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5

export const APP_NAME = "OpenChat "
export const APP_DOMAIN = "https://chat.ajanraj.com"
export const APP_DESCRIPTION =
  "OpenChat is a AI chat app with multi-model support."
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export const MODEL_DEFAULT = "gemini-2.0-flash"

export const RECOMMENDED_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'imagen-4',
  'gpt-4o-mini',
  'o4-mini',
  'gpt-image-1',
  'claude-4-sonnet',
  'claude-4-sonnet-reasoning',
  'deepseek-r1-0528',
]

export const MESSAGE_MAX_LENGTH = 4000