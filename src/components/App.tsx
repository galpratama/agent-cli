/**
 * App Component
 * Main application component for the AI Agent CLI
 */

import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { ProviderList } from "./ProviderList.js";
import { Provider } from "../lib/providers.js";
import { launchClaude } from "../lib/launcher.js";

interface AppProps {
  args?: string[];
  debug?: boolean;
  continueSession?: boolean;
  skipPermissions?: boolean;
  fallback?: boolean;
}

type AppState = "selecting" | "launching" | "launched";

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

  const handleSelect = async (
    provider: Provider,
    options?: { continueSession?: boolean; skipPermissions?: boolean }
  ) => {
    setSelectedProvider(provider);
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

        // Launch Claude with the selected provider
        await launchClaude({
          provider,
          args,
          debug,
          continueSession: finalContinue,
          skipPermissions: finalSkipPerms,
          fallback,
        });
      } catch (error) {
        console.error("Failed to launch:", error);
        process.exit(1);
      }
    }, 100);
  };

  if (state === "launching") {
    return (
      <Box flexDirection="column">
        <Header />
        <Box>
          <Text color="yellow">
            🚀 Launching {selectedProvider?.name}...
          </Text>
        </Box>
      </Box>
    );
  }

  if (state === "launched") {
    return (
      <Box>
        <Text color="green">
          ✓ Started {selectedProvider?.name}
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
