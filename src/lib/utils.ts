/**
 * Shared Utility Functions
 * Common utilities used across components and hooks
 */

import chalk from "chalk";
import { getProviderById, getAllProviders } from "./provider-config.js";
import type { Provider } from "./providers.js";

/**
 * Default terminal height when stdout.rows is unavailable
 */
export const DEFAULT_TERMINAL_HEIGHT = 24;

/**
 * Minimum list height for scrollable lists
 */
export const MIN_LIST_HEIGHT = 5;

/**
 * Optimized fuzzy match function with early exit
 * Checks if all characters in query appear in text in order
 *
 * @param text - The text to search in
 * @param query - The query to match
 * @returns true if query matches text
 */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  if (!text) return false;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Direct substring match (fast path)
  if (lowerText.includes(lowerQuery)) return true;

  // Early exit: if query is longer than text, can't match
  if (lowerQuery.length > lowerText.length) return false;

  // Fuzzy match: all query chars appear in order
  let queryIndex = 0;
  const queryLen = lowerQuery.length;
  const textLen = lowerText.length;

  for (let i = 0; i < textLen && queryIndex < queryLen; i++) {
    if (lowerText.charCodeAt(i) === lowerQuery.charCodeAt(queryIndex)) {
      queryIndex++;
    }
  }
  return queryIndex === queryLen;
}

/**
 * Get a safe terminal height value
 * Handles edge cases where stdout.rows is undefined, NaN, or invalid
 *
 * @param rows - The raw rows value from stdout
 * @returns A valid positive integer for terminal height
 */
export function getSafeTerminalHeight(rows: number | undefined): number {
  if (typeof rows === "number" && Number.isFinite(rows) && rows > 0) {
    return Math.floor(rows);
  }
  return DEFAULT_TERMINAL_HEIGHT;
}

/**
 * Calculate visible list height based on terminal size
 *
 * @param terminalHeight - Current terminal height
 * @param reservedLines - Lines reserved for UI elements (header, footer, etc.)
 * @returns Safe list height (minimum of MIN_LIST_HEIGHT)
 */
export function calculateListHeight(terminalHeight: number, reservedLines: number): number {
  return Math.max(MIN_LIST_HEIGHT, Math.floor(terminalHeight - reservedLines));
}

/**
 * Get a provider by ID or exit with an error
 * Displays available providers if not found
 *
 * @param providerId - The provider ID to look up
 * @returns The provider object
 * @throws Exits process with code 1 if not found
 */
export function getProviderOrExit(providerId: string): Provider {
  const provider = getProviderById(providerId);

  if (!provider) {
    const allProviders = getAllProviders();
    console.error(chalk.red(`Unknown provider: ${providerId}`));
    console.log("\nAvailable providers:");
    allProviders.forEach((p) => {
      console.log(`  ${p.icon} ${chalk.cyan(p.id)} - ${p.description}`);
    });
    process.exit(1);
  }

  return provider;
}

/**
 * Suggest similar providers when a provider is not found
 * Uses fuzzy matching to find potential matches
 *
 * @param query - The unknown provider ID
 * @returns Array of similar provider IDs
 */
export function suggestSimilarProviders(query: string): string[] {
  const allProviders = getAllProviders();
  return allProviders
    .filter((p) => fuzzyMatch(p.id, query) || fuzzyMatch(p.name, query))
    .map((p) => p.id)
    .slice(0, 3);
}
