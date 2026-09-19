import { useEffect, useRef } from "react";

// Views whose chart header and model list answer to keyboard shortcuts
export const FORECAST_VIEWS = new Set([
  "fludetailed",
  "flu_forecasts",
  "flu_peak",
  "rsv_forecasts",
  "covid_forecasts",
  "metrocast_forecasts",
]);

// Keys typed into these belong to them (menus, search boxes, pickers)
const KEY_OWNERS =
  'input, textarea, select, [contenteditable="true"], [role="listbox"], [role="combobox"], [role="menu"], [role="option"]';

export const isOwnedKeyEvent = (event) =>
  event.defaultPrevented ||
  event.altKey ||
  event.ctrlKey ||
  event.metaKey ||
  Boolean(event.target.closest?.(KEY_OWNERS));

// Calls `handler` when `key` (an exact `event.key`, e.g. "l" or "?") is
// pressed outside any text field. Browser shortcuts (Cmd+L, Ctrl+T) pass
// through untouched.
export const useKeyboardShortcut = (key, handler, enabled = true) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !key) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== key || isOwnedKeyEvent(event)) return;
      // Stops the letter from landing in a search box the handler focuses
      event.preventDefault();
      handlerRef.current(event);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, enabled]);
};
