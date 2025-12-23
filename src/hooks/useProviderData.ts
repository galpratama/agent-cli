/**
 * useProviderData Hook
 * Manages provider data: loading, sorting, filtering, and validation
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Provider, ProviderCategory, CATEGORY_LABELS } from "../lib/providers.js";
import { getAllProviders } from "../lib/provider-config.js";
import { validateAllProviders, ValidationResult, clearValidationCache } from "../lib/validate.js";
import { fuzzyMatch } from "../lib/utils.js";
import {
  getFavorites,
  getUsageStats,
  getTagsForProvider,
  getAliases,
  getPinnedProviders,
  UsageStats,
  ProviderAlias,
} from "../lib/config.js";

// Sort modes
export type SortMode = "name" | "usage" | "lastUsed" | "category";

export const SORT_LABELS: Record<SortMode, string> = {
  name: "Name",
  usage: "Usage Count",
  lastUsed: "Last Used",
  category: "Category",
};

// All categories for filtering
export const ALL_CATEGORIES: ProviderCategory[] = [
  "anthropic", "openai", "google", "meta", "mistral", "cohere",
  "chinese", "azure", "amazon", "opensource", "local", "standalone",
  "enterprise", "custom"
];

// Re-export fuzzyMatch for backwards compatibility
export { fuzzyMatch } from "../lib/utils.js";

export interface UseProviderDataOptions {
  sortMode: SortMode;
  categoryFilter: ProviderCategory | null;
  showOnlyValid: boolean;
  searchQuery: string;
}

export interface UseProviderDataResult {
  // Raw data
  allProviders: Provider[];
  favorites: string[];
  pinnedProviders: string[];
  usageStats: UsageStats;
  aliases: ProviderAlias[];
  validationResults: Map<string, ValidationResult>;

  // Computed data
  sortedProviders: Provider[];
  filteredProviders: Provider[];
  aliasMap: Map<string, string>;
  tagsMap: Map<string, string>;

  // State
  isValidating: boolean;

  // Actions
  refreshValidation: () => void;
  setFavorites: (favorites: string[]) => void;
  setPinnedProviders: (pinned: string[]) => void;
}

export function useProviderData(options: UseProviderDataOptions): UseProviderDataResult {
  const { sortMode, categoryFilter, showOnlyValid, searchQuery } = options;

  // State
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const [pinnedProviders, setPinnedProviders] = useState<string[]>(getPinnedProviders());
  const [isValidating, setIsValidating] = useState(true);

  // Static data (re-fetched on each render, but these are fast)
  const usageStats = getUsageStats();
  const aliases = getAliases();

  // Get all providers
  const allProviders = getAllProviders();

  // Validate providers on mount
  useEffect(() => {
    setIsValidating(true);
    validateAllProviders(allProviders).then((results) => {
      setValidationResults(results);
      setIsValidating(false);
    });
  }, [allProviders.length]);

  // Refresh validation (clears cache for fresh results)
  const refreshValidation = useCallback(() => {
    setIsValidating(true);
    clearValidationCache();
    validateAllProviders(allProviders).then((results) => {
      setValidationResults(results);
      setIsValidating(false);
    });
  }, [allProviders]);

  // Sort providers based on current sort mode
  const sortedProviders = useMemo(() => {
    return [...allProviders].sort((a, b) => {
      // Favorites always first
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // Pinned providers second (after favorites)
      const aPinned = pinnedProviders.includes(a.id);
      const bPinned = pinnedProviders.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

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
  }, [allProviders, favorites, pinnedProviders, sortMode, usageStats]);

  // Pre-compute alias map for O(1) lookups
  const aliasMap = useMemo(() => {
    return new Map(aliases.map((a) => [a.providerId, a.alias]));
  }, [aliases]);

  // Pre-compute tags map for O(1) lookups
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

    // Search filter with fuzzy matching
    if (searchQuery) {
      result = result.filter((p) => {
        // Fast path: check ID and name first
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

  return {
    // Raw data
    allProviders,
    favorites,
    pinnedProviders,
    usageStats,
    aliases,
    validationResults,

    // Computed data
    sortedProviders,
    filteredProviders,
    aliasMap,
    tagsMap,

    // State
    isValidating,

    // Actions
    refreshValidation,
    setFavorites,
    setPinnedProviders,
  };
}
