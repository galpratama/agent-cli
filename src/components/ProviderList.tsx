/**
 * ProviderList Component
 * Interactive list for selecting AI providers with mouse and keyboard support
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import Spinner from "ink-spinner";
import { spawn } from "child_process";
import { Provider, ProviderCategory, CATEGORY_LABELS } from "../lib/providers.js";
import { getAllProviders } from "../lib/provider-config.js";
import { validateAllProviders, ValidationResult } from "../lib/validate.js";
import {
  getLastProvider,
  setLastProvider,
  getFavorites,
  toggleFavorite,
} from "../lib/config.js";
import { ProviderItem } from "./ProviderItem.js";
import { useMouse, MouseEvent } from "../lib/useMouse.js";
import { HEADER_LINES } from "./Header.js";

// Calculate offset: header lines + margin
const HEADER_OFFSET = HEADER_LINES;

interface ProviderListProps {
  onSelect: (provider: Provider, options?: { continueSession?: boolean; skipPermissions?: boolean }) => void;
}

export function ProviderList({
  onSelect,
}: ProviderListProps): React.ReactElement {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [validationResults, setValidationResults] = useState<
    Map<string, ValidationResult>
  >(new Map());
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const [continueMode, setContinueMode] = useState(false);
  const [skipPermsMode, setSkipPermsMode] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickIndex, setLastClickIndex] = useState(-1);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const lastProvider = getLastProvider();

  // Get all providers (built-in + custom)
  const allProviders = getAllProviders();

  // Sort providers: favorites first, then by category (if grouped) or alphabetically
  const sortedProviders = [...allProviders].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);

    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    // If grouping by category, sort by category first
    if (groupByCategory) {
      const categoryOrder: ProviderCategory[] = ["anthropic", "chinese", "local", "standalone"];
      const aOrder = categoryOrder.indexOf(a.category);
      const bOrder = categoryOrder.indexOf(b.category);
      if (aOrder !== bOrder) return aOrder - bOrder;
    }

    // Alphabetical sort by name
    return a.name.localeCompare(b.name);
  });

  // Filter providers based on search query
  const filteredProviders = searchQuery
    ? sortedProviders.filter(
        (p) =>
          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedProviders;

  // Reset selection when search changes
  useEffect(() => {
    if (selectedIndex >= filteredProviders.length) {
      setSelectedIndex(Math.max(0, filteredProviders.length - 1));
    }
  }, [filteredProviders.length, selectedIndex]);

  // Validate providers on mount
  useEffect(() => {
    validateAllProviders(allProviders).then(setValidationResults);
  }, [allProviders.length]);

  // Handle update for standalone providers
  const handleUpdate = useCallback((provider: Provider) => {
    if (!provider.updateCmd || updating) return;

    setUpdating(provider.id);
    setUpdateMessage(null);

    const [cmd, ...args] = provider.updateCmd;
    const child = spawn(cmd, args, { stdio: "pipe" });

    child.on("close", (code) => {
      setUpdating(null);
      if (code === 0) {
        setUpdateMessage(`✓ ${provider.name} updated!`);
      } else {
        setUpdateMessage(`✗ ${provider.name} update failed`);
      }

      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    });

    child.on("error", () => {
      setUpdating(null);
      setUpdateMessage(`✗ ${provider.name} update failed`);
      setTimeout(() => setUpdateMessage(null), 3000);
    });
  }, [updating]);

  // Handle mouse events with double-click support
  const handleMouse = useCallback((event: MouseEvent) => {
    if (event.type === "scroll") {
      if (event.button === "wheelUp") {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProviders.length - 1
        );
      } else if (event.button === "wheelDown") {
        setSelectedIndex((prev) =>
          prev < filteredProviders.length - 1 ? prev + 1 : 0
        );
      }
    } else if (event.type === "click" && event.button === "left") {
      const providerIndex = event.y - HEADER_OFFSET - (searchQuery ? 1 : 0);
      const now = Date.now();

      if (providerIndex >= 0 && providerIndex < filteredProviders.length) {
        // Check for double-click (within 300ms on same item)
        if (providerIndex === lastClickIndex && now - lastClickTime < 300) {
          const selected = filteredProviders[providerIndex];
          if (selected) {
            setLastProvider(selected.id);
            onSelect(selected, { continueSession: continueMode, skipPermissions: skipPermsMode });
          }
        } else {
          // Single click to highlight
          setSelectedIndex(providerIndex);
        }
        setLastClickTime(now);
        setLastClickIndex(providerIndex);
      }
    }
  }, [filteredProviders, continueMode, skipPermsMode, onSelect, lastClickTime, lastClickIndex, searchQuery]);

  // Enable mouse support
  useMouse({ onMouse: handleMouse });

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
        // If there's a match, keep the filter active
      } else if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setSearchQuery((prev) => prev + input);
      }
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProviders.length - 1
      );
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((prev) =>
        prev < filteredProviders.length - 1 ? prev + 1 : 0
      );
    }
    // Start search with /
    else if (input === "/") {
      setIsSearching(true);
      setSearchQuery("");
      setSelectedIndex(0);
    }
    // Clear search with Escape
    else if (key.escape && searchQuery) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
    // Quick select by number (1-9, 0 = 10)
    else if (/^[0-9]$/.test(input)) {
      const num = input === "0" ? 9 : parseInt(input, 10) - 1;
      if (num < filteredProviders.length) {
        setSelectedIndex(num);
      }
    }
    // Select current provider
    else if (key.return) {
      const selected = filteredProviders[selectedIndex];
      if (selected) {
        setLastProvider(selected.id);
        onSelect(selected, { continueSession: continueMode, skipPermissions: skipPermsMode });
      }
    }
    // Toggle favorite
    else if (input === "f") {
      const selected = filteredProviders[selectedIndex];
      if (selected) {
        toggleFavorite(selected.id);
        setFavorites(getFavorites());
      }
    }
    // Toggle continue mode
    else if (input === "c") {
      setContinueMode((prev) => !prev);
    }
    // Toggle skip permissions mode
    else if (input === "y") {
      setSkipPermsMode((prev) => !prev);
    }
    // Go to first item
    else if (input === "g") {
      setSelectedIndex(0);
    }
    // Go to last item
    else if (input === "G") {
      setSelectedIndex(filteredProviders.length - 1);
    }
    // Update selected provider (standalone only)
    else if (input === "u") {
      const selected = filteredProviders[selectedIndex];
      if (selected && selected.type === "standalone" && selected.updateCmd) {
        handleUpdate(selected);
      }
    }
    // Toggle group by category
    else if (input === "t") {
      setGroupByCategory((prev) => !prev);
      setSelectedIndex(0);
    }
    // Quit
    else if (input === "q") {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      {/* Search bar */}
      {(isSearching || searchQuery) && (
        <Box marginBottom={1}>
          <Text color="cyan">/</Text>
          <Text color={isSearching ? "white" : "gray"}>{searchQuery}</Text>
          {isSearching && <Text color="cyan">▌</Text>}
          {searchQuery && !isSearching && (
            <Text color="gray"> ({filteredProviders.length} matches)</Text>
          )}
        </Box>
      )}
      {/* Category view indicator */}
      {groupByCategory && !searchQuery && (
        <Box marginBottom={1}>
          <Text color="magenta" bold>◆ Grouped by Category</Text>
        </Box>
      )}
      {/* Render providers, with category headers if grouped */}
      {(() => {
        let lastCategory: ProviderCategory | null = null;
        let providerIndex = 0;

        return filteredProviders.map((provider) => {
          const currentIndex = providerIndex++;
          const showHeader = groupByCategory && !searchQuery && provider.category !== lastCategory;
          lastCategory = provider.category;

          return (
            <React.Fragment key={provider.id}>
              {showHeader && (
                <Box marginTop={currentIndex > 0 ? 1 : 0} marginBottom={0}>
                  <Text color="gray" dimColor>── {CATEGORY_LABELS[provider.category]} ──</Text>
                </Box>
              )}
              <ProviderItem
                provider={provider}
                index={currentIndex}
                isSelected={false}
                isHighlighted={currentIndex === selectedIndex}
                validationResult={validationResults.get(provider.id)}
                isFavorite={favorites.includes(provider.id)}
                isLast={provider.id === lastProvider}
              />
            </React.Fragment>
          );
        });
      })()}
      {filteredProviders.length === 0 && searchQuery && (
        <Box>
          <Text color="gray">No providers match "{searchQuery}"</Text>
        </Box>
      )}
      {/* Mode indicators */}
      {(continueMode || skipPermsMode) && (
        <Box marginTop={1}>
          {continueMode && <Box marginRight={2}><Text color="cyan" bold>[--continue]</Text></Box>}
          {skipPermsMode && <Box><Text color="yellow" bold>[--dangerously-skip-permissions]</Text></Box>}
        </Box>
      )}
      {/* Update message with spinner */}
      {updating && (
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Updating {sortedProviders.find(p => p.id === updating)?.name}...
          </Text>
        </Box>
      )}
      {!updating && updateMessage && (
        <Box marginTop={1}>
          <Text color={updateMessage.startsWith("✓") ? "green" : "red"}>
            {updateMessage}
          </Text>
        </Box>
      )}
    </Box>
  );
}
