/**
 * Tests for Utility Functions
 * @module utils.test
 */

import { describe, it, expect } from "vitest";
import {
  fuzzyMatch,
  getSafeTerminalHeight,
  calculateListHeight,
  DEFAULT_TERMINAL_HEIGHT,
  MIN_LIST_HEIGHT,
} from "./utils.js";

describe("fuzzyMatch", () => {
  it("should return true for empty query", () => {
    expect(fuzzyMatch("hello", "")).toBe(true);
  });

  it("should return false for empty text", () => {
    expect(fuzzyMatch("", "query")).toBe(false);
  });

  it("should match direct substrings", () => {
    expect(fuzzyMatch("hello world", "world")).toBe(true);
    expect(fuzzyMatch("hello world", "llo")).toBe(true);
  });

  it("should match case-insensitively", () => {
    expect(fuzzyMatch("Hello World", "hello")).toBe(true);
    expect(fuzzyMatch("hello world", "HELLO")).toBe(true);
  });

  it("should match fuzzy patterns", () => {
    expect(fuzzyMatch("claude", "cld")).toBe(true);
    expect(fuzzyMatch("openrouter", "opr")).toBe(true);
    expect(fuzzyMatch("anthropic", "antp")).toBe(true);
  });

  it("should not match if query is longer than text", () => {
    expect(fuzzyMatch("hi", "hello")).toBe(false);
  });

  it("should not match if characters are not in order", () => {
    expect(fuzzyMatch("abc", "cba")).toBe(false);
    expect(fuzzyMatch("hello", "lehol")).toBe(false);
  });
});

describe("getSafeTerminalHeight", () => {
  it("should return the value for valid positive numbers", () => {
    expect(getSafeTerminalHeight(24)).toBe(24);
    expect(getSafeTerminalHeight(50)).toBe(50);
    expect(getSafeTerminalHeight(100)).toBe(100);
  });

  it("should floor decimal values", () => {
    expect(getSafeTerminalHeight(24.5)).toBe(24);
    expect(getSafeTerminalHeight(50.9)).toBe(50);
  });

  it("should return default for undefined", () => {
    expect(getSafeTerminalHeight(undefined)).toBe(DEFAULT_TERMINAL_HEIGHT);
  });

  it("should return default for zero or negative", () => {
    expect(getSafeTerminalHeight(0)).toBe(DEFAULT_TERMINAL_HEIGHT);
    expect(getSafeTerminalHeight(-10)).toBe(DEFAULT_TERMINAL_HEIGHT);
  });

  it("should return default for NaN", () => {
    expect(getSafeTerminalHeight(NaN)).toBe(DEFAULT_TERMINAL_HEIGHT);
  });

  it("should return default for Infinity", () => {
    expect(getSafeTerminalHeight(Infinity)).toBe(DEFAULT_TERMINAL_HEIGHT);
    expect(getSafeTerminalHeight(-Infinity)).toBe(DEFAULT_TERMINAL_HEIGHT);
  });
});

describe("calculateListHeight", () => {
  it("should subtract reserved lines from terminal height", () => {
    expect(calculateListHeight(50, 10)).toBe(40);
    expect(calculateListHeight(30, 12)).toBe(18);
  });

  it("should enforce minimum list height", () => {
    expect(calculateListHeight(10, 20)).toBe(MIN_LIST_HEIGHT);
    expect(calculateListHeight(5, 10)).toBe(MIN_LIST_HEIGHT);
  });

  it("should floor the result", () => {
    expect(calculateListHeight(25, 10)).toBe(15);
  });
});
