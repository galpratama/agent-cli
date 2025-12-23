/**
 * Check Command
 * Validates all provider configurations
 */

import chalk from "chalk";
import { getAllProviders } from "../lib/provider-config.js";
import { validateAllProviders, healthCheckAllProviders, HealthCheckResult } from "../lib/validate.js";

export interface CheckOptions {
  deep?: boolean;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const isDeep = options.deep;
  const title = isDeep
    ? "Deep Health Check (API Testing)"
    : "Checking Provider Configurations";

  console.log(chalk.cyan.bold(`\n  ${title}\n`));

  if (isDeep) {
    console.log(chalk.dim("  Testing API endpoints... This may take a moment.\n"));
  }

  const allProviders = getAllProviders();
  const results = isDeep
    ? await healthCheckAllProviders(allProviders)
    : await validateAllProviders(allProviders);

  let allValid = true;

  // Sort alphabetically by name
  const sortedProviders = [...allProviders].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedProviders.forEach((provider) => {
    const result = results.get(provider.id);
    const status = result?.valid ? chalk.green("✓") : chalk.red("✗");
    const message = result?.message || "Unknown";

    console.log(`  ${chalk.bold(provider.name)}`);
    console.log(`    ${status} ${message}`);

    // Show additional health check info for deep mode
    if (isDeep && result) {
      const healthResult = result as HealthCheckResult;

      if (healthResult.latencyMs !== undefined) {
        const latencyColor =
          healthResult.latencyMs < 1000
            ? chalk.green
            : healthResult.latencyMs < 3000
              ? chalk.yellow
              : chalk.red;
        console.log(
          `    ${chalk.dim("Latency:")} ${latencyColor(`${healthResult.latencyMs}ms`)}`
        );
      }

      if (healthResult.modelName) {
        const modelStatus = healthResult.modelAvailable
          ? chalk.green("✓")
          : chalk.red("✗");
        console.log(
          `    ${chalk.dim("Model:")} ${healthResult.modelName} ${modelStatus}`
        );
      }
    }

    console.log();

    if (!result?.valid) {
      allValid = false;
    }
  });

  if (allValid) {
    console.log(chalk.green("  ✓ All providers are properly configured!\n"));
  } else {
    console.log(
      chalk.yellow(
        "  Some providers need configuration. Set missing API keys in your environment.\n"
      )
    );
  }

  if (!isDeep) {
    console.log(
      chalk.dim("  Tip: Use --deep to test API latency and model availability.\n")
    );
  }
}
