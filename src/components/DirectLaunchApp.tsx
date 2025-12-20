/**
 * DirectLaunchApp Component
 * Handles model selection when launching a multi-model provider directly via CLI
 * (e.g., `agent megallm` or `agent openrouter`)
 */

import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import { ModelPicker } from "./ModelPicker.js";
import { Provider } from "../lib/providers.js";
import { launchClaude } from "../lib/launcher.js";
import {
  setLastProvider,
  recordUsage,
  addSession,
  setLastModelForProvider,
} from "../lib/config.js";

interface DirectLaunchAppProps {
  provider: Provider;
  args?: string[];
  debug?: boolean;
  continueSession?: boolean;
  skipPermissions?: boolean;
  fallback?: boolean;
}

type AppState = "selecting-model" | "launching" | "launched";

export function DirectLaunchApp({
  provider,
  args = [],
  debug = false,
  continueSession = false,
  skipPermissions = false,
  fallback = false,
}: DirectLaunchAppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>("selecting-model");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    setState("launching");

    // Save preferences
    setLastProvider(provider.id);
    recordUsage(provider.id);
    setLastModelForProvider(provider.id, model);
    addSession({
      providerId: provider.id,
      timestamp: Date.now(),
      continueSession,
      skipPermissions,
    });

    // Small delay to show the launching state
    setTimeout(async () => {
      try {
        setState("launched");
        exit();

        await launchClaude({
          provider,
          args,
          debug,
          continueSession,
          skipPermissions,
          fallback,
          model,
        });
      } catch (error) {
        console.error("Failed to launch:", error);
        process.exit(1);
      }
    }, 100);
  };

  const handleBack = () => {
    // Exit without launching
    exit();
    process.exit(0);
  };

  if (state === "launching" || state === "launched") {
    return (
      <Box>
        <Text color="cyan">
          Launching {provider.name}
          {selectedModel && ` (${selectedModel})`}...
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {provider.icon} {provider.name}
        </Text>
        <Text dimColor> - Select a model to launch</Text>
      </Box>
      <ModelPicker
        provider={provider}
        onSelect={handleModelSelect}
        onBack={handleBack}
      />
    </Box>
  );
}
