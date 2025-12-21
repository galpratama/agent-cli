/**
 * Provider Configuration Manager
 * Handles loading, saving, and managing providers from config file
 * Providers are loaded from ~/.agent-cli/providers.json
 *
 * On first run, the config file is initialized from providers.example.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Provider, ProviderCategory } from "./providers.js";
import { logError } from "./errors.js";

// Get package directory for example file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = resolve(__dirname, "../..");
const EXAMPLE_CONFIG_PATH = resolve(PACKAGE_DIR, "providers.example.json");

// Config file location
const CONFIG_DIR = resolve(homedir(), ".agent-cli");
const PROVIDERS_CONFIG_PATH = resolve(CONFIG_DIR, "providers.json");

export interface ProviderConfig {
  /** All providers */
  providers: Provider[];
  /** Overrides for providers (partial updates by ID) */
  overrides: Record<string, Partial<Provider>>;
  /** Disabled provider IDs */
  disabled: string[];
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Initialize config file from example if it doesn't exist
 */
function initializeConfigIfNeeded(): void {
  if (existsSync(PROVIDERS_CONFIG_PATH)) {
    return;
  }

  ensureConfigDir();

  // Try to copy from example file
  if (existsSync(EXAMPLE_CONFIG_PATH)) {
    copyFileSync(EXAMPLE_CONFIG_PATH, PROVIDERS_CONFIG_PATH);
    return;
  }

  // Fallback: create minimal config with just Claude
  const minimalConfig: ProviderConfig = {
    providers: [
      {
        id: "claude",
        name: "Claude",
        description: "Default Anthropic Claude",
        icon: "",
        type: "api",
        category: "anthropic",
        configDir: "~/.claude",
        envVars: {},
        validation: { type: "env" },
      },
    ],
    overrides: {},
    disabled: [],
  };

  writeFileSync(PROVIDERS_CONFIG_PATH, JSON.stringify(minimalConfig, null, 2));
}

/**
 * Load provider config from file
 */
export function loadProviderConfig(): ProviderConfig {
  // Initialize config if needed
  initializeConfigIfNeeded();

  try {
    const data = readFileSync(PROVIDERS_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(data);

    // Handle legacy format (array of providers directly)
    if (Array.isArray(parsed)) {
      return {
        providers: parsed,
        overrides: {},
        disabled: [],
      };
    }

    return {
      providers: parsed.providers || [],
      overrides: parsed.overrides || {},
      disabled: parsed.disabled || [],
    };
  } catch (error) {
    // Log error with context for debugging
    logError(error, {
      operation: "loadProviderConfig",
      filePath: PROVIDERS_CONFIG_PATH,
    });

    // Return empty config to allow app to continue
    return {
      providers: [],
      overrides: {},
      disabled: [],
    };
  }
}

/**
 * Save provider config to file
 */
export function saveProviderConfig(config: ProviderConfig): void {
  ensureConfigDir();
  writeFileSync(PROVIDERS_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Get all providers (with overrides applied, disabled filtered out, duplicates removed)
 */
export function getAllProviders(): Provider[] {
  const config = loadProviderConfig();
  const seenIds = new Set<string>();

  // Apply overrides, filter disabled, and deduplicate by ID (keep first occurrence)
  return config.providers
    .filter((p) => !config.disabled.includes(p.id))
    .filter((p) => {
      if (seenIds.has(p.id)) {
        // Skip duplicate - already seen this ID
        return false;
      }
      seenIds.add(p.id);
      return true;
    })
    .map((p) => {
      const override = config.overrides[p.id];
      if (override) {
        return { ...p, ...override };
      }
      return p;
    });
}

/**
 * Get a provider by ID
 */
export function getProviderById(id: string): Provider | undefined {
  return getAllProviders().find((p) => p.id === id);
}

/**
 * Get all provider IDs
 */
export function getProviderIds(): string[] {
  return getAllProviders().map((p) => p.id);
}

/**
 * Add a provider to the config
 */
export function addCustomProvider(provider: Provider): void {
  const config = loadProviderConfig();

  // Remove existing provider with same ID
  config.providers = config.providers.filter((p) => p.id !== provider.id);
  config.providers.push(provider);

  saveProviderConfig(config);
}

/**
 * Remove a provider from the config
 */
export function removeCustomProvider(id: string): boolean {
  const config = loadProviderConfig();
  const originalLength = config.providers.length;
  config.providers = config.providers.filter((p) => p.id !== id);

  if (config.providers.length < originalLength) {
    saveProviderConfig(config);
    return true;
  }
  return false;
}

/**
 * Update a provider override
 */
export function setProviderOverride(
  id: string,
  override: Partial<Provider>
): void {
  const config = loadProviderConfig();
  config.overrides[id] = { ...config.overrides[id], ...override };
  saveProviderConfig(config);
}

/**
 * Remove a provider override
 */
export function removeProviderOverride(id: string): void {
  const config = loadProviderConfig();
  delete config.overrides[id];
  saveProviderConfig(config);
}

/**
 * Disable a provider
 */
export function disableProvider(id: string): void {
  const config = loadProviderConfig();
  if (!config.disabled.includes(id)) {
    config.disabled.push(id);
    saveProviderConfig(config);
  }
}

/**
 * Enable a disabled provider
 */
export function enableProvider(id: string): void {
  const config = loadProviderConfig();
  config.disabled = config.disabled.filter((d) => d !== id);
  saveProviderConfig(config);
}

/**
 * Check if a provider is disabled
 */
export function isProviderDisabled(id: string): boolean {
  const config = loadProviderConfig();
  return config.disabled.includes(id);
}

/**
 * Get the config file path (for display purposes)
 */
export function getConfigPath(): string {
  return PROVIDERS_CONFIG_PATH;
}

/**
 * Create a new provider with defaults
 */
export function createProviderTemplate(
  id: string,
  name: string
): Provider {
  return {
    id,
    name,
    description: `Custom provider: ${name}`,
    icon: "",
    type: "api",
    category: "standalone" as ProviderCategory,
    configDir: `~/.${id}`,
    envVars: {},
    validation: { type: "env" },
  };
}

/**
 * Validate a provider object has required fields
 */
export function validateProvider(provider: Partial<Provider>): string[] {
  const errors: string[] = [];

  if (!provider.id) errors.push("id is required");
  if (!provider.name) errors.push("name is required");
  if (!provider.type) errors.push("type is required");
  if (!provider.category) errors.push("category is required");
  if (!provider.validation) errors.push("validation is required");

  if (provider.id && !/^[a-z0-9-]+$/.test(provider.id)) {
    errors.push("id must be lowercase alphanumeric with hyphens only");
  }

  return errors;
}

// Re-export types for convenience
export type { Provider, ProviderCategory };
export { CATEGORY_LABELS } from "./providers.js";
