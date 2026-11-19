import { useMemo } from "react";
import Plot from "react-plotly.js";
import {
  Box,
  Center,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  PLOT_CONFIG,
  getBaseChartLayout,
  getChartInk,
} from "../../../constants/chart";
import { useStoryChart } from "../../../hooks/useStoryChart";
import { getHighlightColor } from "../../../utils/chartHighlights";

// A chart drawn from a blank canvas: the slide's `chart(story, theme)`
// returns { title, subtitle?, description, caption?, traces, layout?,
// height?, empty? } and gets the app's chart frame (fonts, axes, colours,
// config) around it, plus the slide's highlights. `theme` is
// { colorScheme, ink, accent } so a chart can match the app in both modes.
// `description` says in words what the chart shows, for screen readers.

const CustomChart = ({ story, slide }) => {
  const { colorScheme } = useMantineColorScheme();
  const raw = slide.chart?.(story, {
    colorScheme,
    ink: getChartInk(colorScheme),
    accent: getHighlightColor(colorScheme),
  });
  // The chart is rebuilt from the story on every render: keep it stable
  // while what it draws is the same
  const key = JSON.stringify(raw ?? null);
  const spec = useMemo(() => JSON.parse(key), [key]);

  const { traces, layout } = useMemo(() => {
    const base = getBaseChartLayout(colorScheme);
    const own = spec?.layout || {};
    return {
      traces: spec?.traces || [],
      layout: {
        ...base,
        margin: { l: 64, r: 30, t: 24, b: 48 },
        hovermode: "closest",
        dragmode: false,
        ...own,
        xaxis: { ...base.xaxis, ...own.xaxis },
        yaxis: { ...base.yaxis, ...own.yaxis },
      },
    };
  }, [spec, colorScheme]);
  const storyChart = useStoryChart(traces, layout);

  if (!spec) return null;
  const isEmpty = !traces.length;

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title
          order={2}
          fz={{ base: 20, sm: 24 }}
          fw={600}
          lh={1.35}
          style={{ textWrap: "balance" }}
        >
          {spec.title}
        </Title>
        {spec.subtitle && (
          <Text size="sm" c="dimmed">
            {spec.subtitle}
          </Text>
        )}
      </Stack>
      {isEmpty ? (
        <Center mih={340}>
          <Text size="sm" c="dimmed" fs="italic">
            {spec.empty || "Nothing to draw for this selection yet."}
          </Text>
        </Center>
      ) : (
        <Box
          role="img"
          aria-label={spec.description || spec.title}
          style={{
            width: "100%",
            height: spec.height || "min(880px, 60vh)",
            minHeight: 340,
          }}
        >
          <Plot
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            data={storyChart.traces}
            layout={storyChart.layout}
            config={PLOT_CONFIG}
          />
        </Box>
      )}
      {spec.caption && (
        <Text size="xs" c="dimmed">
          {spec.caption}
        </Text>
      )}
    </Stack>
  );
};

export default CustomChart;
