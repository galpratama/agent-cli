/**
 * useMouse Hook
 * Enables mouse support in the terminal (clicks and scroll wheel)
 */

import { useEffect, useState, useCallback } from "react";
import { useStdin } from "ink";

export interface MouseEvent {
  type: "click" | "scroll" | "move";
  button?: "left" | "right" | "middle" | "wheelUp" | "wheelDown";
  x: number;
  y: number;
}

interface UseMouseOptions {
  onMouse?: (event: MouseEvent) => void;
}

/**
 * Enable mouse support and handle mouse events
 */
export function useMouse(options: UseMouseOptions = {}): void {
  const { stdin, setRawMode } = useStdin();
  const { onMouse } = options;

  useEffect(() => {
    if (!stdin || !setRawMode) return;

    // Enable mouse tracking (SGR extended mode for better compatibility)
    // \x1b[?1000h - Enable basic mouse tracking
    // \x1b[?1006h - Enable SGR extended mouse mode
    process.stdout.write("\x1b[?1000h\x1b[?1006h");

    const handleData = (data: Buffer) => {
      const str = data.toString();

      // Parse SGR mouse sequences: \x1b[<Cb;Cx;CyM or \x1b[<Cb;Cx;Cym
      const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (sgrMatch && onMouse) {
        const [, buttonCode, x, y, action] = sgrMatch;
        const btn = parseInt(buttonCode, 10);
        const col = parseInt(x, 10);
        const row = parseInt(y, 10);
        const isRelease = action === "m";

        // Decode button
        // 0 = left, 1 = middle, 2 = right
        // 64 = wheel up, 65 = wheel down
        // 32 = motion with button held
        let mouseEvent: MouseEvent | null = null;

        if (btn === 64) {
          mouseEvent = { type: "scroll", button: "wheelUp", x: col, y: row };
        } else if (btn === 65) {
          mouseEvent = { type: "scroll", button: "wheelDown", x: col, y: row };
        } else if (!isRelease) {
          // Button press
          const button = btn === 0 ? "left" : btn === 1 ? "middle" : btn === 2 ? "right" : "left";
          mouseEvent = { type: "click", button, x: col, y: row };
        }

        if (mouseEvent) {
          onMouse(mouseEvent);
        }
      }
    };

    stdin.on("data", handleData);

    return () => {
      // Disable mouse tracking on cleanup
      process.stdout.write("\x1b[?1006l\x1b[?1000l");
      stdin.off("data", handleData);
    };
  }, [stdin, setRawMode, onMouse]);
}
