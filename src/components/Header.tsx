/**
 * Header Component
 * ASCII art header with static gradient
 */

import React from "react";
import { Box, Text } from "ink";

// Seven-segment LCD display style logo
const ASCII_ART = `
 █████╗ ██╗     █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗
██╔══██╗██║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝
███████║██║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗
██╔══██║██║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
██║  ██║██║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║
╚═╝  ╚═╝╚═╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
`;

// Static gradient colors (cyan -> purple -> magenta)
const GRADIENT_COLORS = [
  "#00FFFF", // Cyan
  "#00E5FF",
  "#00CCFF",
  "#00B3FF",
  "#0099FF",
  "#0080FF",
  "#3366FF",
  "#6633FF",
  "#9933FF", // Purple
  "#CC33FF",
  "#FF33FF", // Magenta
  "#FF33CC",
  "#FF3399", // Pink
];

interface HeaderProps {
  subtitle?: string;
}

export function Header({ subtitle }: HeaderProps): React.ReactElement {
  const lines = ASCII_ART.split("\n");
  const maxLength = Math.max(...lines.map((l) => l.length));

  return (
    <Box flexDirection="column" marginBottom={1}>
      {lines.map((line, lineIndex) => (
        <Text key={lineIndex}>
          {line.split("").map((char, charIndex) => {
            // Static gradient based on horizontal position
            const gradientIndex = Math.floor(
              (charIndex / maxLength) * (GRADIENT_COLORS.length - 1)
            );
            const color = GRADIENT_COLORS[gradientIndex];

            return (
              <Text key={charIndex} color={color} bold>
                {char}
              </Text>
            );
          })}
        </Text>
      ))}
      {subtitle && (
        <Box marginTop={1}>
          <Text color="gray">{subtitle}</Text>
        </Box>
      )}
    </Box>
  );
}

// Export the number of lines in the header for mouse offset calculation
export const HEADER_LINES = ASCII_ART.split("\n").length + 2; // +2 for margin
