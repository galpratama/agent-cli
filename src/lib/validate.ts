/**
 * Provider Validation
 * Checks if providers are properly configured and available
 * Includes caching for performance optimization
 */

import { execFileSync } from "child_process";
import { Provider } from "./providers.js";
import { logError } from "./errors.js";

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export interface HealthCheckResult extends ValidationResult {
  latencyMs?: number;
  modelAvailable?: boolean;
  modelName?: string;
  error?: string;
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
  } catch (error) {
    // Log only unexpected errors, not "command not found" (exit code 1)
    const isNotFound = error instanceof Error &&
      "status" in error &&
      (error as NodeJS.ErrnoException & { status?: number }).status === 1;

    if (!isNotFound) {
      logError(error, { operation: "commandExists", command });
    }
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
      } catch (error) {
        // Log network errors with context (timeout, DNS failure, connection refused, etc.)
        const isAbortError = error instanceof Error && error.name === "AbortError";
        const errorDetail = isAbortError ? "timeout" : (error instanceof Error ? error.message : "unknown");

        logError(error, {
          operation: "validateHttpProvider",
          providerId: provider.id,
          url: validation.url,
        });

        result = { valid: false, message: `Not reachable at ${validation.url} (${errorDetail})` };
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

/**
 * Resolve the API key for a provider based on envMappings and validation config
 */
function resolveApiKey(provider: Provider): string | undefined {
  // Check envMappings first (e.g., OPENROUTER_API_KEY -> ANTHROPIC_AUTH_TOKEN)
  if (provider.envMappings) {
    for (const [sourceKey] of Object.entries(provider.envMappings)) {
      const value = process.env[sourceKey];
      if (value) return value;
    }
  }

  // Fall back to validation envKey
  if (provider.validation.envKey) {
    return process.env[provider.validation.envKey];
  }

  // Check for direct ANTHROPIC_API_KEY
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Resolve the base URL for a provider
 */
function resolveBaseUrl(provider: Provider): string {
  // Check provider's envVars for ANTHROPIC_BASE_URL
  if (provider.envVars?.ANTHROPIC_BASE_URL) {
    return provider.envVars.ANTHROPIC_BASE_URL;
  }

  // Check validation URL for http type
  if (provider.validation.type === "http" && provider.validation.url) {
    return provider.validation.url;
  }

  // Default Anthropic API
  return "https://api.anthropic.com";
}

/**
 * Perform a deep health check on a provider
 * Makes an actual API call to test latency and model availability
 * Only works for api type providers with Anthropic-compatible APIs
 * Proxy providers use basic reachability check since they authenticate via Claude CLI
 */
export async function performHealthCheck(
  provider: Provider
): Promise<HealthCheckResult> {
  // First run basic validation
  const basicResult = await validateProvider(provider, true);

  if (!basicResult.valid) {
    return {
      ...basicResult,
      modelAvailable: false,
    };
  }

  // Standalone CLIs don't support deep checks
  if (provider.type === "standalone") {
    return {
      ...basicResult,
      message: `${basicResult.message} (deep check not supported for ${provider.type})`,
    };
  }

  // Proxy providers authenticate via Claude CLI, not direct API calls
  // Just verify the proxy is reachable with latency measurement
  if (provider.type === "proxy") {
    const baseUrl = resolveBaseUrl(provider);
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      await fetch(baseUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      return {
        valid: true,
        message: "Proxy reachable (auth via Claude CLI)",
        latencyMs,
        modelAvailable: true,
        modelName: provider.envVars?.ANTHROPIC_DEFAULT_SONNET_MODEL || provider.models?.[0],
      };
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === "AbortError";
      return {
        valid: false,
        message: isAbortError ? "Proxy timeout" : "Proxy not reachable",
        modelAvailable: false,
      };
    }
  }

  // For gateway type, also skip deep check
  if (provider.type === "gateway") {
    return {
      ...basicResult,
      message: `${basicResult.message} (deep check not supported for ${provider.type})`,
    };
  }

  // Only api type providers get full deep check
  const baseUrl = resolveBaseUrl(provider);
  const apiKey = resolveApiKey(provider);

  if (!apiKey) {
    return {
      valid: false,
      message: "No API key found for health check",
      modelAvailable: false,
    };
  }

  // Get the model to test
  const modelName = provider.envVars?.ANTHROPIC_DEFAULT_SONNET_MODEL
    || provider.envVars?.ANTHROPIC_MODEL
    || provider.models?.[0]
    || "claude-sonnet-4-20250514";

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for API call

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey || "sk-dummy",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return {
        valid: true,
        message: "API responding",
        latencyMs,
        modelAvailable: true,
        modelName,
      };
    }

    // Handle specific error codes
    const errorBody = await response.text().catch(() => "");
    let errorMessage = `HTTP ${response.status}`;

    if (response.status === 401) {
      errorMessage = "Authentication failed";
    } else if (response.status === 403) {
      errorMessage = "Access forbidden";
    } else if (response.status === 404) {
      errorMessage = `Model not found: ${modelName}`;
    } else if (response.status === 429) {
      // Rate limited but API is working
      return {
        valid: true,
        message: "API responding (rate limited)",
        latencyMs,
        modelAvailable: true,
        modelName,
      };
    } else if (response.status >= 500) {
      errorMessage = "Server error";
    }

    // Try to extract error message from response
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // Ignore parse errors
    }

    return {
      valid: false,
      message: errorMessage,
      latencyMs,
      modelAvailable: false,
      modelName,
      error: errorBody.slice(0, 200),
    };
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError";
    const errorMessage = isAbortError
      ? "Request timeout (15s)"
      : (error instanceof Error ? error.message : "Unknown error");

    logError(error, {
      operation: "performHealthCheck",
      providerId: provider.id,
      baseUrl,
    });

    return {
      valid: false,
      message: errorMessage,
      modelAvailable: false,
      modelName,
      error: errorMessage,
    };
  }
}

/**
 * Perform health checks on all providers
 */
export async function healthCheckAllProviders(
  providers: Provider[]
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();

  // Run health checks sequentially to avoid overwhelming APIs
  for (const provider of providers) {
    const result = await performHealthCheck(provider);
    results.set(provider.id, result);
  }

  return results;
}
