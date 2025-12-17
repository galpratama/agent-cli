/**
 * StatusBadge Component
 * Shows provider availability status
 */

import React from "react";
import { Text } from "ink";

interface StatusBadgeProps {
  valid: boolean;
  loading?: boolean;
}

export function StatusBadge({
  valid,
  loading = false,
}: StatusBadgeProps): React.ReactElement {
  if (loading) {
    return <Text color="yellow">◌</Text>;
  }

  return valid ? <Text color="green">●</Text> : <Text color="red">○</Text>;
}
