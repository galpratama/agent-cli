/**
 * Launcher
 * Handles spawning Claude or standalone AI CLIs with the selected provider
 */

import { spawn } from "child_process";
import { mkdirSync, writeFileSync, chmodSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir, homedir, platform } from "os";
import { randomUUID } from "crypto";
import { Provider } from "./providers.js";
import { getAllProviders } from "./provider-config.js";
import { validateProvider } from "./validate.js";

/** Current platform */
const isWindows = platform() === "win32";
const isMacOS = platform() === "darwin";

/** Get the PATH separator for the current platform */
const PATH_SEPARATOR = isWindows ? ";" : ":";

export interface LaunchOptions {
  provider: Provider;
  args?: string[];
  debug?: boolean;
  /** Resume the last session (--continue for Claude) */
  continueSession?: boolean;
  /** Skip permission prompts (--dangerously-skip-permissions for Claude) */
  skipPermissions?: boolean;
  /** Enable auto-fallback to next available provider on failure */
  fallback?: boolean;
  /** Internal: providers already tried (to prevent infinite loops) */
  triedProviders?: string[];
}

/**
 * Expand ~ to home directory (cross-platform)
 */
function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return path.replace("~", homedir());
  }
  return path;
}

/**
 * Create a fake security executable to bypass macOS Keychain
 * This forces Claude to save credentials to .credentials.json instead
 * Only needed on macOS - other platforms don't have the security command
 */
function createFakeSecurityPath(): string | null {
  // Only needed on macOS
  if (!isMacOS) {
    return null;
  }

  const tempDir = join(tmpdir(), `agent-cli-${randomUUID()}`);
  mkdirSync(tempDir, { recursive: true });

  const securityPath = join(tempDir, "security");
  writeFileSync(
    securityPath,
    `#!/bin/sh
echo "Keychain access denied" >&2
exit 1
`
  );
  chmodSync(securityPath, 0o755);

  return tempDir;
}

/**
 * Build environment variables for the provider
 */
function buildEnv(
  provider: Provider,
  tempDir: string | null
): NodeJS.ProcessEnv {
  const env = { ...process.env };

  // Set provider name
  env.CLAUDE_PROVIDER = provider.name;

  // Set config directory (expand ~ cross-platform)
  const configDir = expandHome(provider.configDir);
  env.CLAUDE_CONFIG_DIR = configDir;

  // Ensure config directory exists
  mkdirSync(configDir, { recursive: true });

  // Apply provider-specific env vars
  for (const [key, value] of Object.entries(provider.envVars)) {
    env[key] = value;
  }

  // Apply environment variable mappings (e.g., map MY_API_KEY to ANTHROPIC_API_KEY)
  if (provider.envMappings) {
    for (const [sourceKey, targetKey] of Object.entries(provider.envMappings)) {
      const sourceValue = process.env[sourceKey];
      if (sourceValue) {
        env[targetKey] = sourceValue;
      }
    }
  }

  // Prepend temp dir to PATH for fake security (macOS only)
  if (tempDir) {
    env.PATH = `${tempDir}${PATH_SEPARATOR}${env.PATH}`;
  }

  return env;
}

/**
 * Find the next available fallback provider of the same category
 */
async function findFallbackProvider(
  currentProvider: Provider,
  triedProviders: string[]
): Promise<Provider | null> {
  // Get providers of the same category that haven't been tried
  const allProviders = getAllProviders();
  const candidates = allProviders.filter(
    (p: Provider) =>
      p.category === currentProvider.category &&
      !triedProviders.includes(p.id)
  );

  // Validate each candidate and return the first valid one
  for (const candidate of candidates) {
    const result = await validateProvider(candidate);
    if (result.valid) {
      return candidate;
    }
  }

  return null;
}

/**
 * Launch Claude with the specified provider
 */
export async function launchClaude(options: LaunchOptions): Promise<void> {
  const {
    provider,
    args = [],
    debug = false,
    continueSession = false,
    skipPermissions = false,
    fallback = false,
    triedProviders = [provider.id],
  } = options;

  // For standalone providers (codex, vibe, opencode), launch directly
  if (provider.type === "standalone" && provider.command) {
    return launchStandalone(provider, args, debug, fallback, triedProviders);
  }

  // Create fake security path for Claude-based providers
  const tempDir = createFakeSecurityPath();

  // Build environment
  const env = buildEnv(provider, tempDir);

  // Build final args with flags
  const finalArgs = [...args];

  // Add --continue flag if requested (resume last session)
  if (continueSession) {
    finalArgs.unshift("--continue");
  }

  // Add --dangerously-skip-permissions if requested
  if (skipPermissions) {
    finalArgs.unshift("--dangerously-skip-permissions");
  }

  if (debug) {
    console.log("\n=== DEBUG: Environment Variables ===");
    Object.entries(env)
      .filter(([key]) => key.startsWith("CLAUDE_") || key.startsWith("ANTHROPIC_"))
      .sort()
      .forEach(([key, value]) => console.log(`  ${key}=${value}`));
    console.log("\n=== DEBUG: Command ===");
    console.log(`  claude ${finalArgs.join(" ")}`);
    console.log("=== END DEBUG ===\n");
  }

  // Spawn Claude
  const child = spawn("claude", finalArgs, {
    env,
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // Cleanup on exit (only needed on macOS where we create temp dir)
  const cleanup = () => {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };

  child.on("exit", async (code) => {
    cleanup();

    // If fallback is enabled and the provider failed, try the next one
    if (fallback && code !== 0) {
      console.log(`\n⚠ ${provider.name} exited with code ${code}, trying fallback...`);
      const nextProvider = await findFallbackProvider(provider, triedProviders);

      if (nextProvider) {
        console.log(`→ Falling back to ${nextProvider.name}...\n`);
        return launchClaude({
          provider: nextProvider,
          args,
          debug,
          continueSession,
          skipPermissions,
          fallback: true,
          triedProviders: [...triedProviders, nextProvider.id],
        });
      } else {
        console.log("✗ No more fallback providers available.");
      }
    }

    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    cleanup();
    console.error("Failed to start Claude:", err.message);
    process.exit(1);
  });

  // Handle signals
  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });
}

/**
 * Launch a standalone AI CLI (codex, vibe, opencode)
 */
async function launchStandalone(
  provider: Provider,
  args: string[],
  debug: boolean,
  fallback: boolean = false,
  triedProviders: string[] = []
): Promise<void> {
  const command = provider.command!;
  const finalArgs = [...(provider.defaultArgs || []), ...args];

  if (debug) {
    console.log("\n=== DEBUG: Standalone Command ===");
    console.log(`  ${command} ${finalArgs.join(" ")}`);
    console.log("=== END DEBUG ===\n");
  }

  const child = spawn(command, finalArgs, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  child.on("exit", async (code) => {
    // If fallback is enabled and the provider failed, try the next one
    if (fallback && code !== 0) {
      console.log(`\n⚠ ${provider.name} exited with code ${code}, trying fallback...`);
      const nextProvider = await findFallbackProvider(provider, triedProviders);

      if (nextProvider) {
        console.log(`→ Falling back to ${nextProvider.name}...\n`);
        return launchStandalone(
          nextProvider,
          args,
          debug,
          true,
          [...triedProviders, nextProvider.id]
        );
      } else {
        console.log("✗ No more fallback providers available.");
      }
    }

    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error(`Failed to start ${provider.name}:`, err.message);
    process.exit(1);
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });
}
