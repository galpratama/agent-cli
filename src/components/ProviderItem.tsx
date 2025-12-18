/**
 * ProviderItem Component
 * Renders a single provider in the selection list
 */

import React from "react";
import { Box, Text } from "ink";
import { Provider } from "../lib/providers.js";
import { ValidationResult } from "../lib/validate.js";
import { StatusBadge } from "./StatusBadge.js";

interface ProviderItemProps {
  provider: Provider;
  index: number;
  isSelected: boolean;
  isHighlighted: boolean;
  validationResult?: ValidationResult;
  isFavorite?: boolean;
  isLast?: boolean;
}

export function ProviderItem({
  provider,
  index,
  isSelected,
  isHighlighted,
  validationResult,
  isFavorite = false,
  isLast = false,
}: ProviderItemProps): React.ReactElement {
  const isValid = validationResult?.valid ?? false;
  const isLoading = !validationResult;
  // Display number: 1-9 for first 9, 0 for 10th
  const displayNum = index < 9 ? `${index + 1}` : index === 9 ? "0" : " ";

  return (
    <Box>
      {/* Number shortcut */}
      <Box width={2}>
        <Text color="gray" dimColor>
          {displayNum}
        </Text>
      </Box>

      {/* Selection indicator */}
      <Box width={3}>
        {isHighlighted ? (
          <Text color="cyan" bold>
            {">"}
          </Text>
        ) : (
          <Text>{"  "}</Text>
        )}
      </Box>

      {/* Status badge */}
      <Box width={2}>
        <StatusBadge valid={isValid} loading={isLoading} />
      </Box>

      {/* Provider name with recently used indicator */}
      <Box width={32}>
        <Text
          bold={isHighlighted}
          color={isHighlighted ? "cyan" : isValid ? "white" : "gray"}
        >
          {provider.name}
        </Text>
        {isLast && <Text color="blue"> ↺</Text>}
      </Box>

      {/* Favorite indicator */}
      <Box width={2}>
        {isFavorite && <Text color="yellow">★</Text>}
      </Box>

      {/* Description */}
      <Box>
        <Text color="gray">{provider.description}</Text>
      </Box>
    </Box>
  );
}
