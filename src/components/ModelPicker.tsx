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

interface ModelPickerProps {
  provider: Provider;
  onSelect: (model: string) => void;
  onBack: () => void;
}

// Fuzzy match function
function fuzzyMatch(text: string, query: string): boolean {
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

export function ModelPicker({
  provider,
  onSelect,
  onBack,
}: ModelPickerProps): React.ReactElement {
  const models = provider.models || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [terminalHeight, setTerminalHeight] = useState(process.stdout.rows ?? 24);

  const { stdout } = useStdout();

  // Listen for terminal resize events
  useEffect(() => {
    const handleResize = () => {
      setTerminalHeight(stdout?.rows ?? process.stdout.rows ?? 24);
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
  const LIST_HEIGHT = Math.max(5, terminalHeight - RESERVED_LINES);

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

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    return models.filter((model) => fuzzyMatch(model, searchQuery));
  }, [models, searchQuery]);

  // Reset selection when filters change
  useEffect(() => {
    if (selectedIndex >= filteredModels.length) {
      setSelectedIndex(Math.max(0, filteredModels.length - 1));
    }
  }, [filteredModels.length, selectedIndex]);

  // Keep scroll offset synchronized with selection
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + LIST_HEIGHT) {
      setScrollOffset(selectedIndex - LIST_HEIGHT + 1);
    }
  }, [selectedIndex, scrollOffset, LIST_HEIGHT]);

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
      setSelectedIndex(0);
    }
    // Go to last item
    else if (input === "G") {
      setSelectedIndex(filteredModels.length - 1);
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
          <Text color="cyan">Esc</Text> back{" "}
          <Text color="cyan">j/k</Text> navigate
        </Text>
      </Box>
    </Box>
  );
}
