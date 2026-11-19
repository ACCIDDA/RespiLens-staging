import { useContext, useMemo } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { ChartStoryContext } from "../contexts/ChartStoryContext";
import { applyStoryChart } from "../utils/chartHighlights";

// A chart's traces and layout as a narrative wants them drawn (its
// highlights and customizations, see applyStoryChart); unchanged outside a
// narrative or when `enabled` is false (a small tile, say). `scale` is the
// chart's normalized y scale, so highlights land on transformed axes too.
export const useStoryChart = (
  traces,
  layout,
  { scale, enabled = true } = {},
) => {
  const chart = useContext(ChartStoryContext);
  const { colorScheme } = useMantineColorScheme();
  return useMemo(
    () =>
      enabled && chart
        ? applyStoryChart({ traces, layout, chart, colorScheme, scale })
        : { traces, layout },
    [traces, layout, chart, colorScheme, scale, enabled],
  );
};
