/**
 * Tests for Provider Validation
 * @module validate.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Provider } from "./providers.js";

// Mock child_process before importing validate
vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock errors module
vi.mock("./errors.js", () => ({
  logError: vi.fn(),
}));

// Import after mocks are set up
import {
  validateProvider,
  validateAllProviders,
  clearValidationCache,
  type ValidationResult,
} from "./validate.js";
import { execFileSync } from "child_process";

/**
 * Factory function to create test providers
 */
function createMockProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: "test-provider",
    name: "Test Provider",
    description: "A test provider",
    icon: "",
    type: "api",
    category: "anthropic",
    configDir: "~/.test",
    envVars: {},
    validation: { type: "env" },
    ...overrides,
  };
}

describe("validateProvider", () => {
  beforeEach(() => {
    // Clear cache before each test
    clearValidationCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.TEST_API_KEY;
  });

  describe("env validation", () => {
    it("should return valid when no envKey is required", async () => {
      const provider = createMockProvider({
        validation: { type: "env" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: true,
        message: "Always available",
      });
    });

    it("should return valid when envKey is set", async () => {
      process.env.TEST_API_KEY = "sk-test-key";

      const provider = createMockProvider({
        validation: { type: "env", envKey: "TEST_API_KEY" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: true,
        message: "API key configured",
      });
    });

    it("should return invalid when envKey is not set", async () => {
      delete process.env.MISSING_KEY;

      const provider = createMockProvider({
        validation: { type: "env", envKey: "MISSING_KEY" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: false,
        message: "MISSING_KEY not set",
      });
    });

    it("should return invalid when envKey is empty string", async () => {
      process.env.EMPTY_KEY = "";

      const provider = createMockProvider({
        validation: { type: "env", envKey: "EMPTY_KEY" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: false,
        message: "EMPTY_KEY not set",
      });

      delete process.env.EMPTY_KEY;
    });
  });

  describe("http validation", () => {
    it("should return valid when URL is reachable", async () => {
      mockFetch.mockResolvedValueOnce(new Response("OK", { status: 200 }));

      const provider = createMockProvider({
        validation: { type: "http", url: "http://localhost:8080" },
      });

      const result = await validateProvider(provider);

      expect(result.valid).toBe(true);
      expect(result.message).toContain("Reachable");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should return invalid when URL is not reachable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const provider = createMockProvider({
        validation: { type: "http", url: "http://localhost:9999" },
      });

      const result = await validateProvider(provider);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Not reachable");
    });

    it("should return invalid when no URL is configured", async () => {
      const provider = createMockProvider({
        validation: { type: "http" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: false,
        message: "No URL configured",
      });
    });

    it("should handle timeout errors", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const provider = createMockProvider({
        validation: { type: "http", url: "http://slow-server.com" },
      });

      const result = await validateProvider(provider);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("timeout");
    });
  });

  describe("command validation", () => {
    it("should return valid when command exists", async () => {
      vi.mocked(execFileSync).mockReturnValueOnce(Buffer.from("/usr/bin/node"));

      const provider = createMockProvider({
        validation: { type: "command", command: "node" },
      });

      const result = await validateProvider(provider);

      expect(result.valid).toBe(true);
      expect(result.message).toContain("node found in PATH");
    });

    it("should return invalid when command does not exist", async () => {
      const error = new Error("Command not found") as NodeJS.ErrnoException & { status: number };
      error.status = 1;
      vi.mocked(execFileSync).mockImplementationOnce(() => {
        throw error;
      });

      const provider = createMockProvider({
        validation: { type: "command", command: "nonexistent-cmd" },
      });

      const result = await validateProvider(provider);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("nonexistent-cmd not found");
    });

    it("should return invalid when no command is configured", async () => {
      const provider = createMockProvider({
        validation: { type: "command" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: false,
        message: "No command configured",
      });
    });
  });

  describe("unknown validation type", () => {
    it("should return invalid for unknown validation type", async () => {
      const provider = createMockProvider({
        validation: { type: "unknown" as "env" },
      });

      const result = await validateProvider(provider);

      expect(result).toEqual<ValidationResult>({
        valid: false,
        message: "Unknown validation type",
      });
    });
  });

  describe("caching", () => {
    it("should cache validation results", async () => {
      const provider = createMockProvider({
        validation: { type: "env" },
      });

      // First call
      const result1 = await validateProvider(provider);
      // Second call - should use cache
      const result2 = await validateProvider(provider);

      expect(result1).toEqual(result2);
    });

    it("should skip cache when skipCache is true", async () => {
      process.env.DYNAMIC_KEY = "first-value";

      const provider = createMockProvider({
        id: "dynamic-provider",
        validation: { type: "env", envKey: "DYNAMIC_KEY" },
      });

      // First call - caches result
      const result1 = await validateProvider(provider);
      expect(result1.valid).toBe(true);

      // Change env value
      delete process.env.DYNAMIC_KEY;

      // Second call with skipCache - should re-evaluate
      const result2 = await validateProvider(provider, true);
      expect(result2.valid).toBe(false);
    });

    it("should clear cache with clearValidationCache", async () => {
      process.env.CACHE_TEST_KEY = "value";

      const provider = createMockProvider({
        id: "cache-test-provider",
        validation: { type: "env", envKey: "CACHE_TEST_KEY" },
      });

      // First call - caches result
      await validateProvider(provider);

      // Clear cache
      clearValidationCache();

      // Change env
      delete process.env.CACHE_TEST_KEY;

      // Should re-evaluate after cache clear
      const result = await validateProvider(provider);
      expect(result.valid).toBe(false);
    });
  });
});

describe("validateAllProviders", () => {
  beforeEach(() => {
    clearValidationCache();
    vi.clearAllMocks();
  });

  it("should validate all providers and return a map", async () => {
    const providers = [
      createMockProvider({ id: "provider-1", validation: { type: "env" } }),
      createMockProvider({ id: "provider-2", validation: { type: "env" } }),
    ];

    const results = await validateAllProviders(providers);

    expect(results.size).toBe(2);
    expect(results.get("provider-1")).toEqual<ValidationResult>({
      valid: true,
      message: "Always available",
    });
    expect(results.get("provider-2")).toEqual<ValidationResult>({
      valid: true,
      message: "Always available",
    });
  });

  it("should handle empty provider list", async () => {
    const results = await validateAllProviders([]);

    expect(results.size).toBe(0);
  });

  it("should handle mixed valid and invalid providers", async () => {
    process.env.VALID_KEY = "some-value";

    const providers = [
      createMockProvider({
        id: "valid-provider",
        validation: { type: "env", envKey: "VALID_KEY" },
      }),
      createMockProvider({
        id: "invalid-provider",
        validation: { type: "env", envKey: "MISSING_KEY" },
      }),
    ];

    const results = await validateAllProviders(providers);

    expect(results.get("valid-provider")?.valid).toBe(true);
    expect(results.get("invalid-provider")?.valid).toBe(false);

    delete process.env.VALID_KEY;
  });
});
