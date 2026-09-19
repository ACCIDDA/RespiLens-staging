import { createContext } from "react";

// About-the-source config for the current view ({ title, content,
// sourceLabel }), provided by DataVisualizationContainer so each view can
// caption its chart (see ChartCaption) without threading props through
// ViewSwitchboard.
export const ChartAboutContext = createContext(null);
