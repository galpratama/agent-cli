/**
 * Provider Type Definitions
 * Types and interfaces for AI providers
 *
 * Providers are loaded from ~/.agent-cli/providers.json
 * See providers.example.json for reference
 */

export type ProviderCategory =
  | "anthropic"
  | "openai"
  | "google"
  | "meta"
  | "mistral"
  | "cohere"
  | "chinese"
  | "azure"
  | "amazon"
  | "opensource"
  | "local"
  | "standalone"
  | "enterprise"
  | "custom";

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  anthropic: "Anthropic / Claude",
  openai: "OpenAI / GPT",
  google: "Google / Gemini",
  meta: "Meta / Llama",
  mistral: "Mistral AI",
  cohere: "Cohere",
  chinese: "Chinese AI",
  azure: "Azure AI",
  amazon: "Amazon Bedrock",
  opensource: "Open Source",
  local: "Local / Self-hosted",
  standalone: "Standalone CLIs",
  enterprise: "Enterprise",
  custom: "Custom",
};

export interface Provider {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "api" | "proxy" | "gateway" | "standalone";
  category: ProviderCategory;
  envVars: Record<string, string>;
  /**
   * Environment variable mappings: maps source env var to target env var
   * Example: { "MY_API_KEY": "ANTHROPIC_API_KEY" } will set ANTHROPIC_API_KEY from MY_API_KEY
   */
  envMappings?: Record<string, string>;
  configDir: string;
  validation: {
    type: "env" | "http" | "command";
    envKey?: string;
    url?: string;
    command?: string;
  };
  /** For standalone providers, the command to run instead of 'claude' */
  command?: string;
  /** Default arguments for the standalone command */
  defaultArgs?: string[];
  /** Update command for standalone providers: [command, ...args] */
  updateCmd?: string[];
  /** Argument for skip-permissions mode (e.g., "--full-auto" for Codex, "-y" for Gemini) */
  skipPermissionsArg?: string;
  /** Argument for continue/resume session mode (e.g., "--continue" for Claude, "--resume" for others) */
  continueArg?: string;
  /** Available models for this provider (if multiple models are supported) */
  models?: string[];
  /** Environment variable to set the selected model (e.g., "ANTHROPIC_MODEL") */
  modelEnvVar?: string;
}
