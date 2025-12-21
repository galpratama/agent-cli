/**
 * Error Handling Utilities
 * Provides consistent error logging and handling across the codebase
 */

import { existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Log file location
const LOG_DIR = join(homedir(), ".agent-cli", "logs");
const LOG_FILE = join(LOG_DIR, "error.log");

// Maximum log file entries to keep (prevents unbounded growth)
const MAX_LOG_LINES = 1000;

export type ErrorContext = {
  operation: string;
  providerId?: string;
  filePath?: string;
  url?: string;
  command?: string;
  [key: string]: unknown;
};

export interface LoggedError {
  timestamp: string;
  operation: string;
  message: string;
  context?: ErrorContext;
  stack?: string;
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Format error for logging
 */
function formatError(error: unknown, context: ErrorContext): LoggedError {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    timestamp,
    operation: context.operation,
    message,
    context,
    stack,
  };
}

/**
 * Write error to log file
 */
function writeToLog(entry: LoggedError): void {
  try {
    ensureLogDir();
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(LOG_FILE, line);
  } catch {
    // If we can't write to the log file, fail silently
    // (we don't want logging failures to crash the app)
  }
}

/**
 * Log an error with context
 * Returns the error message for display to user if needed
 */
export function logError(error: unknown, context: ErrorContext): string {
  const entry = formatError(error, context);
  writeToLog(entry);
  return entry.message;
}

/**
 * Create a user-friendly error message
 */
export function formatUserError(operation: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${operation} failed: ${message}`;
}

/**
 * Get the log file path (for display purposes)
 */
export function getLogPath(): string {
  return LOG_FILE;
}

/**
 * Wrap an async operation with error logging
 * Returns undefined on error instead of throwing
 */
export async function withErrorLogging<T>(
  operation: string,
  context: Omit<ErrorContext, "operation">,
  fn: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logError(error, { operation, ...context });
    return undefined;
  }
}

/**
 * Wrap a sync operation with error logging
 * Returns undefined on error instead of throwing
 */
export function withErrorLoggingSync<T>(
  operation: string,
  context: Omit<ErrorContext, "operation">,
  fn: () => T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    logError(error, { operation, ...context });
    return undefined;
  }
}
