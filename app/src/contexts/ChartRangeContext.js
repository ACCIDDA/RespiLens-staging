import { createContext } from "react";

// A mutable store ({ current: { [key]: range } }) of each chart's zoomed
// time range, provided by DataVisualizationContainer. Views unmount while a
// new location loads, so the zoom lives here rather than in their state (see
// usePersistentXRange).
export const ChartRangeContext = createContext(null);
