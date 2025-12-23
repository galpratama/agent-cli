/**
 * Stats Command
 * Show usage statistics
 */

import chalk from "chalk";
import { getProviderById } from "../lib/provider-config.js";
import { getUsageStats, clearUsageStats } from "../lib/config.js";

export interface StatsOptions {
  clear?: boolean;
}

export function statsCommand(options: StatsOptions): void {
  if (options.clear) {
    clearUsageStats();
    console.log(chalk.green("✓ Usage statistics cleared."));
    return;
  }

  const stats = getUsageStats();
  const entries = Object.entries(stats).sort((a, b) => b[1].count - a[1].count);

  if (entries.length === 0) {
    console.log(chalk.gray("\n  No usage statistics yet.\n"));
    return;
  }

  console.log(chalk.cyan.bold("\n  Usage Statistics\n"));
  entries.forEach(([providerId, data]) => {
    const provider = getProviderById(providerId);
    const lastUsed = new Date(data.lastUsed).toLocaleDateString();
    console.log(
      `  ${chalk.cyan((provider?.name || providerId).padEnd(15))} ${data.count.toString().padStart(4)} uses  ${chalk.gray(`Last: ${lastUsed}`)}`
    );
  });
  console.log("");
}
