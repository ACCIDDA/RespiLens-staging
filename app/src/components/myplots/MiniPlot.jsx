import { useState, useEffect, useMemo } from "react";
import {
  Center,
  Loader,
  Text,
  Box,
  useMantineColorScheme,
} from "@mantine/core";
import Plot from "react-plotly.js";
import useQuantileForecastTraces from "../../hooks/useQuantileForecastTraces";
import { MODEL_COLORS } from "../../config/datasets";
import { nhsnSlugToNameMap } from "../../utils/mapUtils";

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

    const isPercentage = plot.settings.target?.includes("%");
    const dateAxis = data.series.dates;

    return (plot.settings.columns || [])
      .map((slug, index) => {
        const longformName = nhsnSlugToNameMap[slug] || slug;
        const rawY = data.series[longformName] || [];

        const yValues = isPercentage
          ? rawY.map((v) => (v !== null ? v * 100 : v))
          : rawY;

        return {
          x: dateAxis,
          y:
            plot.settings.scale === "sqrt"
              ? yValues.map((v) => Math.sqrt(Math.max(0, v)))
              : yValues,
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
        // 3 month lead to first date
        const startDate = new Date(earliestDate);
        startDate.setMonth(startDate.getMonth() - 3);

        // 6 week gap after last date
        const endDate = new Date(latestDate);
        endDate.setDate(endDate.getDate() + 42);

        xRange = [
          startDate.toISOString().split("T")[0],
          endDate.toISOString().split("T")[0],
        ];
      }
    }

    return {
      autosize: true,
      height: 180,
      margin: { l: 35, r: 10, t: 10, b: 35 },
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
  }, [colorScheme, plot.settings, isNHSN, data]);

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
    <Box h={180} style={{ overflow: "hidden" }}>
      <Plot
        data={finalTraces}
        layout={layout}
        config={{ displayModeBar: false, staticPlot: true, responsive: true }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    </Box>
  );
};

export default MiniPlot;
