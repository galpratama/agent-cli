/**
 * Profile Commands
 * Manage saved provider profiles
 */

import chalk from "chalk";
import { getProviderById } from "../lib/provider-config.js";
import { launchClaude } from "../lib/launcher.js";
import {
  getProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  setLastProvider,
  recordUsage,
  addSession,
} from "../lib/config.js";
import { getProviderOrExit } from "../lib/utils.js";

/**
 * Launch a saved profile
 */
export async function profileLaunchCommand(name: string): Promise<void> {
  const profile = getProfile(name);
  if (!profile) {
    console.error(chalk.red(`Profile not found: ${name}`));
    console.log("\nAvailable profiles:");
    getProfiles().forEach((p) => {
      console.log(`  ${chalk.cyan(p.name)} - ${p.providerId}`);
    });
    process.exit(1);
  }

  const provider = getProviderOrExit(profile.providerId);

  console.log(chalk.cyan(`> Launching profile "${name}" (${provider.name})...`));
  setLastProvider(provider.id);
  recordUsage(provider.id);
  addSession({
    providerId: provider.id,
    timestamp: Date.now(),
    continueSession: profile.continueSession,
    skipPermissions: profile.skipPermissions,
  });

  await launchClaude({
    provider,
    args: profile.args || [],
    continueSession: profile.continueSession,
    skipPermissions: profile.skipPermissions,
  });
}

export interface ProfileSaveOptions {
  provider: string;
  continue?: boolean;
  skipPermissions?: boolean;
}

/**
 * Save a new profile
 */
export function profileSaveCommand(
  name: string,
  options: ProfileSaveOptions
): void {
  const provider = getProviderOrExit(options.provider);

  saveProfile({
    name,
    providerId: options.provider,
    continueSession: options.continue,
    skipPermissions: options.skipPermissions,
  });

  console.log(chalk.green(`✓ Profile "${name}" saved!`));
  console.log(`  Provider: ${provider.name}`);
  if (options.continue) console.log(`  --continue: enabled`);
  if (options.skipPermissions) console.log(`  --skip-permissions: enabled`);
}

/**
 * List all saved profiles
 */
export function profileListCommand(): void {
  const profiles = getProfiles();
  if (profiles.length === 0) {
    console.log(
      chalk.gray("\n  No profiles saved. Use 'agent profile-save' to create one.\n")
    );
    return;
  }

  console.log(chalk.cyan.bold("\n  Saved Profiles\n"));
  profiles.forEach((p) => {
    const flags = [];
    if (p.continueSession) flags.push("--continue");
    if (p.skipPermissions) flags.push("--skip-perms");
    const flagStr = flags.length ? chalk.gray(` [${flags.join(", ")}]`) : "";
    console.log(`  ${chalk.cyan(p.name.padEnd(15))} ${p.providerId}${flagStr}`);
  });
  console.log("");
}

/**
 * Delete a saved profile
 */
export function profileDeleteCommand(name: string): void {
  if (deleteProfile(name)) {
    console.log(chalk.green(`✓ Profile "${name}" deleted.`));
  } else {
    console.error(chalk.red(`Profile not found: ${name}`));
  }
}
