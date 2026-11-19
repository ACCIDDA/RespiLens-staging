import { createContext } from "react";

// What a narrative adds to the chart inside it (see useStoryChart):
// { highlights, customize, story }, or null outside a narrative, where every
// chart draws as usual.
export const ChartStoryContext = createContext(null);
