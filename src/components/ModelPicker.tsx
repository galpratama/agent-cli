/**
 * ModelPicker Component
 * Interactive list for selecting a model from multi-model providers
 *
 * Features:
 * - Keyboard navigation (arrows, vim keys)
 * - Fuzzy search (/)
 * - Pre-selects last used model
 * - Esc to go back to provider selection
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { Provider } from "../lib/providers.js";
import { getLastModelForProvider } from "../lib/config.js";
import { fuzzyMatch, getSafeTerminalHeight, calculateListHeight } from "../lib/utils.js";

type PricingFilter = "all" | "free" | "paid";

const PRICING_FILTER_LABELS: Record<PricingFilter, string> = {
  all: "All",
  free: "Free",
  paid: "Paid",
};

const PRICING_FILTER_COLORS: Record<PricingFilter, string> = {
  all: "white",
  free: "green",
  paid: "yellow",
};

function isModelFree(model: string): boolean {
  return model.endsWith(":free");
}

interface ModelPickerProps {
  provider: Provider;
  onSelect: (model: string) => void;
  onBack: () => void;
}

export function ModelPicker({
  provider,
  onSelect,
  onBack,
}: ModelPickerProps): React.ReactElement {
  const models = provider.models || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>("all");
  const [scrollOffset, setScrollOffset] = useState(0);
  const [terminalHeight, setTerminalHeight] = useState(() =>
    getSafeTerminalHeight(process.stdout.rows)
  );

  const { stdout } = useStdout();

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

  // Reserve lines for header, footer, search bar, borders
  const RESERVED_LINES = 12;
  const LIST_HEIGHT = calculateListHeight(terminalHeight, RESERVED_LINES);

  // Pre-select last used model on mount
  useEffect(() => {
    const lastModel = getLastModelForProvider(provider.id);
    if (lastModel) {
      const index = models.findIndex((m) => m === lastModel);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    }
  }, [provider.id, models]);

  // Check if provider has any free models
  const hasFreeModels = useMemo(() => models.some(isModelFree), [models]);
  const hasPaidModels = useMemo(() => models.some((m) => !isModelFree(m)), [models]);

  // Filter models based on search query and pricing filter
  const filteredModels = useMemo(() => {
    let result = models;

    // Apply pricing filter first
    if (pricingFilter === "free") {
      result = result.filter(isModelFree);
    } else if (pricingFilter === "paid") {
      result = result.filter((m) => !isModelFree(m));
    }

    // Then apply search filter
    if (searchQuery) {
      result = result.filter((model) => fuzzyMatch(model, searchQuery));
    }

    return result;
  }, [models, searchQuery, pricingFilter]);

  // Cycle through pricing filters
  const cyclePricingFilter = useCallback(() => {
    setPricingFilter((prev) => {
      if (prev === "all") return "free";
      if (prev === "free") return "paid";
      return "all";
    });
    setSelectedIndex(0);
    setScrollOffset(0);
  }, []);

  // Reset selection when filters change
  useEffect(() => {
    if (selectedIndex >= filteredModels.length) {
      setSelectedIndex(Math.max(0, filteredModels.length - 1));
    }
  }, [filteredModels.length, selectedIndex]);

  // Keep scroll offset synchronized with selection
  useEffect(() => {
    if (filteredModels.length === 0) {
      setScrollOffset(0);
      return;
    }

    // Clamp selectedIndex to valid range
    const safeIndex = Math.max(0, Math.min(selectedIndex, filteredModels.length - 1));

    if (safeIndex < scrollOffset) {
      setScrollOffset(safeIndex);
    } else if (safeIndex >= scrollOffset + LIST_HEIGHT) {
      // Ensure scroll offset is never negative
      setScrollOffset(Math.max(0, safeIndex - LIST_HEIGHT + 1));
    }
  }, [selectedIndex, scrollOffset, LIST_HEIGHT, filteredModels.length]);

  // Clamp scroll offset when terminal resizes or list shrinks
  useEffect(() => {
    const maxOffset = Math.max(0, filteredModels.length - LIST_HEIGHT);
    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [LIST_HEIGHT, filteredModels.length, scrollOffset]);

  // Reset scroll offset when search changes
  useEffect(() => {
    setScrollOffset(0);
  }, [searchQuery]);

  // Handle keyboard input
  useInput((input, key) => {
    // Search mode handling
    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        setSearchQuery("");
        setSelectedIndex(0);
      } else if (key.return) {
        setIsSearching(false);
      } else if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setSearchQuery((prev) => prev + input);
      }
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredModels.length - 1));
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => (prev < filteredModels.length - 1 ? prev + 1 : 0));
    }
    // Start search with /
    else if (input === "/") {
      setIsSearching(true);
      setSearchQuery("");
      setSelectedIndex(0);
    }
    // Clear search with Escape, or go back if no search
    else if (key.escape) {
      if (searchQuery) {
        setSearchQuery("");
        setSelectedIndex(0);
      } else {
        onBack();
      }
    }
    // Go to first item
    else if (input === "g") {
      if (filteredModels.length > 0) {
        setSelectedIndex(0);
      }
    }
    // Go to last item
    else if (input === "G") {
      if (filteredModels.length > 0) {
        setSelectedIndex(filteredModels.length - 1);
      }
    }
    // Quick select by number (1-9, 0 = 10)
    else if (/^[0-9]$/.test(input) && !key.ctrl) {
      const num = input === "0" ? 9 : parseInt(input, 10) - 1;
      if (num < filteredModels.length) {
        setSelectedIndex(num);
      }
    }
    // Select current model
    else if (key.return) {
      const selected = filteredModels[selectedIndex];
      if (selected) {
        onSelect(selected);
      }
    }
    // Cycle pricing filter with Tab or 'f'
    else if (key.tab || input === "f") {
      if (hasFreeModels || hasPaidModels) {
        cyclePricingFilter();
      }
    }
  });

  const lastModel = getLastModelForProvider(provider.id);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {provider.icon} {provider.name}
        </Text>
        <Text dimColor> - Select a model</Text>
        {/* Pricing filter indicator */}
        {hasFreeModels && (
          <Text>
            {"  "}
            <Text dimColor>[</Text>
            <Text color={pricingFilter === "all" ? PRICING_FILTER_COLORS.all : "gray"} bold={pricingFilter === "all"}>
              All
            </Text>
            <Text dimColor>/</Text>
            <Text color={pricingFilter === "free" ? PRICING_FILTER_COLORS.free : "gray"} bold={pricingFilter === "free"}>
              Free
            </Text>
            <Text dimColor>/</Text>
            <Text color={pricingFilter === "paid" ? PRICING_FILTER_COLORS.paid : "gray"} bold={pricingFilter === "paid"}>
              Paid
            </Text>
            <Text dimColor>]</Text>
          </Text>
        )}
      </Box>

      {/* Search bar */}
      {(isSearching || searchQuery) && (
        <Box marginBottom={1}>
          <Text color="cyan">/</Text>
          <Text color={isSearching ? "white" : "gray"}>{searchQuery}</Text>
          {isSearching && <Text color="cyan">|</Text>}
          {searchQuery && !isSearching && (
            <Text color="gray"> ({filteredModels.length} matches)</Text>
          )}
        </Box>
      )}

      {/* Model list with box border */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        height={Math.min(LIST_HEIGHT + 4, filteredModels.length + 4)}
      >
        {/* Scroll indicator - top */}
        <Box justifyContent="center" height={1}>
          {scrollOffset > 0 ? (
            <Text color="gray">^ {scrollOffset} more above</Text>
          ) : (
            <Text> </Text>
          )}
        </Box>

        {/* Render visible models only (virtual scrolling) */}
        {filteredModels
          .slice(scrollOffset, scrollOffset + LIST_HEIGHT)
          .map((model, idx) => {
            const actualIndex = scrollOffset + idx;
            const isSelected = actualIndex === selectedIndex;
            const isLastUsed = model === lastModel;

            return (
              <Box key={model}>
                <Text color={isSelected ? "cyan" : undefined}>
                  {isSelected ? ">" : " "}
                </Text>
                <Text dimColor> {(actualIndex + 1).toString().padStart(2, " ")}. </Text>
                <Text
                  color={isSelected ? "cyan" : undefined}
                  bold={isSelected}
                >
                  {model}
                </Text>
                {isLastUsed && (
                  <Text color="yellow" dimColor>
                    {" "}
                    (last used)
                  </Text>
                )}
              </Box>
            );
          })}

        {filteredModels.length === 0 && (
          <Box>
            <Text color="gray">
              {searchQuery
                ? `No models match "${searchQuery}"`
                : pricingFilter !== "all"
                  ? `No ${pricingFilter} models available`
                  : "No models available"}
            </Text>
          </Box>
        )}

        {/* Scroll indicator - bottom */}
        <Box justifyContent="center" height={1}>
          {scrollOffset + LIST_HEIGHT < filteredModels.length ? (
            <Text color="gray">
              v {filteredModels.length - scrollOffset - LIST_HEIGHT} more below
            </Text>
          ) : (
            <Text> </Text>
          )}
        </Box>
      </Box>

      {/* Footer with shortcuts */}
      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">Enter</Text> select{" "}
          <Text color="cyan">/</Text> search{" "}
          {hasFreeModels && (
            <>
              <Text color="cyan">Tab</Text> filter{" "}
            </>
          )}
          <Text color="cyan">Esc</Text> back{" "}
          <Text color="cyan">j/k</Text> navigate
        </Text>
      </Box>
    </Box>
  );
}
