/**
 * Pin Commands
 * Manage pinned providers (shown at top of list)
 */

import chalk from "chalk";
import { getProviderById } from "../lib/provider-config.js";
import { getPinnedProviders, togglePinned } from "../lib/config.js";
import { getProviderOrExit } from "../lib/utils.js";

export interface PinOptions {
  list?: boolean;
}

export function pinCommand(providerId?: string, options?: PinOptions): void {
  // List pinned providers
  if (options?.list || !providerId) {
    const pinned = getPinnedProviders();
    if (pinned.length === 0) {
      console.log(chalk.gray("\n  No pinned providers.\n"));
      console.log(chalk.gray("  Usage: agent pin <provider-id>"));
      console.log(chalk.gray("  Pinned providers appear at the top of the list.\n"));
      return;
    }

    console.log(chalk.cyan.bold("\n  Pinned Providers\n"));
    pinned.forEach((pid) => {
      const provider = getProviderById(pid);
      console.log(
        `  📌 ${chalk.cyan(pid.padEnd(15))} ${provider?.description || chalk.red("(not found)")}`
      );
    });
    console.log(chalk.gray("\n  Use 'agent pin <id>' again to unpin.\n"));
    return;
  }

  // Toggle pin
  const provider = getProviderOrExit(providerId);

  const nowPinned = togglePinned(providerId);
  if (nowPinned) {
    console.log(chalk.green(`📌 Pinned: ${providerId}`));
  } else {
    console.log(chalk.green(`✓ Unpinned: ${providerId}`));
  }
}
