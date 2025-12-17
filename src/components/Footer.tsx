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
        <Text color="gray">─────────────────────────────────────────────────────</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Text color="gray">
          <Text color="cyan">↑↓/jk</Text> Navigate
        </Text>
        <Text color="gray">
          <Text color="cyan">/</Text> Search
        </Text>
        <Text color="gray">
          <Text color="cyan">1-0</Text> Quick select
        </Text>
        <Text color="gray">
          <Text color="cyan">Enter</Text> Launch
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
          <Text color="cyan">u</Text> Update
        </Text>
        <Text color="gray">
          <Text color="cyan">t</Text> Group
        </Text>
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
        <Text color="gray">
          <Text color="magenta">Mouse</Text> Click/Scroll
        </Text>
      </Box>
    </Box>
  );
}
