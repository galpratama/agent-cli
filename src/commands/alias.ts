/**
 * Alias Commands
 * Manage provider aliases
 */

import chalk from "chalk";
import { getAllProviders, getProviderById } from "../lib/provider-config.js";
import {
  getAliases,
  setAlias,
  removeAlias,
  getProviderByAlias,
} from "../lib/config.js";

export interface AliasOptions {
  remove?: boolean;
  list?: boolean;
}

export function aliasCommand(
  aliasName?: string,
  providerId?: string,
  options?: AliasOptions
): void {
  // List all aliases
  if (options?.list || (!aliasName && !providerId)) {
    const aliases = getAliases();
    if (aliases.length === 0) {
      console.log(chalk.gray("\n  No aliases defined.\n"));
      console.log(chalk.gray("  Usage: agent alias <name> <provider-id>"));
      console.log(chalk.gray("  Example: agent alias gpt openrouter-gpt4\n"));
      return;
    }

    console.log(chalk.cyan.bold("\n  Provider Aliases\n"));
    aliases.forEach(({ alias, providerId: pid }) => {
      const provider = getProviderById(pid);
      const status = provider ? chalk.green("●") : chalk.red("○");
      console.log(`  ${status} ${chalk.cyan(alias.padEnd(12))} → ${pid}`);
    });
    console.log(
      chalk.gray(`\n  ${chalk.green("●")} Valid  ${chalk.red("○")} Provider not found\n`)
    );
    return;
  }

  // Remove alias
  if (options?.remove && aliasName) {
    if (removeAlias(aliasName)) {
      console.log(chalk.green(`✓ Alias "${aliasName}" removed.`));
    } else {
      console.error(chalk.red(`Alias not found: ${aliasName}`));
    }
    return;
  }

  // Show single alias
  if (aliasName && !providerId) {
    const targetId = getProviderByAlias(aliasName);
    if (targetId) {
      const provider = getProviderById(targetId);
      console.log(
        `  ${chalk.cyan(aliasName)} → ${targetId}${provider ? "" : chalk.red(" (not found)")}`
      );
    } else {
      console.log(chalk.gray(`  Alias "${aliasName}" not defined.`));
    }
    return;
  }

  // Create/update alias
  if (aliasName && providerId) {
    const provider = getProviderById(providerId);
    if (!provider) {
      console.error(chalk.red(`Unknown provider: ${providerId}`));
      console.log("\nAvailable providers:");
      getAllProviders()
        .slice(0, 10)
        .forEach((p) => {
          console.log(`  ${chalk.cyan(p.id)}`);
        });
      process.exit(1);
    }

    setAlias(aliasName, providerId);
    console.log(chalk.green(`✓ Alias created: ${aliasName} → ${providerId}`));
  }
}
