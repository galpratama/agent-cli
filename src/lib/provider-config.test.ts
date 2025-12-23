/**
 * Tests for Provider Configuration Manager
 * @module provider-config.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Provider, ProviderCategory } from "./providers.js";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

// Mock errors module
vi.mock("./errors.js", () => ({
  logError: vi.fn(),
}));

// Import after mocks are set up
import {
  loadProviderConfig,
  saveProviderConfig,
  getAllProviders,
  getProviderById,
  getProviderIds,
  addCustomProvider,
  removeCustomProvider,
  setProviderOverride,
  removeProviderOverride,
  disableProvider,
  enableProvider,
  isProviderDisabled,
  validateProvider,
  createProviderTemplate,
  type ProviderConfig,
} from "./provider-config.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "fs";

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
    category: "anthropic" as ProviderCategory,
    configDir: "~/.test",
    envVars: {},
    validation: { type: "env" },
    ...overrides,
  };
}

/**
 * Factory function to create test config
 */
function createMockConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    providers: [],
    overrides: {},
    disabled: [],
    ...overrides,
  };
}

describe("loadProviderConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load config from file", () => {
    const mockConfig = createMockConfig({
      providers: [createMockProvider({ id: "claude" })],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

    const result = loadProviderConfig();

    expect(result.providers).toHaveLength(1);
    expect(result.providers[0].id).toBe("claude");
  });

  it("should handle legacy array format", () => {
    const legacyConfig = [createMockProvider({ id: "legacy" })];

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(legacyConfig));

    const result = loadProviderConfig();

    expect(result.providers).toHaveLength(1);
    expect(result.providers[0].id).toBe("legacy");
    expect(result.overrides).toEqual({});
    expect(result.disabled).toEqual([]);
  });

  it("should initialize from example if config doesn't exist", () => {
    // Sequence of existsSync calls:
    // 1. Check if providers.json exists (false - triggers init)
    // 2. Check if config dir exists (false - triggers mkdir)
    // 3. Check if example file exists (true - triggers copy)
    // 4. Check if providers.json exists (true - after copy)
    vi.mocked(existsSync)
      .mockReturnValueOnce(false)  // providers.json doesn't exist
      .mockReturnValueOnce(false)  // config dir doesn't exist
      .mockReturnValueOnce(true)   // example file exists
      .mockReturnValueOnce(true);  // providers.json exists (after copy)

    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(createMockConfig()));

    loadProviderConfig();

    expect(mkdirSync).toHaveBeenCalled();
    expect(copyFileSync).toHaveBeenCalled();
  });

  it("should create minimal config if example doesn't exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(createMockConfig({
      providers: [createMockProvider({ id: "claude" })],
    })));

    loadProviderConfig();

    // Should have written minimal config
    expect(writeFileSync).toHaveBeenCalled();
  });

  it("should return empty config on parse error", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("invalid json {{{");

    const result = loadProviderConfig();

    expect(result).toEqual({
      providers: [],
      overrides: {},
      disabled: [],
    });
  });
});

