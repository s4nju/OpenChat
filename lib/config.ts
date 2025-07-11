// Re-export everything from the refactored config structure
// This file maintains backward compatibility while the actual config is now organized in separate modules

// Constants
export * from "./config/constants"

// Schemas and types
export * from "./config/schemas"

// Features
export * from "./config/features"

// Providers
export * from "./config/providers"

// Suggestions
export * from "./config/suggestions"

// Models (main exports)
export * from "./config/models/index"

// Explicitly re-export key types for backward compatibility
export type { Model } from "./config/schemas"
export type { Provider } from "./config/providers"