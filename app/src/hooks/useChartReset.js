import { useContext, useEffect, useRef } from "react";
import { ChartResetContext } from "../contexts/ChartResetContext";

// Calls `onReset` each time the chart header's "Reset axes" button is pressed
// (not on mount).
export const useChartReset = (onReset) => {
  const resetCount = useContext(ChartResetContext);
  const lastCountRef = useRef(resetCount);
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    if (resetCount === lastCountRef.current) return;
    lastCountRef.current = resetCount;
    onResetRef.current();
  }, [resetCount]);
};
