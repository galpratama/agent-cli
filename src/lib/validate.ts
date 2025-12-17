/**
 * Provider Validation
 * Checks if providers are properly configured and available
 */

import { execFileSync } from "child_process";
import { Provider } from "./providers.js";

export interface ValidationResult {
  valid: boolean;
  message: string;
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
 */
export async function validateProvider(
  provider: Provider
): Promise<ValidationResult> {
  const { validation } = provider;

  if (validation.type === "env") {
    // No env key means always valid (like default claude)
    if (!validation.envKey) {
      return { valid: true, message: "Always available" };
    }

    const value = process.env[validation.envKey];
    if (value && value.length > 0) {
      return { valid: true, message: "API key configured" };
    }
    return { valid: false, message: `${validation.envKey} not set` };
  }

  if (validation.type === "http") {
    if (!validation.url) {
      return { valid: false, message: "No URL configured" };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(validation.url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Any response means the server is reachable
      return { valid: true, message: `Reachable at ${validation.url}` };
    } catch {
      return { valid: false, message: `Not reachable at ${validation.url}` };
    }
  }

  if (validation.type === "command") {
    if (!validation.command) {
      return { valid: false, message: "No command configured" };
    }

    if (commandExists(validation.command)) {
      return { valid: true, message: `${validation.command} found in PATH` };
    }
    return { valid: false, message: `${validation.command} not found` };
  }

  return { valid: false, message: "Unknown validation type" };
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
