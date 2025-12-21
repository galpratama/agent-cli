/**
 * Header Component
 * ASCII art header with static gradient (optimized: single render)
 */

import React, { useMemo } from "react";
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

/**
 * Convert hex color to ANSI 24-bit escape code
 */
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const ANSI_RESET = "\x1b[0m";
const ANSI_BOLD = "\x1b[1m";

/**
 * Pre-compute the gradient-colored ASCII art as a single string
 * This runs once and is memoized, avoiding 400+ React elements
 */
function buildGradientArt(): string {
  const lines = ASCII_ART.split("\n");
  const maxLength = Math.max(...lines.map((l) => l.length));

  return lines
    .map((line) => {
      let result = ANSI_BOLD;
      let lastColorIndex = -1;

      for (let i = 0; i < line.length; i++) {
        const colorIndex = Math.floor(
          (i / maxLength) * (GRADIENT_COLORS.length - 1)
        );

        // Only add color code when color changes (optimization)
        if (colorIndex !== lastColorIndex) {
          result += hexToAnsi(GRADIENT_COLORS[colorIndex]);
          lastColorIndex = colorIndex;
        }

        result += line[i];
      }

      return result + ANSI_RESET;
    })
    .join("\n");
}

// Pre-compute at module load (runs once)
const GRADIENT_ASCII_ART = buildGradientArt();

interface HeaderProps {
  subtitle?: string;
}

export function Header({ subtitle }: HeaderProps): React.ReactElement {
  // Memoize to prevent recalculation (already computed at module level,
  // but this ensures React doesn't think the string changed)
  const art = useMemo(() => GRADIENT_ASCII_ART, []);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{art}</Text>
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
