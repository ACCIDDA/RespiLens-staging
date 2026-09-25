import { useCallback, useContext, useState } from "react";
import { ChartRangeContext } from "../contexts/ChartRangeContext";

/**
 * Like useState for a chart's x range, but remembered under `key` across
 * remounts: stepping to another location keeps the time window. Put what
 * should start a fresh window in the key (the view, the target); a key seen
 * before gets its range back.
 */
export const usePersistentXRange = (key) => {
  const store = useContext(ChartRangeContext);
  const read = useCallback(
    () => (store ? (store.current[key] ?? null) : null),
    [store, key],
  );
  const [state, setState] = useState(() => ({ key, range: read() }));
  const range = state.key === key ? state.range : read();

  const setRange = useCallback(
    (next) =>
      setState((prev) => {
        const current = prev.key === key ? prev.range : read();
        const value = typeof next === "function" ? next(current) : next;
        if (store) store.current[key] = value;
        return { key, range: value };
      }),
    [store, key, read],
  );

  return [range, setRange];
};
