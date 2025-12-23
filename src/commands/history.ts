/**
 * History Command
 * Show session history
 */

import chalk from "chalk";
import { getProviderById } from "../lib/provider-config.js";
import { getSessions, clearSessions } from "../lib/config.js";

export interface HistoryOptions {
  clear?: boolean;
}

export function historyCommand(options: HistoryOptions): void {
  if (options.clear) {
    clearSessions();
    console.log(chalk.green("✓ Session history cleared."));
    return;
  }

  const sessions = getSessions();
  if (sessions.length === 0) {
    console.log(chalk.gray("\n  No session history.\n"));
    return;
  }

  console.log(chalk.cyan.bold("\n  Session History\n"));
  sessions.slice(0, 20).forEach((s, i) => {
    const provider = getProviderById(s.providerId);
    const date = new Date(s.timestamp);
    const timeStr = date.toLocaleString();
    const flags = [];
    if (s.continueSession) flags.push("-c");
    if (s.skipPermissions) flags.push("-y");
    const flagStr = flags.length ? chalk.gray(` ${flags.join(" ")}`) : "";
    console.log(
      `  ${chalk.gray((i + 1).toString().padStart(2))}. ${chalk.cyan(provider?.name || s.providerId)} ${chalk.gray(timeStr)}${flagStr}`
    );
  });
  console.log("");
}
