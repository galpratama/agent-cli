/**
 * List Command
 * Lists all available providers with their status
 */

import chalk from "chalk";
import { getAllProviders } from "../lib/provider-config.js";
import { validateAllProviders } from "../lib/validate.js";
import { getLastProvider } from "../lib/config.js";

export async function listCommand(): Promise<void> {
  console.log(chalk.cyan.bold("\n  AI Agent - Available Providers\n"));

  const allProviders = getAllProviders();
  const results = await validateAllProviders(allProviders);
  const lastProvider = getLastProvider();

  // Sort alphabetically by name
  const sortedProviders = [...allProviders].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedProviders.forEach((provider) => {
    const result = results.get(provider.id);
    const status = result?.valid ? chalk.green("●") : chalk.red("○");
    const isLast = provider.id === lastProvider;
    const lastIndicator = isLast ? chalk.blue(" ↺") : "";

    console.log(
      `  ${status} ${chalk.cyan(provider.id.padEnd(14))} ${provider.description}${lastIndicator}`
    );
  });

  console.log(
    `\n  ${chalk.green("●")} Ready  ${chalk.red("○")} Unavailable  ${chalk.blue("↺")} Last used\n`
  );
}
