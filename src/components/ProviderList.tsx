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

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import Spinner from "ink-spinner";
import { spawn } from "child_process";
import { Provider, ProviderCategory, CATEGORY_LABELS } from "../lib/providers.js";
import { getAllProviders } from "../lib/provider-config.js";
import { validateAllProviders, ValidationResult, clearValidationCache } from "../lib/validate.js";
import {
  getLastProvider,
  setLastProvider,
  getFavorites,
  toggleFavorite,
  getUsageStats,
  recordUsage,
  addSession,
  getTagsForProvider,
  getAliases,
} from "../lib/config.js";
import { ProviderItem } from "./ProviderItem.js";
import { useMouse, MouseEvent } from "../lib/useMouse.js";
import { HEADER_LINES } from "./Header.js";

// Calculate offset: header lines + margin
const HEADER_OFFSET = HEADER_LINES;

// Sort modes
type SortMode = "name" | "usage" | "lastUsed" | "category";
const SORT_LABELS: Record<SortMode, string> = {
  name: "Name",
  usage: "Usage Count",
  lastUsed: "Last Used",
  category: "Category",
};

// All categories for filtering
const ALL_CATEGORIES: ProviderCategory[] = [
  "anthropic", "openai", "google", "meta", "mistral", "cohere",
  "chinese", "azure", "amazon", "opensource", "local", "standalone",
  "enterprise", "custom"
];

interface ProviderListProps {
  onSelect: (provider: Provider, options?: { continueSession?: boolean; skipPermissions?: boolean }) => void;
  onOpenConfig?: () => void;
}

// Optimized fuzzy match function with early exit
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

