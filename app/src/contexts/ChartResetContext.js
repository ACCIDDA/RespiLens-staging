import { createContext, useContext, useEffect } from "react";

// Lets the active view hand its "reset axes" action to the chart header
// (see DataVisualizationContainer), which shows the button only while a view
// has registered one.
export const ChartResetContext = createContext(null);

// Registers `reset` for as long as the calling view is mounted. Pass a stable
// (memoized) function.
export const useChartReset = (reset) => {
  const register = useContext(ChartResetContext);
  useEffect(() => {
    if (!register) return undefined;
    register(() => reset);
    return () => register(null);
  }, [register, reset]);
};
