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

  // --- LOGIC 1: FORECAST TRACES ---
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

  // --- LOGIC 2: NHSN (SURVEILLANCE) TRACES ---
  const nhsnTraces = useMemo(() => {
    if (!isNHSN || !data?.series) return [];

    const isPercentage = plot.settings.target?.includes("%");
    const dateAxis = data.series.dates;

    return (plot.settings.columns || []).map((column, index) => {
      const rawY = data.series[column] || [];
      const yValues = isPercentage
        ? rawY.map((v) => (v !== null ? v * 100 : v))
        : rawY;

      return {
        x: dateAxis,
        y:
          plot.settings.scale === "sqrt"
            ? yValues.map((v) => Math.sqrt(Math.max(0, v)))
            : yValues,
        name: column,
        type: "scatter",
        mode: "lines",
        line: {
          color: MODEL_COLORS[index % MODEL_COLORS.length],
          width: 2,
        },
      };
    });
  }, [isNHSN, data, plot.settings]);

  // --- FINAL TRACE SELECTION ---
  const finalTraces = isNHSN ? nhsnTraces : forecastTraces;

  // --- SHARED MINI LAYOUT ---
  const layout = useMemo(
    () => ({
      autosize: true,
      height: 180,
      margin: { l: 30, r: 10, t: 10, b: 30 },
      showlegend: false,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: {
        showgrid: false,
        fixedrange: true,
        tickfont: { size: 8 },
        // For NHSN, we show the last 6 months by default in the mini view
        range:
          isNHSN && data?.series?.dates
            ? [
                new Date(
                  new Date(data.series.dates.slice(-1)[0]).setMonth(
                    new Date().getMonth() - 6,
                  ),
                ).toISOString(),
                data.series.dates.slice(-1)[0],
              ]
            : undefined,
      },
      yaxis: {
        showgrid: true,
        gridcolor: colorScheme === "dark" ? "#333" : "#eee",
        fixedrange: true,
        tickfont: { size: 8 },
        type: plot.settings.scale === "log" ? "log" : "linear",
      },
      // Only show forecast dashed lines if NOT NHSN
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
    }),
    [colorScheme, plot.settings, isNHSN, data],
  );

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
