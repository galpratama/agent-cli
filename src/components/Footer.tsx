/**
 * Footer Component
 * Shows keyboard shortcuts and help
 */

import React from "react";
import { Box, Text } from "ink";

interface FooterProps {
  showHelp?: boolean;
}

export function Footer({ showHelp = true }: FooterProps): React.ReactElement {
  if (!showHelp) {
    return <></>;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="gray">────────────────────────────────────────────────────────────────────</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Text color="gray">
          <Text color="cyan">↑↓/jk</Text> Navigate
        </Text>
        <Text color="gray">
          <Text color="cyan">/</Text> Search
        </Text>
        <Text color="gray">
          <Text color="cyan">1-0</Text> Select
        </Text>
        <Text color="gray">
          <Text color="cyan">Enter</Text> Launch
        </Text>
        <Text color="gray">
          <Text color="cyan">?</Text> Help
        </Text>
        <Text color="gray">
          <Text color="cyan">q</Text> Quit
        </Text>
      </Box>
      <Box gap={2}>
        <Text color="gray">
          <Text color="cyan">f</Text> Favorite
        </Text>
        <Text color="gray">
          <Text color="cyan">s</Text> Sort
        </Text>
        <Text color="gray">
          <Text color="cyan">v</Text> Valid only
        </Text>
        <Text color="gray">
          <Text color="cyan">i</Text> Details
        </Text>
        <Text color="gray">
          <Text color="cyan">r</Text> Refresh
        </Text>
        <Text color="gray">
          <Text color="cyan">u</Text> Update
        </Text>
      </Box>
      <Box gap={2}>
        <Text color="gray">
          <Text color="cyan">c</Text> --continue
        </Text>
        <Text color="gray">
          <Text color="cyan">y</Text> --skip-perms
        </Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Text color="gray">
          <Text color="green">●</Text> Ready
        </Text>
        <Text color="gray">
          <Text color="red">○</Text> Unavailable
        </Text>
        <Text color="gray">
          <Text color="yellow">★</Text> Favorite
        </Text>
        <Text color="gray">
          <Text color="blue">↺</Text> Last used
        </Text>
      </Box>
    </Box>
  );
}