export function ProviderList({
  onSelect,
  onOpenConfig,
}: ProviderListProps): React.ReactElement {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const [continueMode, setContinueMode] = useState(false);
  const [skipPermsMode, setSkipPermsMode] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickIndex, setLastClickIndex] = useState(-1);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [categoryFilter, setCategoryFilter] = useState<ProviderCategory | null>(null);
  const [showOnlyValid, setShowOnlyValid] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [terminalHeight, setTerminalHeight] = useState(process.stdout.rows ?? 24);

  // Get terminal dimensions for scrollable list
  const { stdout } = useStdout();

  // Listen for terminal resize events
  useEffect(() => {
    const handleResize = () => {
      setTerminalHeight(stdout?.rows ?? process.stdout.rows ?? 24);
    };

    // Initial size
    handleResize();

    // Listen for resize
    stdout?.on("resize", handleResize);
    process.stdout.on("resize", handleResize);

    return () => {
      stdout?.off("resize", handleResize);
      process.stdout.off("resize", handleResize);
    };
  }, [stdout]);

  // Reserve lines for: Header (~10) + Footer (~10) + status bar (2) + search bar (2) + box border (2) + buffer (2) = ~28
  const RESERVED_LINES = 28;
  const LIST_HEIGHT = Math.max(5, terminalHeight - RESERVED_LINES);

  const lastProvider = getLastProvider();
  const usageStats = getUsageStats();
  const aliases = getAliases();

  // Get all providers (built-in + custom)
  const allProviders = getAllProviders();

  // Sort providers based on current sort mode
  const sortedProviders = useMemo(() => {
    return [...allProviders].sort((a, b) => {
      // Favorites always first
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // Then by sort mode
      switch (sortMode) {
        case "usage": {
          const aUsage = usageStats[a.id]?.count || 0;
          const bUsage = usageStats[b.id]?.count || 0;
          return bUsage - aUsage;
        }
        case "lastUsed": {
          const aLast = usageStats[a.id]?.lastUsed || 0;
          const bLast = usageStats[b.id]?.lastUsed || 0;
          return bLast - aLast;
        }
        case "category": {
          const categoryOrder = ALL_CATEGORIES;
          const aOrder = categoryOrder.indexOf(a.category);
          const bOrder = categoryOrder.indexOf(b.category);
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.name.localeCompare(b.name);
        }
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [allProviders, favorites, sortMode, usageStats]);

  // Pre-compute alias map for O(1) lookups (instead of creating in filter loop)
  const aliasMap = useMemo(() => {
    return new Map(aliases.map((a) => [a.providerId, a.alias]));
  }, [aliases]);

  // Pre-compute tags map for O(1) lookups (avoids repeated getTagsForProvider calls)
  const tagsMap = useMemo(() => {
    const map = new Map<string, string>();
    allProviders.forEach((p) => {
      const tags = getTagsForProvider(p.id);
      if (tags.length > 0) {
        map.set(p.id, tags.join(" "));
      }
    });
    return map;
  }, [allProviders]);

  // Filter providers based on search query, category, and validity
  const filteredProviders = useMemo(() => {
    let result = sortedProviders;

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Validity filter
    if (showOnlyValid) {
      result = result.filter((p) => validationResults.get(p.id)?.valid);
    }

    // Search filter with fuzzy matching (using pre-computed maps)
    if (searchQuery) {
      result = result.filter((p) => {
        // Fast path: check ID and name first (most common matches)
        if (fuzzyMatch(p.id, searchQuery) || fuzzyMatch(p.name, searchQuery)) {
          return true;
        }
        // Then check description, alias, and tags
        const alias = aliasMap.get(p.id) || "";
        const tags = tagsMap.get(p.id) || "";
        return (
          fuzzyMatch(p.description, searchQuery) ||
          fuzzyMatch(alias, searchQuery) ||
          fuzzyMatch(tags, searchQuery)
        );
      });
    }

    return result;
  }, [sortedProviders, categoryFilter, showOnlyValid, searchQuery, validationResults, aliasMap, tagsMap]);

  // Auto-select last used provider on mount
  useEffect(() => {
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
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + LIST_HEIGHT) {
      setScrollOffset(selectedIndex - LIST_HEIGHT + 1);
    }
  }, [selectedIndex, scrollOffset, LIST_HEIGHT]);

  // Clamp scroll offset when terminal resizes or list shrinks
  useEffect(() => {
    const maxOffset = Math.max(0, filteredProviders.length - LIST_HEIGHT);
    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [LIST_HEIGHT, filteredProviders.length, scrollOffset]);

  // Reset scroll offset when filters change
  useEffect(() => {
    setScrollOffset(0);
  }, [searchQuery, categoryFilter, showOnlyValid]);

  // Validate providers on mount
  useEffect(() => {
    setIsValidating(true);
    validateAllProviders(allProviders).then((results) => {
      setValidationResults(results);
      setIsValidating(false);
    });
  }, [allProviders.length]);

  // Show status message temporarily
  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2000);
  }, []);

  // Refresh validation (clears cache for fresh results)
  const refreshValidation = useCallback(() => {
    setIsValidating(true);
    showStatus("Refreshing...");
    clearValidationCache(); // Clear cache to force fresh validation
    validateAllProviders(allProviders).then((results) => {
      setValidationResults(results);
      setIsValidating(false);
      showStatus("Validation refreshed!");
    });
  }, [allProviders, showStatus]);

  // Handle update for standalone providers
  const handleUpdate = useCallback((provider: Provider) => {
    if (!provider.updateCmd || provider.updateCmd.length === 0 || updating) return;

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
      setTimeout(() => setUpdateMessage(null), 3000);
    });

    child.on("error", () => {
      setUpdating(null);
      setUpdateMessage(`✗ ${provider.name} update failed`);
      setTimeout(() => setUpdateMessage(null), 3000);
    });
  }, [updating]);

  // Calculate box boundaries for mouse scroll detection
  const boxTopLine = HEADER_OFFSET + 3;
  const boxBottomLine = boxTopLine + LIST_HEIGHT + 2;

  // Handle mouse events (scroll only within box)
  const handleMouse = useCallback((event: MouseEvent) => {
    if (showHelp || showDetails) return;

    if (event.type === "scroll") {
      const mouseY = event.y;
      // Only scroll when mouse is inside the box area
      if (mouseY >= boxTopLine && mouseY <= boxBottomLine) {
        if (event.button === "wheelUp") {
          setSelectedIndex((prev) => prev > 0 ? prev - 1 : filteredProviders.length - 1);
        } else if (event.button === "wheelDown") {
          setSelectedIndex((prev) => prev < filteredProviders.length - 1 ? prev + 1 : 0);
        }
      }
    }
  }, [filteredProviders.length, showHelp, showDetails, boxTopLine, boxBottomLine]);

  // Enable mouse support
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
      // Any key closes help overlay
      setShowHelp(false);
      return;
    }

    // Details panel
    if (showDetails) {
      // Any key closes details panel
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
      setSelectedIndex((prev) => prev > 0 ? prev - 1 : filteredProviders.length - 1);
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => prev < filteredProviders.length - 1 ? prev + 1 : 0);
    }
    // Help overlay
    else if (input === "?") {
      setShowHelp(true);
    }
    // Details panel
    else if (input === "i") {
      setShowDetails(true);
    }
    // Start search with /
    else if (input === "/") {
      setIsSearching(true);
      setSearchQuery("");
      setSelectedIndex(0);
    }
    // Clear all filters with Escape (clears in order: search -> category -> valid only)
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
    // Quick select by number (1-9, 0 = 10) - only when no category filter active
    else if (/^[0-9]$/.test(input) && !key.ctrl) {
      const num = input === "0" ? 9 : parseInt(input, 10) - 1;
      if (num < filteredProviders.length) {
        setSelectedIndex(num);
      }
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
        setLastProvider(selected.id);
        recordUsage(selected.id);
        addSession({
          providerId: selected.id,
          timestamp: Date.now(),
          continueSession: continueMode,
          skipPermissions: skipPermsMode,
        });
        onSelect(selected, { continueSession: continueMode, skipPermissions: skipPermsMode });
      }
    }
    // Toggle favorite
    else if (input === "f") {
      const selected = filteredProviders[selectedIndex];
      if (selected) {
        const isFav = toggleFavorite(selected.id);
        setFavorites(getFavorites());
        showStatus(isFav ? `★ ${selected.name} favorited` : `☆ ${selected.name} unfavorited`);
      }
    }
    // Toggle continue mode
    else if (input === "c") {
      const newMode = !continueMode;
      setContinueMode(newMode);
      const selected = filteredProviders[selectedIndex];
      if (newMode && selected) {
        // Check if provider supports continue mode
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
        // Check if provider supports skip-permissions mode
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
    // Go to first item
    else if (input === "g") {
      setSelectedIndex(0);
    }
    // Go to last item
    else if (input === "G") {
      setSelectedIndex(filteredProviders.length - 1);
    }
    // Update selected provider (any provider with updateCmd configured)
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
    }
    // Open config (if handler provided)
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
        height={LIST_HEIGHT + 4}
      >
        {/* Scroll indicator - top (always reserves space) */}
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

        {/* Scroll indicator - bottom (always reserves space) */}
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
