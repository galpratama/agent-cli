/**
 * Provider Validation
 * Checks if providers are properly configured and available
 * Includes caching for performance optimization
 */

import { execFileSync } from "child_process";
import { Provider } from "./providers.js";

export interface ValidationResult {
  valid: boolean;
  message: string;
}

// Cache validation results with TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();

/**
 * Get cached validation result if still valid
 */
function getCachedResult(providerId: string): ValidationResult | null {
  const cached = validationCache.get(providerId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

/**
 * Cache a validation result
 */
function setCachedResult(providerId: string, result: ValidationResult): void {
  validationCache.set(providerId, { result, timestamp: Date.now() });
}

/**
 * Clear the validation cache (useful for manual refresh)
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

/**
 * Check if a command exists in PATH
 */
function commandExists(command: string): boolean {
  try {
    // Using execFileSync with 'which' is safe - command is from our config, not user input
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a provider's configuration
 * Uses caching to avoid redundant validation calls
 */
export async function validateProvider(
  provider: Provider,
  skipCache = false
): Promise<ValidationResult> {
  // Check cache first (unless explicitly skipped)
  if (!skipCache) {
    const cached = getCachedResult(provider.id);
    if (cached) return cached;
  }

  const { validation } = provider;
  let result: ValidationResult;

  if (validation.type === "env") {
    // No env key means always valid (like default claude)
    if (!validation.envKey) {
      result = { valid: true, message: "Always available" };
    } else {
      const value = process.env[validation.envKey];
      if (value && value.length > 0) {
        result = { valid: true, message: "API key configured" };
      } else {
        result = { valid: false, message: `${validation.envKey} not set` };
      }
    }
  } else if (validation.type === "http") {
    if (!validation.url) {
      result = { valid: false, message: "No URL configured" };
    } else {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        await fetch(validation.url, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Any response means the server is reachable
        result = { valid: true, message: `Reachable at ${validation.url}` };
      } catch {
        result = { valid: false, message: `Not reachable at ${validation.url}` };
      }
    }
  } else if (validation.type === "command") {
    if (!validation.command) {
      result = { valid: false, message: "No command configured" };
    } else if (commandExists(validation.command)) {
      result = { valid: true, message: `${validation.command} found in PATH` };
    } else {
      result = { valid: false, message: `${validation.command} not found` };
    }
  } else {
    result = { valid: false, message: "Unknown validation type" };
  }

  // Cache the result before returning
  setCachedResult(provider.id, result);
  return result;
}

/**
 * Validate all providers and return a map of results
 */
export async function validateAllProviders(
  providers: Provider[]
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();

  await Promise.all(
    providers.map(async (provider) => {
      const result = await validateProvider(provider);
      results.set(provider.id, result);
    })
  );

  return results;
}
