import { useState, useEffect, useMemo } from "react";
import {
  Center,
  Loader,
  Text,
  Box,
  Stack,
  Group,
  Badge,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import Plot from "react-plotly.js";
import useQuantileForecastTraces from "../../hooks/useQuantileForecastTraces";
import { MODEL_COLORS } from "../../config/datasets";
import {
  nhsnSlugToNameMap,
  targetDisplayNameMap,
  nhsnNameToPrettyNameMap,
} from "../../utils/mapUtils";

const MiniPlot = ({ plot }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();

  const isNHSN = plot.viewType === "nhsnall";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dataUrl = `/processed_data/${plot.fullDataPath}`;
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Data not found`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [plot.fullDataPath]);

  const { traces: forecastTraces } = useQuantileForecastTraces({
    groundTruth: isNHSN ? null : data?.ground_truth,
    forecasts: isNHSN ? null : data?.forecasts,
    selectedDates: plot.settings.dates || [],
    selectedModels: plot.settings.models || [],
    target: plot.settings.target,
    showMedian: plot.settings.intervals?.includes("median") ?? true,
    show50: plot.settings.intervals?.includes("ci50") ?? true,
    show95: plot.settings.intervals?.includes("ci95") ?? true,
    showLegendForFirstDate: false,
    modelLineWidth: 1.5,
    modelMarkerSize: 4,
  });

  const nhsnTraces = useMemo(() => {
    if (!isNHSN || !data?.series) return [];

    const dateAxis = data.series.dates;
    const applySqrt = plot.settings.scale === "sqrt";

    return (plot.settings.columns || [])
      .map((slug, index) => {
        const longformName = nhsnSlugToNameMap[slug] || slug;
        const rawY = data.series[longformName] || [];
        const yValues = applySqrt
          ? rawY.map((v) => (v !== null ? Math.sqrt(Math.max(0, v)) : v))
          : rawY;

        return {
          x: dateAxis,
          y: yValues,
          name: longformName,
          type: "scatter",
          mode: "lines",
          line: {
            color: MODEL_COLORS[index % MODEL_COLORS.length],
            width: 2,
          },
        };
      })
      .filter((trace) => trace.y.length > 0);
  }, [isNHSN, data, plot.settings]);

  const finalTraces = isNHSN ? nhsnTraces : forecastTraces;

  const layout = useMemo(() => {
    let xRange = undefined;
    let yRange = undefined;

    if (data) {
      if (isNHSN && data.series?.dates?.length > 0) {
        const lastDate = new Date(
          data.series.dates[data.series.dates.length - 1],
        );
        const startDate = new Date(lastDate);
        startDate.setMonth(startDate.getMonth() - 3);
        xRange = [
          startDate.toISOString().split("T")[0],
          data.series.dates[data.series.dates.length - 1],
        ];
      } else if (!isNHSN && plot.settings.dates?.length > 0) {
        const sortedDates = [...plot.settings.dates].sort();
        const earliestDate = new Date(sortedDates[0]);
        const latestDate = new Date(sortedDates[sortedDates.length - 1]);
        const startDate = new Date(earliestDate);
        startDate.setMonth(startDate.getMonth() - 3);
        const endDate = new Date(latestDate);
        endDate.setDate(endDate.getDate() + 42);

        xRange = [
          startDate.toISOString().split("T")[0],
          endDate.toISOString().split("T")[0],
        ];
      }

      if (xRange && finalTraces?.length > 0) {
        const [viewStart, viewEnd] = xRange;
        let maxY = 0;
        finalTraces.forEach((trace) => {
          if (!trace.x || !trace.y) return;
          trace.x.forEach((xVal, i) => {
            if (xVal >= viewStart && xVal <= viewEnd) {
              const yVal = trace.y[i];
              if (yVal !== null && !isNaN(yVal)) {
                maxY = Math.max(maxY, yVal);
              }
            }
          });
        });
        const padding = maxY === 0 ? 1 : maxY * 0.2;
        yRange = [0, maxY + padding];
      }
    }

    return {
      autosize: true,
      height: 180,
      margin: { l: 45, r: 10, t: 10, b: 35 },
      showlegend: false,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: {
        showgrid: false,
        fixedrange: true,
        tickfont: { size: 8 },
        range: xRange,
      },
      yaxis: {
        showgrid: true,
        gridcolor: colorScheme === "dark" ? "#333" : "#eee",
        fixedrange: true,
        tickfont: { size: 8 },
        type: plot.settings.scale === "log" ? "log" : "linear",
        range: plot.settings.scale === "log" ? undefined : yRange,
        nticks: 5,
      },
      shapes: !isNHSN
        ? (plot.settings.dates || []).map((date) => ({
            type: "line",
            x0: date,
            x1: date,
            y0: 0,
            y1: 1,
            yref: "paper",
            line: { color: "red", width: 1, dash: "dash" },
          }))
        : [],
    };
  }, [colorScheme, plot.settings, isNHSN, data, finalTraces]);

  // Helper for hover label content
  const tooltipContent = useMemo(() => {
    const resolvedTarget =
      targetDisplayNameMap[plot.settings.target] || plot.settings.target;
    let resolvedColumns = "";
    if (isNHSN && plot.settings.columns) {
      resolvedColumns = plot.settings.columns
        .map((slug) => {
          const longformName = nhsnSlugToNameMap[slug] || slug;
          return longformName;
        })
        .join(", ");
    }

    return (
      <Stack gap={4} p={5}>
        <Text
          fw={700}
          size="xs"
          c="blue.2"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            marginBottom: 4,
          }}
        >
          PLOT INFO
        </Text>
        <Group gap={6} wrap="nowrap" align="flex-start">
          <Text size="xs" fw={700} style={{ flexShrink: 0 }}>
            TARGET:
          </Text>
          <Text size="xs">{resolvedTarget}</Text>
        </Group>
        <Group gap={6}>
          <Text size="xs" fw={700}>
            SCALE:
          </Text>
          <Badge size="xs" variant="outline" color="gray.4">
            {plot.settings.scale?.toUpperCase()}
          </Badge>
        </Group>
        <Group gap={6} align="flex-start" wrap="nowrap">
          <Text size="xs" fw={700} style={{ flexShrink: 0 }}>
            {isNHSN ? "COLUMNS:" : "DATES:"}
          </Text>
          <Text size="xs" lineClamp={3}>
            {isNHSN ? resolvedColumns : plot.settings.dates?.join(", ")}
          </Text>
        </Group>
        {!isNHSN && (
          <Group gap={6} align="flex-start" wrap="nowrap">
            <Text size="xs" fw={700} style={{ flexShrink: 0 }}>
              MODELS:
            </Text>
            <Text size="xs" lineClamp={3}>
              {plot.settings.models?.join(", ")}
            </Text>
          </Group>
        )}
      </Stack>
    );
  }, [plot.settings, isNHSN]);

  if (loading)
    return (
      <Center h={180}>
        <Loader size="sm" variant="dots" />
      </Center>
    );
  if (error)
    return (
      <Center h={180}>
        <Text size="xs" c="red">
          Error loading chart
        </Text>
      </Center>
    );

  return (
    <Tooltip
      label={tooltipContent}
      position="bottom"
      withArrow
      multiline
      w={280}
      events={{ hover: true, focus: false, touch: true }}
    >
      <Box h={180} style={{ overflow: "hidden", cursor: "help" }}>
        <Plot
          data={finalTraces}
          layout={layout}
          config={{ displayModeBar: false, staticPlot: true, responsive: true }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </Box>
    </Tooltip>
  );
};

export default MiniPlot;
