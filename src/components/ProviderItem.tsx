/**
 * ProviderItem Component
 * Renders a single provider in the selection list
 * Memoized for performance - only re-renders when props change
 */

import React, { memo } from "react";
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

function ProviderItemComponent({
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

// Memoize to prevent unnecessary re-renders when parent state changes
export const ProviderItem = memo(ProviderItemComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.provider.id === nextProps.provider.id &&
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.validationResult?.valid === nextProps.validationResult?.valid &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isLast === nextProps.isLast
  );
});
