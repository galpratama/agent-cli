/**
 * useProviderActions Hook
 * Manages provider actions: favorite, pin, update, launch
 */

import { useState, useCallback } from "react";
import { spawn } from "child_process";
import { Provider } from "../lib/providers.js";
import {
  setLastProvider,
  recordUsage,
  addSession,
  toggleFavorite as toggleFavoriteConfig,
  togglePinned as togglePinnedConfig,
  getFavorites,
  getPinnedProviders,
} from "../lib/config.js";

export interface UseProviderActionsOptions {
  onFavoritesChange: (favorites: string[]) => void;
  onPinnedChange: (pinned: string[]) => void;
}

export interface LaunchOptions {
  continueSession: boolean;
  skipPermissions: boolean;
}

export interface UseProviderActionsResult {
  // Update state
  updating: string | null;
  updateMessage: string | null;

  // Status message
  statusMessage: string | null;
  showStatus: (message: string) => void;

  // Actions
  toggleFavorite: (provider: Provider) => boolean;
  togglePinned: (provider: Provider) => boolean;
  handleUpdate: (provider: Provider) => void;
  handleLaunch: (provider: Provider, options: LaunchOptions) => void;
}

export function useProviderActions(options: UseProviderActionsOptions): UseProviderActionsResult {
  const { onFavoritesChange, onPinnedChange } = options;

  // Update state
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Show status message temporarily
  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2000);
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((provider: Provider): boolean => {
    const isFav = toggleFavoriteConfig(provider.id);
    onFavoritesChange(getFavorites());
    return isFav;
  }, [onFavoritesChange]);

  // Toggle pinned
  const togglePinned = useCallback((provider: Provider): boolean => {
    const isPinned = togglePinnedConfig(provider.id);
    onPinnedChange(getPinnedProviders());
    return isPinned;
  }, [onPinnedChange]);

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

  // Handle launch (record usage and session)
  const handleLaunch = useCallback((provider: Provider, options: LaunchOptions) => {
    setLastProvider(provider.id);
    recordUsage(provider.id);
    addSession({
      providerId: provider.id,
      timestamp: Date.now(),
      continueSession: options.continueSession,
      skipPermissions: options.skipPermissions,
    });
  }, []);

  return {
    updating,
    updateMessage,
    statusMessage,
    showStatus,
    toggleFavorite,
    togglePinned,
    handleUpdate,
    handleLaunch,
  };
}
