/**
 * useProviderNavigation Hook
 * Manages selection, scrolling, and virtual list navigation
 */

import { useState, useEffect, useCallback } from "react";
import { useStdout } from "ink";
import { Provider } from "../lib/providers.js";
import { getLastProvider } from "../lib/config.js";
import { getSafeTerminalHeight, calculateListHeight } from "../lib/utils.js";

export interface UseProviderNavigationOptions {
  filteredProviders: Provider[];
  searchQuery: string;
  categoryFilter: string | null;
  showOnlyValid: boolean;
  reservedLines?: number;
}

export interface UseProviderNavigationResult {
  // State
  selectedIndex: number;
  scrollOffset: number;
  listHeight: number;
  terminalHeight: number;

  // Actions
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  moveUp: () => void;
  moveDown: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  selectByNumber: (num: number) => void;
}

export function useProviderNavigation(options: UseProviderNavigationOptions): UseProviderNavigationResult {
  const {
    filteredProviders,
    searchQuery,
    categoryFilter,
    showOnlyValid,
    reservedLines = 28,
  } = options;

  const { stdout } = useStdout();

  // Terminal height with safe default
  const [terminalHeight, setTerminalHeight] = useState(() =>
    getSafeTerminalHeight(process.stdout.rows)
  );

  // Selection and scroll state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate list height
  const listHeight = calculateListHeight(terminalHeight, reservedLines);

  // Listen for terminal resize events
  useEffect(() => {
    const handleResize = () => {
      const rows = stdout?.rows ?? process.stdout.rows;
      setTerminalHeight(getSafeTerminalHeight(rows));
    };

    handleResize();
    stdout?.on("resize", handleResize);
    process.stdout.on("resize", handleResize);

    return () => {
      stdout?.off("resize", handleResize);
      process.stdout.off("resize", handleResize);
    };
  }, [stdout]);

  // Auto-select last used provider on mount
  useEffect(() => {
    const lastProvider = getLastProvider();
    if (lastProvider && !searchQuery && !categoryFilter) {
      const index = filteredProviders.findIndex((p) => p.id === lastProvider);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    }
  }, []);

  // Reset selection when filters change
  useEffect(() => {
    if (selectedIndex >= filteredProviders.length) {
      setSelectedIndex(Math.max(0, filteredProviders.length - 1));
    }
  }, [filteredProviders.length, selectedIndex]);

  // Keep scroll offset synchronized with selection (virtual scrolling)
  useEffect(() => {
    if (filteredProviders.length === 0) {
      setScrollOffset(0);
      return;
    }

    const safeIndex = Math.max(0, Math.min(selectedIndex, filteredProviders.length - 1));

    if (safeIndex < scrollOffset) {
      setScrollOffset(safeIndex);
    } else if (safeIndex >= scrollOffset + listHeight) {
      setScrollOffset(Math.max(0, safeIndex - listHeight + 1));
    }
  }, [selectedIndex, scrollOffset, listHeight, filteredProviders.length]);

  // Clamp scroll offset when terminal resizes or list shrinks
  useEffect(() => {
    const maxOffset = Math.max(0, filteredProviders.length - listHeight);
    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [listHeight, filteredProviders.length, scrollOffset]);

  // Reset scroll offset when filters change
  useEffect(() => {
    setScrollOffset(0);
  }, [searchQuery, categoryFilter, showOnlyValid]);

  // Navigation actions
  const moveUp = useCallback(() => {
    setSelectedIndex((prev) => prev > 0 ? prev - 1 : filteredProviders.length - 1);
  }, [filteredProviders.length]);

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) => prev < filteredProviders.length - 1 ? prev + 1 : 0);
  }, [filteredProviders.length]);

  const goToFirst = useCallback(() => {
    if (filteredProviders.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredProviders.length]);

  const goToLast = useCallback(() => {
    if (filteredProviders.length > 0) {
      setSelectedIndex(filteredProviders.length - 1);
    }
  }, [filteredProviders.length]);

  const selectByNumber = useCallback((num: number) => {
    // num is 0-indexed (0 = first, 9 = tenth)
    if (num < filteredProviders.length) {
      setSelectedIndex(num);
    }
  }, [filteredProviders.length]);

  return {
    selectedIndex,
    scrollOffset,
    listHeight,
    terminalHeight,
    setSelectedIndex,
    moveUp,
    moveDown,
    goToFirst,
    goToLast,
    selectByNumber,
  };
}
