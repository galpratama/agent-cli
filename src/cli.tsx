#!/usr/bin/env node
/**
 * AI Agent CLI
 * Beautiful TUI for launching Claude with multiple providers
 */

import React from "react";
import { render } from "ink";
import { Command } from "commander";
import chalk from "chalk";
import { spawnSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { App } from "./components/App.js";
import { DirectLaunchApp } from "./components/DirectLaunchApp.js";
import { ProviderConfigApp } from "./components/ProviderConfigApp.js";
import { Provider } from "./lib/providers.js";
import {
  getAllProviders,
  getProviderById,
  getConfigPath,
  loadProviderConfig,
  saveProviderConfig,
  addCustomProvider,
  removeCustomProvider,
  disableProvider,
  enableProvider,
  isProviderDisabled,
  createProviderTemplate,
  validateProvider,
} from "./lib/provider-config.js";
import { validateAllProviders, healthCheckAllProviders, HealthCheckResult } from "./lib/validate.js";
import { launchClaude } from "./lib/launcher.js";
import { getProviderOrExit } from "./lib/utils.js";
import {
  getLastProvider,
  setLastProvider,
  getProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  getSessions,
  addSession,
  clearSessions,
  getUsageStats,
  recordUsage,
  clearUsageStats,
  Profile,
  getAliases,
  setAlias,
  removeAlias,
  getProviderByAlias,
  getAllTags,
  getTagsForProvider,
  addTagToProvider,
  removeTagFromProvider,
  getProvidersByTag,
  getPinnedProviders,
  togglePinned,
  isPinned,
} from "./lib/config.js";
import {
  listCommand,
  checkCommand,
  profileLaunchCommand,
  profileSaveCommand,
  profileListCommand,
  profileDeleteCommand,
  aliasCommand,
  tagCommand,
  pinCommand,
  historyCommand,
  statsCommand,
} from "./commands/index.js";

// Get the package directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = resolve(__dirname, "..");

// Helper to run commands safely
function runCommand(command: string, args: string[], cwd: string): boolean {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  return result.status === 0;
}

const program = new Command();

program
  .name("agent")
  .description("AI Agent CLI - Launch Claude with multiple providers")
  .version("1.1.5")
  .option("-d, --debug", "Show debug information")
  .option("-c, --continue", "Resume the last Claude session")
  .option("-y, --dangerously-skip-permissions", "Skip permission prompts (auto-approve mode)")
  .option("-f, --fallback", "Auto-fallback to next provider on failure")
  .argument("[provider]", "Provider to use (skip selection)")
  .argument("[args...]", "Arguments to pass to the AI CLI")
  .action(async (providerArg?: string, args?: string[]) => {
    const opts = program.opts();
    const debug = opts.debug;
    const continueSession = opts.continue;
    const skipPermissions = opts.dangerouslySkipPermissions;
    const fallback = opts.fallback;

    // If provider specified, launch directly
    if (providerArg) {
      const allProviders = getAllProviders();
      const provider = getProviderById(providerArg);
      if (!provider) {
        console.error(chalk.red(`Unknown provider: ${providerArg}`));
        console.log("\nAvailable providers:");
        allProviders.forEach((p) => {
          console.log(`  ${p.icon} ${chalk.cyan(p.id)} - ${p.description}`);
        });
        process.exit(1);
      }

      // If provider has multiple models, show model picker
      if (provider.models && provider.models.length > 0) {
        const instance = render(
          <DirectLaunchApp
            provider={provider}
            args={args || []}
            debug={debug}
            continueSession={continueSession}
            skipPermissions={skipPermissions}
            fallback={fallback}
          />
        );
        await instance.waitUntilExit();
        return;
      }

      // No models, launch directly
      console.log(
        chalk.cyan(`> Launching ${provider.name}...`)
      );
      setLastProvider(provider.id);
      recordUsage(provider.id);
      addSession({
        providerId: provider.id,
        timestamp: Date.now(),
        continueSession,
        skipPermissions,
      });

      await launchClaude({
        provider,
        args: args || [],
        debug,
        continueSession,
        skipPermissions,
        fallback,
      });
      return;
    }

    // Otherwise show interactive UI
    // Clear terminal and use alternate screen buffer for fullscreen experience
    process.stdout.write("\x1b[?1049h"); // Switch to alternate screen buffer
    process.stdout.write("\x1b[H");      // Move cursor to home position

    const instance = render(
      <App
        args={args || []}
        debug={debug}
        continueSession={continueSession}
        skipPermissions={skipPermissions}
        fallback={fallback}
      />
    );

    // Restore main screen buffer when app exits
    instance.waitUntilExit().then(() => {
      process.stdout.write("\x1b[?1049l"); // Switch back to main screen buffer
    });
  });

program
  .command("list")
  .alias("ls")
  .description("List all available providers")
  .action(async () => {
    await listCommand();
  });

program
  .command("check")
  .description("Validate all provider configurations")
  .option("-d, --deep", "Perform deep health check (tests API latency and model availability)")
  .action(async (options: { deep?: boolean }) => {
    await checkCommand(options);
  });

program
  .command("last")
  .description("Launch the last used provider")
  .option("-c, --continue", "Resume the last Claude session")
  .option("-y, --dangerously-skip-permissions", "Skip permission prompts")
  .option("-f, --fallback", "Auto-fallback to next provider on failure")
  .argument("[args...]", "Arguments to pass to the AI CLI")
  .action(async (args?: string[], options?: { continue?: boolean; dangerouslySkipPermissions?: boolean; fallback?: boolean }) => {
    const lastProviderId = getLastProvider();
    const provider = getProviderById(lastProviderId);

    if (!provider) {
      console.error(chalk.red("No last provider found. Use 'agent' to select one."));
      process.exit(1);
    }

    console.log(chalk.cyan(`> Launching ${provider.name}...`));
    recordUsage(provider.id);
    addSession({
      providerId: provider.id,
      timestamp: Date.now(),
      continueSession: options?.continue,
      skipPermissions: options?.dangerouslySkipPermissions,
    });

    await launchClaude({
      provider,
      args: args || [],
      debug: program.opts().debug,
      continueSession: options?.continue,
      skipPermissions: options?.dangerouslySkipPermissions,
      fallback: options?.fallback,
    });
  });

program
  .command("update")
  .description("Update the AI Agent CLI to the latest version")
  .action(async () => {
    console.log(chalk.cyan.bold("\n  Updating AI Agent CLI...\n"));

    // Pull latest changes
    console.log(chalk.gray("  Pulling latest changes..."));
    if (!runCommand("git", ["pull"], PACKAGE_DIR)) {
      console.error(chalk.red("\n  ✗ Failed to pull latest changes"));
      process.exit(1);
    }

    // Install dependencies
    console.log(chalk.gray("\n  Installing dependencies..."));
    if (!runCommand("npm", ["install"], PACKAGE_DIR)) {
      console.error(chalk.red("\n  ✗ Failed to install dependencies"));
      process.exit(1);
    }

    // Build
    console.log(chalk.gray("\n  Building..."));
    if (!runCommand("npm", ["run", "build"], PACKAGE_DIR)) {
      console.error(chalk.red("\n  ✗ Failed to build"));
      process.exit(1);
    }

    // Re-link globally
    console.log(chalk.gray("\n  Linking globally..."));
    if (!runCommand("npm", ["link"], PACKAGE_DIR)) {
      console.error(chalk.red("\n  ✗ Failed to link globally"));
      process.exit(1);
    }

    console.log(chalk.green("\n  ✓ AI Agent CLI updated successfully!\n"));
  });

program
  .command("update-tools")
  .alias("ut")
  .description("Update all standalone AI CLI tools")
  .option("-a, --all", "Update all tools (including unavailable ones)")
  .argument("[tool]", "Specific tool to update (e.g., codex, gemini)")
  .action(async (tool?: string, options?: { all?: boolean }) => {
    console.log(chalk.cyan.bold("\n  Updating AI CLI Tools...\n"));

    const allProviders = getAllProviders();
    const standaloneProviders = allProviders.filter((p) => p.type === "standalone" && p.updateCmd);

    // If specific tool requested
    if (tool) {
      const provider = standaloneProviders.find((p) => p.id === tool);
      if (!provider) {
        console.error(chalk.red(`  ✗ Unknown tool: ${tool}`));
        console.log("\n  Available tools:");
        standaloneProviders.forEach((p) => {
          console.log(`    ${chalk.cyan(p.id)} - ${p.description}`);
        });
        process.exit(1);
      }

      console.log(chalk.gray(`  Updating ${provider.name}...`));
      const [cmd, ...args] = provider.updateCmd!;
      if (runCommand(cmd, args, process.cwd())) {
        console.log(chalk.green(`  ✓ ${provider.name} updated successfully!\n`));
      } else {
        console.error(chalk.red(`  ✗ Failed to update ${provider.name}\n`));
        process.exit(1);
      }
      return;
    }

    // Update all tools
    const results = await validateAllProviders(allProviders);
    let updated = 0;
    let failed = 0;

    for (const provider of standaloneProviders) {
      const isAvailable = results.get(provider.id)?.valid;

      // Skip unavailable tools unless --all flag is set
      if (!isAvailable && !options?.all) {
        console.log(chalk.gray(`  ○ Skipping ${provider.name} (not installed)`));
        continue;
      }

      console.log(chalk.gray(`  Updating ${provider.name}...`));
      const [cmd, ...args] = provider.updateCmd!;

      if (runCommand(cmd, args, process.cwd())) {
        console.log(chalk.green(`  ✓ ${provider.name} updated`));
        updated++;
      } else {
        console.log(chalk.red(`  ✗ ${provider.name} failed`));
        failed++;
      }
    }

    console.log("");
    if (failed === 0) {
      console.log(chalk.green(`  ✓ Updated ${updated} tool(s) successfully!\n`));
    } else {
      console.log(chalk.yellow(`  Updated ${updated} tool(s), ${failed} failed\n`));
    }
  });

// ==================== PROFILES ====================

program
  .command("profile")
  .description("Launch a saved profile")
  .argument("<name>", "Profile name to launch")
  .action(async (name: string) => {
    await profileLaunchCommand(name);
  });

program
  .command("profile-save")
  .alias("ps")
  .description("Save a new profile")
  .argument("<name>", "Profile name")
  .requiredOption("-p, --provider <id>", "Provider ID")
  .option("-c, --continue", "Enable --continue flag")
  .option("-y, --skip-permissions", "Enable --dangerously-skip-permissions flag")
  .action((name: string, options: { provider: string; continue?: boolean; skipPermissions?: boolean }) => {
    profileSaveCommand(name, options);
  });

program
  .command("profile-list")
  .alias("pl")
  .description("List all saved profiles")
  .action(() => {
    profileListCommand();
  });

program
  .command("profile-delete")
  .alias("pd")
  .description("Delete a saved profile")
  .argument("<name>", "Profile name to delete")
  .action((name: string) => {
    profileDeleteCommand(name);
  });

// ==================== SESSION HISTORY ====================

program
  .command("history")
  .alias("h")
  .description("Show session history")
  .option("-c, --clear", "Clear session history")
  .action((options: { clear?: boolean }) => {
    historyCommand(options);
  });

// ==================== USAGE STATISTICS ====================

program
  .command("stats")
  .description("Show usage statistics")
  .option("-c, --clear", "Clear usage statistics")
  .action((options: { clear?: boolean }) => {
    statsCommand(options);
  });

// ==================== UPDATE ALL ====================

// ==================== ALIASES ====================

program
  .command("alias")
  .description("Manage provider aliases")
  .argument("[alias]", "Alias name")
  .argument("[provider]", "Provider ID to alias (omit to show current)")
  .option("-r, --remove", "Remove the alias")
  .option("-l, --list", "List all aliases")
  .action((aliasName?: string, providerId?: string, options?: { remove?: boolean; list?: boolean }) => {
    aliasCommand(aliasName, providerId, options);
  });

// ==================== TAGS ====================

program
  .command("tag")
  .description("Manage provider tags")
  .argument("[provider]", "Provider ID to tag")
  .argument("[tags...]", "Tags to add (comma-separated or multiple args)")
  .option("-r, --remove <tag>", "Remove a tag from provider")
  .option("-l, --list", "List all tags")
  .option("-f, --find <tag>", "Find providers with a specific tag")
  .action((providerId?: string, tags?: string[], options?: { remove?: string; list?: boolean; find?: string }) => {
    tagCommand(providerId, tags, options);
  });

// ==================== PINNED PROVIDERS ====================

program
  .command("pin")
  .description("Manage pinned providers (shown at top of list)")
  .argument("[provider]", "Provider ID to pin/unpin")
  .option("-l, --list", "List all pinned providers")
  .action((providerId?: string, options?: { list?: boolean }) => {
    pinCommand(providerId, options);
  });

program
  .command("update-all")
  .alias("ua")
  .description("Update agent-cli and all standalone tools")
  .action(async () => {
    console.log(chalk.cyan.bold("\n  Updating Everything...\n"));

    // Update agent-cli first
    console.log(chalk.bold("  [1/2] Updating Agent CLI..."));
    console.log(chalk.gray("  Pulling latest changes..."));
    if (!runCommand("git", ["pull"], PACKAGE_DIR)) {
      console.error(chalk.red("  ✗ Failed to pull"));
    } else {
      console.log(chalk.gray("  Installing dependencies..."));
      runCommand("npm", ["install"], PACKAGE_DIR);
      console.log(chalk.gray("  Building..."));
      runCommand("npm", ["run", "build"], PACKAGE_DIR);
      console.log(chalk.gray("  Linking..."));
      runCommand("npm", ["link"], PACKAGE_DIR);
      console.log(chalk.green("  ✓ Agent CLI updated"));
    }

    // Update all standalone tools
    console.log(chalk.bold("\n  [2/2] Updating Standalone Tools..."));
    const allProviders = getAllProviders();
    const standaloneProviders = allProviders.filter((p) => p.type === "standalone" && p.updateCmd);
    const results = await validateAllProviders(allProviders);
    let updated = 0;

    for (const provider of standaloneProviders) {
      if (!results.get(provider.id)?.valid) continue;

      console.log(chalk.gray(`  Updating ${provider.name}...`));
      const [cmd, ...args] = provider.updateCmd!;
      if (runCommand(cmd, args, process.cwd())) {
        updated++;
      }
    }

    console.log(chalk.green(`\n  ✓ Updated ${updated} tool(s)\n`));
  });

// ==================== PROVIDER CONFIGURATION ====================

program
  .command("providers")
  .description("Manage provider configuration")
  .option("-l, --list", "List all providers (default)")
  .option("-c, --custom", "List only custom providers")
  .option("-d, --disabled", "List disabled providers")
  .option("-a, --add <id>", "Add a new custom provider")
  .option("-r, --remove <id>", "Remove a custom provider")
  .option("--disable <id>", "Disable a built-in provider")
  .option("--enable <id>", "Enable a disabled provider")
  .option("-e, --export", "Export all providers to JSON")
  .option("--config", "Show config file path")
  .action((options: {
    list?: boolean;
    custom?: boolean;
    disabled?: boolean;
    add?: string;
    remove?: string;
    disable?: string;
    enable?: string;
    export?: boolean;
    config?: boolean;
  }) => {
    const allProviders = getAllProviders();
    const config = loadProviderConfig();

    // Show config path
    if (options.config) {
      console.log(chalk.cyan.bold("\n  Provider Configuration\n"));
      console.log(`  Config file: ${chalk.yellow(getConfigPath())}`);
      console.log(`  Total providers: ${config.providers.length}`);
      console.log(`  Overrides: ${Object.keys(config.overrides).length}`);
      console.log(`  Disabled: ${config.disabled.length}\n`);
      return;
    }

    // Add custom provider
    if (options.add) {
      const id = options.add;
      const errors = validateProvider({ id });
      if (errors.length > 0 && errors[0] !== "name is required") {
        console.error(chalk.red(`Invalid provider ID: ${errors.join(", ")}`));
        process.exit(1);
      }

      // Check if already exists
      if (getProviderById(id)) {
        console.error(chalk.red(`Provider already exists: ${id}`));
        process.exit(1);
      }

      const template = createProviderTemplate(id, id);
      addCustomProvider(template);

      console.log(chalk.green(`✓ Created custom provider: ${id}`));
      console.log(chalk.gray(`\n  Edit the config file to customize:`));
      console.log(chalk.cyan(`  ${getConfigPath()}\n`));
      console.log(chalk.gray("  Provider template:"));
      console.log(chalk.gray(JSON.stringify(template, null, 2)));
      return;
    }

    // Remove provider
    if (options.remove) {
      if (removeCustomProvider(options.remove)) {
        console.log(chalk.green(`✓ Removed provider: ${options.remove}`));
      } else {
        console.error(chalk.red(`Provider not found: ${options.remove}`));
      }
      return;
    }

    // Disable provider
    if (options.disable) {
      const provider = config.providers.find((p) => p.id === options.disable);
      if (!provider) {
        console.error(chalk.red(`Provider not found: ${options.disable}`));
        process.exit(1);
      }

      disableProvider(options.disable);
      console.log(chalk.green(`✓ Disabled provider: ${options.disable}`));
      return;
    }

    // Enable provider
    if (options.enable) {
      if (!isProviderDisabled(options.enable)) {
        console.log(chalk.yellow(`Provider is not disabled: ${options.enable}`));
        return;
      }

      enableProvider(options.enable);
      console.log(chalk.green(`✓ Enabled provider: ${options.enable}`));
      return;
    }

    // Export all providers
    if (options.export) {
      console.log(JSON.stringify(allProviders, null, 2));
      return;
    }

    // List disabled providers
    if (options.disabled) {
      console.log(chalk.cyan.bold("\n  Disabled Providers\n"));
      if (config.disabled.length === 0) {
        console.log(chalk.gray("  No disabled providers.\n"));
      } else {
        config.disabled.forEach((id) => {
          const provider = config.providers.find((p) => p.id === id);
          console.log(`  ${chalk.red("○")} ${chalk.cyan(id.padEnd(15))} ${provider?.description || ""}`);
        });
        console.log(chalk.gray("\n  Use --enable <id> to re-enable a provider.\n"));
      }
      return;
    }

    // Default: list all providers
    console.log(chalk.cyan.bold("\n  All Providers\n"));

    // Sort alphabetically
    const sortedProviders = [...allProviders].sort((a, b) => a.name.localeCompare(b.name));

    sortedProviders.forEach((p) => {
      const hasOverride = config.overrides[p.id];
      const marker = hasOverride ? chalk.yellow("●") : chalk.gray("○");
      console.log(`  ${marker} ${chalk.cyan(p.id.padEnd(15))} ${p.description}`);
    });

    console.log(`\n  ${chalk.gray("○")} Provider  ${chalk.yellow("●")} Overridden\n`);
    console.log(chalk.gray(`  Config: ${getConfigPath()}\n`));
  });

// ==================== PROVIDER CONFIG TUI ====================

program
  .command("config")
  .description("Interactive TUI for managing provider configuration")
  .action(() => {
    // Clear terminal and use alternate screen buffer for fullscreen experience
    process.stdout.write("\x1b[?1049h");
    process.stdout.write("\x1b[H");

    const instance = render(<ProviderConfigApp />);

    instance.waitUntilExit().then(() => {
      process.stdout.write("\x1b[?1049l");
    });
  });

// ==================== SETUP WIZARD ====================

program
  .command("setup")
  .description("Setup wizard for configuring providers")
  .argument("[provider]", "Provider to configure")
  .action(async (providerId?: string) => {
    const allProviders = getAllProviders();

    if (!providerId) {
      console.log(chalk.cyan.bold("\n  Provider Setup Wizard\n"));
      console.log("  Usage: agent setup <provider-id>\n");
      console.log("  Available providers that need API keys:\n");

      const sortedProviders = [...allProviders]
        .filter((p) => p.validation.envKey)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const p of sortedProviders) {
        const envKey = p.validation.envKey;
        const isSet = envKey ? !!process.env[envKey] : false;
        const status = isSet ? chalk.green("✓") : chalk.red("○");
        console.log(`  ${status} ${chalk.cyan(p.id.padEnd(12))} ${envKey}`);
      }
      console.log("");
      return;
    }

    const provider = getProviderById(providerId);
    if (!provider) {
      console.error(chalk.red(`Unknown provider: ${providerId}`));
      process.exit(1);
    }

    if (!provider.validation.envKey) {
      console.log(chalk.green(`✓ ${provider.name} doesn't require an API key.`));
      return;
    }

    const envKey = provider.validation.envKey;
    const isSet = !!process.env[envKey];

    console.log(chalk.cyan.bold(`\n  Setup: ${provider.name}\n`));
    console.log(`  Required environment variable: ${chalk.yellow(envKey)}`);
    console.log(`  Current status: ${isSet ? chalk.green("Set") : chalk.red("Not set")}\n`);

    if (!isSet) {
      console.log("  To configure, add to your shell profile (~/.zshrc or ~/.bashrc):");
      console.log(chalk.cyan(`\n  export ${envKey}="your-api-key-here"\n`));
    }
  });

program.parse();
