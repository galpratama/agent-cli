/**
 * Tag Commands
 * Manage provider tags for organization
 */

import chalk from "chalk";
import { getProviderById } from "../lib/provider-config.js";
import {
  getAllTags,
  getTagsForProvider,
  addTagToProvider,
  removeTagFromProvider,
  getProvidersByTag,
} from "../lib/config.js";
import { getProviderOrExit } from "../lib/utils.js";

export interface TagOptions {
  remove?: string;
  list?: boolean;
  find?: string;
}

export function tagCommand(
  providerId?: string,
  tags?: string[],
  options?: TagOptions
): void {
  // List all tags
  if (options?.list) {
    const allTags = getAllTags();
    if (allTags.length === 0) {
      console.log(chalk.gray("\n  No tags defined.\n"));
      console.log(chalk.gray("  Usage: agent tag <provider-id> <tag1> <tag2>..."));
      console.log(chalk.gray("  Example: agent tag openrouter fast cheap\n"));
      return;
    }

    console.log(chalk.cyan.bold("\n  All Tags\n"));
    allTags.forEach((tag) => {
      const providers = getProvidersByTag(tag);
      console.log(
        `  ${chalk.yellow(`#${tag}`)} (${providers.length} provider${providers.length === 1 ? "" : "s"})`
      );
    });
    console.log("");
    return;
  }

  // Find providers by tag
  if (options?.find) {
    const providers = getProvidersByTag(options.find);
    if (providers.length === 0) {
      console.log(chalk.gray(`\n  No providers with tag "${options.find}".\n`));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Providers with tag #${options.find}\n`));
    providers.forEach((pid) => {
      const provider = getProviderById(pid);
      console.log(`  ${chalk.cyan(pid.padEnd(15))} ${provider?.description || ""}`);
    });
    console.log("");
    return;
  }

  // Show tags for provider
  if (providerId && (!tags || tags.length === 0) && !options?.remove) {
    const provider = getProviderOrExit(providerId);

    const providerTags = getTagsForProvider(providerId);
    if (providerTags.length === 0) {
      console.log(chalk.gray(`\n  No tags for ${providerId}.\n`));
    } else {
      console.log(
        `\n  ${chalk.cyan(providerId)}: ${providerTags.map((t) => chalk.yellow(`#${t}`)).join(" ")}\n`
      );
    }
    return;
  }

  // Remove tag
  if (options?.remove && providerId) {
    removeTagFromProvider(providerId, options.remove);
    console.log(chalk.green(`✓ Removed tag #${options.remove} from ${providerId}`));
    return;
  }

  // Add tags
  if (providerId && tags && tags.length > 0) {
    const provider = getProviderOrExit(providerId);

    // Handle comma-separated tags in a single argument
    const allTags = tags.flatMap((t) =>
      t
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );

    allTags.forEach((tag) => {
      addTagToProvider(providerId, tag);
    });

    console.log(
      chalk.green(
        `✓ Added tags to ${providerId}: ${allTags.map((t) => `#${t}`).join(" ")}`
      )
    );
    return;
  }

  // No arguments - show help
  console.log(chalk.cyan.bold("\n  Tag Management\n"));
  console.log("  Usage:");
  console.log("    agent tag -l                    List all tags");
  console.log("    agent tag -f <tag>              Find providers with tag");
  console.log("    agent tag <provider>            Show tags for provider");
  console.log("    agent tag <provider> <tags...>  Add tags to provider");
  console.log("    agent tag <provider> -r <tag>   Remove tag from provider\n");
}
