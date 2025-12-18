/**
 * Configuration Store
 * Persists user preferences like last used provider
 */

import Conf from "conf";

export interface Profile {
  name: string;
  providerId: string;
  continueSession?: boolean;
  skipPermissions?: boolean;
  args?: string[];
}

export interface SessionRecord {
  id: string;
  providerId: string;
  timestamp: number;
  continueSession?: boolean;
  skipPermissions?: boolean;
}

export interface UsageStats {
  [providerId: string]: {
    count: number;
    lastUsed: number;
  };
}

export interface ProviderAlias {
  alias: string;
  providerId: string;
}

export interface ProviderTag {
  providerId: string;
  tags: string[];
}

interface ConfigSchema {
  lastProvider: string;
  favorites: string[];
  recentProviders: string[];
  profiles: Profile[];
  sessions: SessionRecord[];
  usageStats: UsageStats;
  pinnedProviders: string[];
  aliases: ProviderAlias[];
  providerTags: ProviderTag[];
}

const config = new Conf<ConfigSchema>({
  projectName: "agent-cli",
  defaults: {
    lastProvider: "claude",
    favorites: [],
    recentProviders: [],
    profiles: [],
    sessions: [],
    usageStats: {},
    pinnedProviders: [],
    aliases: [],
    providerTags: [],
  },
});

export function getLastProvider(): string {
  return config.get("lastProvider");
}

export function setLastProvider(providerId: string): void {
  config.set("lastProvider", providerId);

  // Update recent providers
  const recent = config.get("recentProviders");
  const updated = [providerId, ...recent.filter((id) => id !== providerId)].slice(0, 5);
  config.set("recentProviders", updated);
}

export function getRecentProviders(): string[] {
  return config.get("recentProviders");
}

export function getFavorites(): string[] {
  return config.get("favorites");
}

export function toggleFavorite(providerId: string): boolean {
  const favorites = config.get("favorites");
  const isFavorite = favorites.includes(providerId);

  if (isFavorite) {
    config.set(
      "favorites",
      favorites.filter((id) => id !== providerId)
    );
  } else {
    config.set("favorites", [...favorites, providerId]);
  }

  return !isFavorite;
}

// Profile Management
export function getProfiles(): Profile[] {
  return config.get("profiles");
}

export function getProfile(name: string): Profile | undefined {
  return config.get("profiles").find((p) => p.name === name);
}

export function saveProfile(profile: Profile): void {
  const profiles = config.get("profiles").filter((p) => p.name !== profile.name);
  config.set("profiles", [...profiles, profile]);
}

export function deleteProfile(name: string): boolean {
  const profiles = config.get("profiles");
  const filtered = profiles.filter((p) => p.name !== name);
  if (filtered.length < profiles.length) {
    config.set("profiles", filtered);
    return true;
  }
  return false;
}

// Session History
export function getSessions(): SessionRecord[] {
  return config.get("sessions");
}

export function addSession(session: Omit<SessionRecord, "id">): SessionRecord {
  const sessions = config.get("sessions");
  const newSession: SessionRecord = {
    ...session,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  config.set("sessions", [newSession, ...sessions].slice(0, 50)); // Keep last 50
  return newSession;
}

export function clearSessions(): void {
  config.set("sessions", []);
}

// Usage Statistics
export function getUsageStats(): UsageStats {
  return config.get("usageStats");
}

export function recordUsage(providerId: string): void {
  const stats = config.get("usageStats");
  const current = stats[providerId] || { count: 0, lastUsed: 0 };
  config.set("usageStats", {
    ...stats,
    [providerId]: {
      count: current.count + 1,
      lastUsed: Date.now(),
    },
  });
}

export function clearUsageStats(): void {
  config.set("usageStats", {});
}

// Pinned Providers
export function getPinnedProviders(): string[] {
  return config.get("pinnedProviders");
}

export function togglePinned(providerId: string): boolean {
  const pinned = config.get("pinnedProviders");
  const isPinned = pinned.includes(providerId);

  if (isPinned) {
    config.set(
      "pinnedProviders",
      pinned.filter((id) => id !== providerId)
    );
  } else {
    config.set("pinnedProviders", [...pinned, providerId]);
  }

  return !isPinned;
}

export function isPinned(providerId: string): boolean {
  return config.get("pinnedProviders").includes(providerId);
}

// Aliases
export function getAliases(): ProviderAlias[] {
  return config.get("aliases");
}

export function setAlias(alias: string, providerId: string): void {
  const aliases = config.get("aliases").filter((a) => a.alias !== alias);
  config.set("aliases", [...aliases, { alias, providerId }]);
}

export function removeAlias(alias: string): boolean {
  const aliases = config.get("aliases");
  const filtered = aliases.filter((a) => a.alias !== alias);
  if (filtered.length < aliases.length) {
    config.set("aliases", filtered);
    return true;
  }
  return false;
}

export function getProviderByAlias(alias: string): string | undefined {
  const found = config.get("aliases").find((a) => a.alias === alias);
  return found?.providerId;
}

// Tags
export function getProviderTags(): ProviderTag[] {
  return config.get("providerTags");
}

export function getTagsForProvider(providerId: string): string[] {
  const found = config.get("providerTags").find((t) => t.providerId === providerId);
  return found?.tags || [];
}

export function setTagsForProvider(providerId: string, tags: string[]): void {
  const providerTags = config.get("providerTags").filter((t) => t.providerId !== providerId);
  if (tags.length > 0) {
    config.set("providerTags", [...providerTags, { providerId, tags }]);
  } else {
    config.set("providerTags", providerTags);
  }
}

export function addTagToProvider(providerId: string, tag: string): void {
  const currentTags = getTagsForProvider(providerId);
  if (!currentTags.includes(tag)) {
    setTagsForProvider(providerId, [...currentTags, tag]);
  }
}

export function removeTagFromProvider(providerId: string, tag: string): void {
  const currentTags = getTagsForProvider(providerId);
  setTagsForProvider(providerId, currentTags.filter((t) => t !== tag));
}

export function getAllTags(): string[] {
  const providerTags = config.get("providerTags");
  const allTags = new Set<string>();
  providerTags.forEach((pt) => pt.tags.forEach((t) => allTags.add(t)));
  return Array.from(allTags).sort();
}

export function getProvidersByTag(tag: string): string[] {
  return config.get("providerTags")
    .filter((pt) => pt.tags.includes(tag))
    .map((pt) => pt.providerId);
}

export { config };
