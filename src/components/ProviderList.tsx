/**
 * ProviderList Component
 * Interactive list for selecting AI providers with mouse and keyboard support
 *
 * Features:
 * - Category filtering (Ctrl+1-9)
 * - Status filtering (v)
 * - Fuzzy search (/)
 * - Auto-select last used
 * - Help overlay (?)
 * - Provider details panel (i)
 * - Usage stats display
 * - Multiple sort modes (s)
 * - Aliases, tags, pinning
 * - Quick refresh (r)
 * - Quick config (e)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import Spinner from "ink-spinner";
import { Provider, ProviderCategory, CATEGORY_LABELS } from "../lib/providers.js";
import { getLastProvider, getTagsForProvider } from "../lib/config.js";
import { ProviderItem } from "./ProviderItem.js";
import { useMouse, MouseEvent } from "../lib/useMouse.js";
import { HEADER_LINES } from "./Header.js";
import {
  useProviderData,
  useProviderNavigation,
  useProviderActions,
  SortMode,
  SORT_LABELS,
  ALL_CATEGORIES,
} from "../hooks/index.js";

// Calculate offset: header lines + margin
const HEADER_OFFSET = HEADER_LINES;

interface ProviderListProps {
  onSelect: (provider: Provider, options?: { continueSession?: boolean; skipPermissions?: boolean }) => void;
  onOpenConfig?: () => void;
}

export function ProviderList({
  onSelect,
  onOpenConfig,
}: ProviderListProps): React.ReactElement {
  const { exit } = useApp();

  // UI state
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [categoryFilter, setCategoryFilter] = useState<ProviderCategory | null>(null);
  const [showOnlyValid, setShowOnlyValid] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [continueMode, setContinueMode] = useState(false);
  const [skipPermsMode, setSkipPermsMode] = useState(false);

  // Use custom hooks
  const providerData = useProviderData({
    sortMode,
    categoryFilter,
    showOnlyValid,
    searchQuery,
  });

  const navigation = useProviderNavigation({
    filteredProviders: providerData.filteredProviders,
    searchQuery,
    categoryFilter,
    showOnlyValid,
  });

  const actions = useProviderActions({
    onFavoritesChange: providerData.setFavorites,
    onPinnedChange: providerData.setPinnedProviders,
  });

  const {
    allProviders,
    favorites,
    pinnedProviders,
    usageStats,
    aliases,
    validationResults,
    sortedProviders,
    filteredProviders,
    isValidating,
    refreshValidation,
  } = providerData;

  const {
    selectedIndex,
    scrollOffset,
    listHeight: LIST_HEIGHT,
    setSelectedIndex,
    moveUp,
    moveDown,
    goToFirst,
    goToLast,
    selectByNumber,
  } = navigation;

  const {
    updating,
    updateMessage,
    statusMessage,
    showStatus,
    toggleFavorite,
    togglePinned,
    handleUpdate,
    handleLaunch,
  } = actions;

  const lastProvider = getLastProvider();

  // Calculate box boundaries for mouse scroll detection
  const boxTopLine = HEADER_OFFSET + 3;
  const boxBottomLine = boxTopLine + LIST_HEIGHT + 2;

  // Handle mouse events (scroll only within box)
  const handleMouse = useCallback((event: MouseEvent) => {
    if (showHelp || showDetails) return;

    if (event.type === "scroll") {
      const mouseY = event.y;
      if (mouseY >= boxTopLine && mouseY <= boxBottomLine) {
        if (event.button === "wheelUp") {
          moveUp();
        } else if (event.button === "wheelDown") {
          moveDown();
        }
      }
    }
  }, [showHelp, showDetails, boxTopLine, boxBottomLine, moveUp, moveDown]);

  useMouse({ onMouse: handleMouse });

  // Cycle through sort modes
  const cycleSortMode = useCallback(() => {
    const modes: SortMode[] = ["name", "usage", "lastUsed", "category"];
    const currentIndex = modes.indexOf(sortMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setSortMode(nextMode);
    showStatus(`Sort: ${SORT_LABELS[nextMode]}`);
  }, [sortMode, showStatus]);

  // Handle keyboard input
  useInput((input, key) => {
    // Help overlay takes priority
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Details panel
    if (showDetails) {
      setShowDetails(false);
      return;
    }

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
      moveUp();
    } else if (key.downArrow || input === "j") {
      moveDown();
    }
    // Help overlay
    else if (input === "?") {
      setShowHelp(true);
    }
    // Details panel
    else if (input === "i") {
      setShowDetails(true);
    }
    // Start search
    else if (input === "/") {
      setIsSearching(true);
      setSearchQuery("");
      setSelectedIndex(0);
    }
    // Clear filters with Escape
    else if (key.escape) {
      if (searchQuery) {
        setSearchQuery("");
        setSelectedIndex(0);
        showStatus("Search cleared");
      } else if (categoryFilter) {
        setCategoryFilter(null);
        setSelectedIndex(0);
        showStatus("Category filter cleared");
      } else if (showOnlyValid) {
        setShowOnlyValid(false);
        setSelectedIndex(0);
        showStatus("Showing all providers");
      }
    }
    // Quick select by number (1-9, 0 = 10)
    else if (/^[0-9]$/.test(input) && !key.ctrl) {
      const num = input === "0" ? 9 : parseInt(input, 10) - 1;
      selectByNumber(num);
    }
    // Category filter with Ctrl+1-9
    else if (key.ctrl && /^[1-9]$/.test(input)) {
      const catIndex = parseInt(input, 10) - 1;
      if (catIndex < ALL_CATEGORIES.length) {
        const cat = ALL_CATEGORIES[catIndex];
        if (categoryFilter === cat) {
          setCategoryFilter(null);
          showStatus("Filter cleared");
        } else {
          setCategoryFilter(cat);
          showStatus(`Filter: ${CATEGORY_LABELS[cat]}`);
        }
        setSelectedIndex(0);
      }
    }
    // Select current provider
    else if (key.return) {
      const selected = filteredProviders[selectedIndex];
      if (selected) {
        handleLaunch(selected, { continueSession: continueMode, skipPermissions: skipPermsMode });
        onSelect(selected, { continueSession: continueMode, skipPermissions: skipPermsMode });
      }
    }
    // Toggle favorite
    else if (input === "f") {
      const selected = filteredProviders[selectedIndex];
      if (selected) {
        const isFav = toggleFavorite(selected);
        showStatus(isFav ? `★ ${selected.name} favorited` : `☆ ${selected.name} unfavorited`);
      }
    }
    // Toggle pinned
    else if (input === "p") {
      const selected = filteredProviders[selectedIndex];
      if (selected) {
        const isPinned = togglePinned(selected);
        showStatus(isPinned ? `📌 ${selected.name} pinned` : `${selected.name} unpinned`);
      }
    }
    // Toggle continue mode
    else if (input === "c") {
      const newMode = !continueMode;
      setContinueMode(newMode);
      const selected = filteredProviders[selectedIndex];
      if (newMode && selected) {
        const supportsIt = selected.type === "api" || selected.continueArg;
        if (!supportsIt) {
          showStatus(`--continue enabled (${selected.name} may not support it)`);
        } else {
          showStatus("--continue enabled");
        }
      } else {
        showStatus("--continue disabled");
      }
    }
    // Toggle skip permissions mode
    else if (input === "y") {
      const newMode = !skipPermsMode;
      setSkipPermsMode(newMode);
      const selected = filteredProviders[selectedIndex];
      if (newMode && selected) {
        const supportsIt = selected.type === "api" || selected.skipPermissionsArg;
        if (!supportsIt) {
          showStatus(`--skip-perms enabled (${selected.name} may not support it)`);
        } else {
          showStatus("--skip-perms enabled");
        }
      } else {
        showStatus("--skip-perms disabled");
      }
    }
    // Go to first/last
    else if (input === "g") {
      goToFirst();
    } else if (input === "G") {
      goToLast();
    }
    // Update provider
    else if (input === "u") {
      const selected = filteredProviders[selectedIndex];
      if (!selected) return;

      if (!selected.updateCmd || selected.updateCmd.length === 0) {
        showStatus(`${selected.name} doesn't have update command configured`);
      } else {
        handleUpdate(selected);
      }
    }
    // Toggle show only valid
    else if (input === "v") {
      setShowOnlyValid((prev) => !prev);
      setSelectedIndex(0);
      showStatus(showOnlyValid ? "Showing all providers" : "Showing valid only");
    }
    // Cycle sort mode
    else if (input === "s") {
      cycleSortMode();
    }
    // Refresh validation
    else if (input === "r") {
      refreshValidation();
      showStatus("Refreshing...");
    }
    // Open config
    else if (input === "e" && onOpenConfig) {
      onOpenConfig();
    }
    // Quit
    else if (input === "q") {
      exit();
    }
  });

  // Help overlay
  if (showHelp) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Keyboard Shortcuts</Text>
        </Box>
        <Box flexDirection="column">
          <Text><Text color="cyan">Navigation</Text></Text>
          <Text dimColor>  ↑/k, ↓/j    Move up/down</Text>
          <Text dimColor>  g, G        Go to first/last</Text>
          <Text dimColor>  1-9, 0      Quick select (1-10)</Text>
          <Text dimColor>  Enter       Launch provider</Text>
          <Text></Text>
          <Text><Text color="cyan">Search & Filter</Text></Text>
          <Text dimColor>  /           Start search (fuzzy)</Text>
          <Text dimColor>  Ctrl+1-9    Filter by category</Text>
          <Text dimColor>  v           Toggle valid only</Text>
          <Text dimColor>  Esc         Clear filter/search</Text>
          <Text></Text>
          <Text><Text color="cyan">Organization</Text></Text>
          <Text dimColor>  f           Toggle favorite</Text>
          <Text dimColor>  p           Toggle pinned</Text>
          <Text dimColor>  s           Cycle sort mode</Text>
          <Text></Text>
          <Text><Text color="cyan">Actions</Text></Text>
          <Text dimColor>  i           Show provider details</Text>
          <Text dimColor>  r           Refresh validation</Text>
          <Text dimColor>  u           Update provider</Text>
          <Text dimColor>  e           Open config TUI</Text>
          <Text></Text>
          <Text><Text color="cyan">Modes</Text></Text>
          <Text dimColor>  c           Toggle --continue</Text>
          <Text dimColor>  y           Toggle --skip-permissions</Text>
          <Text></Text>
          <Text dimColor>  ?           Show/hide this help</Text>
          <Text dimColor>  q           Quit</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press <Text color="cyan">?</Text> or <Text color="cyan">Esc</Text> to close</Text>
        </Box>
      </Box>
    );
  }

  // Details panel
  if (showDetails && filteredProviders[selectedIndex]) {
    const provider = filteredProviders[selectedIndex];
    const validation = validationResults.get(provider.id);
    const stats = usageStats[provider.id];
    const tags = getTagsForProvider(provider.id);
    const alias = aliases.find((a) => a.providerId === provider.id)?.alias;
    const isFavorite = favorites.includes(provider.id);

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">{provider.icon} {provider.name}</Text>
          {isFavorite && <Text color="yellow"> ★</Text>}
        </Box>
        <Box flexDirection="column">
          <Text><Text color="gray">ID:</Text> {provider.id}</Text>
          {alias && <Text><Text color="gray">Alias:</Text> {alias}</Text>}
          <Text><Text color="gray">Description:</Text> {provider.description}</Text>
          <Text><Text color="gray">Type:</Text> {provider.type}</Text>
          <Text><Text color="gray">Category:</Text> {CATEGORY_LABELS[provider.category]}</Text>
          <Text><Text color="gray">Config Dir:</Text> {provider.configDir}</Text>
          {provider.command && <Text><Text color="gray">Command:</Text> {provider.command}</Text>}
          <Text></Text>
          <Text><Text color="gray">Validation:</Text> {provider.validation.type}
            {provider.validation.envKey && ` (${provider.validation.envKey})`}
            {provider.validation.url && ` (${provider.validation.url})`}
            {provider.validation.command && ` (${provider.validation.command})`}
          </Text>
          <Text>
            <Text color="gray">Status:</Text>{" "}
            {validation?.valid ? (
              <Text color="green">● Valid - {validation.message}</Text>
            ) : (
              <Text color="red">○ Invalid - {validation?.message || "Unknown"}</Text>
            )}
          </Text>
          <Text></Text>
          {stats && (
            <>
              <Text><Text color="gray">Usage Count:</Text> {stats.count}</Text>
              <Text><Text color="gray">Last Used:</Text> {new Date(stats.lastUsed).toLocaleString()}</Text>
            </>
          )}
          {tags.length > 0 && (
            <Text><Text color="gray">Tags:</Text> {tags.join(", ")}</Text>
          )}
          {Object.keys(provider.envVars).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">Environment Variables:</Text>
              {Object.entries(provider.envVars).map(([key, value]) => (
                <Text key={key} dimColor>  {key}={value}</Text>
              ))}
            </Box>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press <Text color="cyan">i</Text> or <Text color="cyan">Esc</Text> to close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Status bar */}
      <Box marginBottom={1}>
        <Text dimColor>
          Sort: <Text color="cyan">{SORT_LABELS[sortMode]}</Text>
          {categoryFilter && <Text> | Filter: <Text color="magenta">{CATEGORY_LABELS[categoryFilter]}</Text></Text>}
          {showOnlyValid && <Text> | <Text color="green">Valid only</Text></Text>}
          {isValidating && <Text> | <Text color="yellow"><Spinner type="dots" /></Text></Text>}
        </Text>
        <Box flexGrow={1} />
        <Text dimColor>Press <Text color="cyan">?</Text> for help</Text>
      </Box>

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

      {/* Scrollable provider list with box border */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        height={Math.max(5, Math.min(LIST_HEIGHT, filteredProviders.length) + 4)}
      >
        {/* Scroll indicator - top */}
        <Box justifyContent="center" height={1}>
          {scrollOffset > 0 ? (
            <Text color="gray">▲ {scrollOffset} more above</Text>
          ) : (
            <Text> </Text>
          )}
        </Box>

        {/* Render visible providers only (virtual scrolling) */}
        {(() => {
          let providerIndex = 0;
          const visibleProviders = filteredProviders.slice(scrollOffset, scrollOffset + LIST_HEIGHT);

          return visibleProviders.map((provider) => {
            const currentIndex = scrollOffset + providerIndex++;
            const stats = usageStats[provider.id];
            return (
              <Box key={provider.id}>
                <ProviderItem
                  provider={provider}
                  index={currentIndex}
                  isSelected={false}
                  isHighlighted={currentIndex === selectedIndex}
                  validationResult={validationResults.get(provider.id)}
                  isFavorite={favorites.includes(provider.id)}
                  isPinned={pinnedProviders.includes(provider.id)}
                  isLast={provider.id === lastProvider}
                />
                {/* Usage count */}
                {stats && stats.count > 0 && (
                  <Text dimColor> ({stats.count})</Text>
                )}
              </Box>
            );
          });
        })()}

        {filteredProviders.length === 0 && (
          <Box>
            <Text color="gray">
              {searchQuery ? `No providers match "${searchQuery}"` : "No providers available"}
            </Text>
          </Box>
        )}

        {/* Scroll indicator - bottom */}
        <Box justifyContent="center" height={1}>
          {scrollOffset + LIST_HEIGHT < filteredProviders.length ? (
            <Text color="gray">▼ {filteredProviders.length - scrollOffset - LIST_HEIGHT} more below</Text>
          ) : (
            <Text> </Text>
          )}
        </Box>
      </Box>

      {/* Mode indicators */}
      {(continueMode || skipPermsMode) && (
        <Box marginTop={1}>
          {continueMode && <Box marginRight={2}><Text color="cyan" bold>[--continue]</Text></Box>}
          {skipPermsMode && <Box><Text color="yellow" bold>[--dangerously-skip-permissions]</Text></Box>}
        </Box>
      )}

      {/* Status message */}
      {statusMessage && (
        <Box marginTop={1}>
          <Text color="cyan">{statusMessage}</Text>
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