describe("getAllProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all providers with overrides applied", () => {
    const config = createMockConfig({
      providers: [createMockProvider({ id: "claude", name: "Original" })],
      overrides: { claude: { name: "Overridden" } },
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const providers = getAllProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe("Overridden");
  });

  it("should filter out disabled providers", () => {
    const config = createMockConfig({
      providers: [
        createMockProvider({ id: "enabled" }),
        createMockProvider({ id: "disabled" }),
      ],
      disabled: ["disabled"],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const providers = getAllProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe("enabled");
  });

  it("should deduplicate providers by ID", () => {
    const config = createMockConfig({
      providers: [
        createMockProvider({ id: "duplicate", name: "First" }),
        createMockProvider({ id: "duplicate", name: "Second" }),
      ],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const providers = getAllProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe("First"); // Keeps first occurrence
  });
});

describe("getProviderById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find provider by ID", () => {
    const config = createMockConfig({
      providers: [
        createMockProvider({ id: "claude" }),
        createMockProvider({ id: "gemini" }),
      ],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const provider = getProviderById("gemini");

    expect(provider?.id).toBe("gemini");
  });

  it("should return undefined for unknown ID", () => {
    const config = createMockConfig({
      providers: [createMockProvider({ id: "claude" })],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const provider = getProviderById("unknown");

    expect(provider).toBeUndefined();
  });
});

describe("getProviderIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of provider IDs", () => {
    const config = createMockConfig({
      providers: [
        createMockProvider({ id: "claude" }),
        createMockProvider({ id: "gemini" }),
      ],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const ids = getProviderIds();

    expect(ids).toEqual(["claude", "gemini"]);
  });
});

describe("addCustomProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add new provider to config", () => {
    const config = createMockConfig({
      providers: [createMockProvider({ id: "existing" })],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const newProvider = createMockProvider({ id: "new-provider" });
    addCustomProvider(newProvider);

    expect(writeFileSync).toHaveBeenCalled();
    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.providers).toHaveLength(2);
  });

  it("should replace existing provider with same ID", () => {
    const config = createMockConfig({
      providers: [createMockProvider({ id: "replace-me", name: "Old" })],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const newProvider = createMockProvider({ id: "replace-me", name: "New" });
    addCustomProvider(newProvider);

    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.providers).toHaveLength(1);
    expect(writtenData.providers[0].name).toBe("New");
  });
});

describe("removeCustomProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should remove provider and return true", () => {
    const config = createMockConfig({
      providers: [
        createMockProvider({ id: "keep" }),
        createMockProvider({ id: "remove" }),
      ],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const result = removeCustomProvider("remove");

    expect(result).toBe(true);
    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.providers).toHaveLength(1);
    expect(writtenData.providers[0].id).toBe("keep");
  });

  it("should return false if provider not found", () => {
    const config = createMockConfig({
      providers: [createMockProvider({ id: "keep" })],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    const result = removeCustomProvider("nonexistent");

    expect(result).toBe(false);
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});

describe("setProviderOverride", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add override for provider", () => {
    const config = createMockConfig();

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    setProviderOverride("claude", { name: "Custom Claude" });

    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.overrides.claude).toEqual({ name: "Custom Claude" });
  });

  it("should merge with existing overrides", () => {
    const config = createMockConfig({
      overrides: { claude: { name: "Old Name" } },
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    setProviderOverride("claude", { description: "New Description" });

    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.overrides.claude).toEqual({
      name: "Old Name",
      description: "New Description",
    });
  });
});

describe("removeProviderOverride", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should remove override for provider", () => {
    const config = createMockConfig({
      overrides: { claude: { name: "Custom" } },
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    removeProviderOverride("claude");

    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.overrides.claude).toBeUndefined();
  });
});

describe("disableProvider / enableProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add provider to disabled list", () => {
    const config = createMockConfig();

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    disableProvider("claude");

    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.disabled).toContain("claude");
  });

  it("should not duplicate disabled provider", () => {
    const config = createMockConfig({
      disabled: ["claude"],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    disableProvider("claude");

    // Should not have written (no change)
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("should remove provider from disabled list", () => {
    const config = createMockConfig({
      disabled: ["claude", "gemini"],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    enableProvider("claude");

    const writtenData = JSON.parse(
      vi.mocked(writeFileSync).mock.calls[0][1] as string
    );
    expect(writtenData.disabled).toEqual(["gemini"]);
  });
});

describe("isProviderDisabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for disabled provider", () => {
    const config = createMockConfig({
      disabled: ["disabled-provider"],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    expect(isProviderDisabled("disabled-provider")).toBe(true);
  });

  it("should return false for enabled provider", () => {
    const config = createMockConfig({
      disabled: [],
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));

    expect(isProviderDisabled("enabled-provider")).toBe(false);
  });
});

describe("validateProvider", () => {
  it("should return empty array for valid provider", () => {
    const provider = createMockProvider();
    const errors = validateProvider(provider);
    expect(errors).toEqual([]);
  });

  it("should return error for missing id", () => {
    const errors = validateProvider({ name: "Test" });
    expect(errors).toContain("id is required");
  });

  it("should return error for missing name", () => {
    const errors = validateProvider({ id: "test" });
    expect(errors).toContain("name is required");
  });

  it("should return error for missing type", () => {
    const errors = validateProvider({ id: "test", name: "Test" });
    expect(errors).toContain("type is required");
  });

  it("should return error for missing category", () => {
    const errors = validateProvider({ id: "test", name: "Test", type: "api" });
    expect(errors).toContain("category is required");
  });

  it("should return error for missing validation", () => {
    const errors = validateProvider({
      id: "test",
      name: "Test",
      type: "api",
      category: "anthropic",
    });
    expect(errors).toContain("validation is required");
  });

  it("should return error for invalid id format", () => {
    const errors = validateProvider({
      id: "Invalid_ID",
      name: "Test",
      type: "api",
      category: "anthropic",
      validation: { type: "env" },
    });
    expect(errors).toContain("id must be lowercase alphanumeric with hyphens only");
  });

  it("should accept valid id with hyphens", () => {
    const errors = validateProvider({
      id: "my-custom-provider",
      name: "Test",
      type: "api",
      category: "anthropic",
      validation: { type: "env" },
    });
    expect(errors).not.toContain("id must be lowercase alphanumeric with hyphens only");
  });
});

describe("createProviderTemplate", () => {
  it("should create provider with defaults", () => {
    const provider = createProviderTemplate("my-provider", "My Provider");

    expect(provider).toEqual({
      id: "my-provider",
      name: "My Provider",
      description: "Custom provider: My Provider",
      icon: "",
      type: "api",
      category: "standalone",
      configDir: "~/.my-provider",
      envVars: {},
      validation: { type: "env" },
    });
  });
});
