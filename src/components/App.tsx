/**
 * App Component
 * Main application component for the AI Agent CLI
 */

import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { ProviderList } from "./ProviderList.js";
import { ModelPicker } from "./ModelPicker.js";
import { Provider } from "../lib/providers.js";
import { launchClaude } from "../lib/launcher.js";
import { setLastModelForProvider } from "../lib/config.js";

interface AppProps {
  args?: string[];
  debug?: boolean;
  continueSession?: boolean;
  skipPermissions?: boolean;
  fallback?: boolean;
}

type AppState = "selecting" | "selecting-model" | "launching" | "launched";

interface LaunchOptions {
  continueSession?: boolean;
  skipPermissions?: boolean;
}

export function App({
  args = [],
  debug = false,
  continueSession = false,
  skipPermissions = false,
  fallback = false,
}: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>("selecting");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [launchOptions, setLaunchOptions] = useState<LaunchOptions>({});

  // Launch the provider with optional model
  const doLaunch = async (
    provider: Provider,
    model: string | null,
    options: LaunchOptions
  ) => {
    setState("launching");

    // Merge options from props and from keyboard shortcuts
    const finalContinue = continueSession || options?.continueSession;
    const finalSkipPerms = skipPermissions || options?.skipPermissions;

    // Small delay to show the launching state
    setTimeout(async () => {
      try {
        setState("launched");
        // Exit Ink before launching Claude (it takes over the terminal)
        exit();

        // Launch Claude with the selected provider and model
        await launchClaude({
          provider,
          args,
          debug,
          continueSession: finalContinue,
          skipPermissions: finalSkipPerms,
          fallback,
          model: model ?? undefined,
        });
      } catch (error) {
        console.error("Failed to launch:", error);
        process.exit(1);
      }
    }, 100);
  };

  const handleSelect = async (
    provider: Provider,
    options?: { continueSession?: boolean; skipPermissions?: boolean }
  ) => {
    setSelectedProvider(provider);
    setLaunchOptions(options || {});

    // If provider has multiple models, show model picker
    if (provider.models && provider.models.length > 0) {
      setState("selecting-model");
    } else {
      // No models to select, launch directly
      doLaunch(provider, null, options || {});
    }
  };

  const handleModelSelect = (model: string) => {
    if (!selectedProvider) return;

    setSelectedModel(model);
    // Save the selected model for next time
    setLastModelForProvider(selectedProvider.id, model);
    // Launch with the selected model
    doLaunch(selectedProvider, model, launchOptions);
  };

  const handleModelBack = () => {
    // Go back to provider selection
    setState("selecting");
    setSelectedProvider(null);
    setSelectedModel(null);
  };

  if (state === "selecting-model" && selectedProvider) {
    return (
      <Box flexDirection="column">
        <Header subtitle={`Select a model for ${selectedProvider.name}`} />
        <ModelPicker
          provider={selectedProvider}
          onSelect={handleModelSelect}
          onBack={handleModelBack}
        />
      </Box>
    );
  }

  if (state === "launching") {
    return (
      <Box flexDirection="column">
        <Header />
        <Box>
          <Text color="yellow">
            Launching {selectedProvider?.name}
            {selectedModel && ` (${selectedModel})`}...
          </Text>
        </Box>
      </Box>
    );
  }

  if (state === "launched") {
    return (
      <Box>
        <Text color="green">
          Started {selectedProvider?.name}
          {selectedModel && ` (${selectedModel})`}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header subtitle="Select an AI provider to launch" />
      <ProviderList onSelect={handleSelect} />
      <Footer />
    </Box>
  );
}
