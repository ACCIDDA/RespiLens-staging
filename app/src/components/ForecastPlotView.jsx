import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMantineColorScheme, Stack, Text, Box, Center } from "@mantine/core";
import Plot from "react-plotly.js";
import Plotly from "plotly.js/dist/plotly";
import ModelSelector from "./ModelSelector";
import TitleRow from "./TitleRow";
import { CHART_CONSTANTS } from "../constants/chart";
import { targetDisplayNameMap, targetYAxisLabelMap } from "../utils/mapUtils";
import useQuantileForecastTraces from "../hooks/useQuantileForecastTraces";
import {
  buildLog2Ticks,
  buildSqrtTicks,
  getScaleTitleSuffix,
  isPlotlyLogScale,
  normalizeChartScale,
  transformValueForScale,
} from "../utils/scaleUtils";
import { useView } from "../hooks/useView";
import { getDatasetTitleFromView } from "../utils/datasetUtils";
import { buildPlotDownloadName } from "../utils/plotDownloadName";
import { getOfficialModels } from "../utils/forecastleScoring";

const FORECAST_DATASET_KEYS_BY_VIEW = {
  fludetailed: "flusight",
  flu_forecasts: "flusight",
  rsv_forecasts: "rsv",
  covid_forecasts: "covid19",
};

const shiftDateStringByDays = (dateString, days) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const shiftedDate = new Date(Date.UTC(year, month - 1, day + days));
  return shiftedDate.toISOString().slice(0, 10);
};

const ForecastPlotView = ({
  data,
  metadata,
  selectedDates,
  selectedModels,
  models,
  setSelectedModels,
  getDefaultRange,
  selectedTarget,
  forecastTarget = null,
  displayTarget = null,
  requireTarget = true,
  activeModels: activeModelsOverride = null,
  extraTraces = null,
  layoutOverrides = null,
  configOverrides = null,
  groundTruthValueFormat = "%{y}",
}) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null);
  const plotRef = useRef(null);
  const isResettingRef = useRef(false);
  const { colorScheme } = useMantineColorScheme();
  const { chartScale, intervalVisibility, showLegend, viewType } = useView();
  const stateName = data?.metadata?.location_name;
  const hubName = getDatasetTitleFromView(viewType) || data?.metadata?.dataset;

  const getDefaultRangeRef = useRef(getDefaultRange);
  const projectionsDataRef = useRef([]);
  const groundTruth = data?.ground_truth;
  const forecasts = data?.forecasts;

  const resolvedForecastTarget = forecastTarget || selectedTarget;
  const resolvedDisplayTarget =
    displayTarget || selectedTarget || resolvedForecastTarget;
  const showMedian = intervalVisibility?.median ?? true;
  const show50 = intervalVisibility?.ci50 ?? true;
  const show95 = intervalVisibility?.ci95 ?? true;
  const baselineModelName =
    getOfficialModels(FORECAST_DATASET_KEYS_BY_VIEW[viewType]).baseline || null;
  const normalizedChartScale = normalizeChartScale(chartScale);

  const manualScaleTransform = useMemo(() => {
    if (normalizedChartScale !== "sqrt" && normalizedChartScale !== "log2") {
      return null;
    }
    return (value) => transformValueForScale(value, normalizedChartScale);
  }, [normalizedChartScale]);

  const calculateYRange = useCallback(
    (chartData, xRange) => {
      if (
        !chartData ||
        !xRange ||
        !Array.isArray(chartData) ||
        chartData.length === 0 ||
        !resolvedForecastTarget
      )
        return null;
      let minY = Infinity;
      let maxY = -Infinity;
      const [startX, endX] = xRange;
      const startDate = new Date(startX);
      const endDate = new Date(endX);

      chartData.forEach((trace) => {
        if (!trace.x || !trace.y) return;

        for (let i = 0; i < trace.x.length; i++) {
          const pointDate = new Date(trace.x[i]);
          if (pointDate >= startDate && pointDate <= endDate) {
            const value = Number(trace.y[i]);
            if (!isNaN(value)) {
              minY = Math.min(minY, value);
              maxY = Math.max(maxY, value);
            }
          }
        }
      });
      if (minY !== Infinity && maxY !== -Infinity) {
        const padding = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
        const rangeMin = Math.max(0, minY - padding);
        return [rangeMin, maxY + padding];
      }
      return null;
    },
    [resolvedForecastTarget],
  );

  const { traces: projectionsData, rawYRange } = useQuantileForecastTraces({
    groundTruth,
    forecasts,
    selectedDates,
    selectedModels,
    target: resolvedForecastTarget,
    groundTruthLabel: "Observed",
    groundTruthValueFormat,
    valueSuffix: "",
    modelLineWidth: 2,
    modelMarkerSize: 6,
    groundTruthLineWidth: 1.5,
    groundTruthMarkerSize: 4,
    showLegendForFirstDate: showLegend,
    fillMissingQuantiles: false,
    showMedian,
    show50,
    show95,
    transformY: manualScaleTransform,
    baselineModelName,
    groundTruthHoverFormatter: manualScaleTransform
      ? (value) =>
          groundTruthValueFormat.includes(":.2f")
            ? Number(value).toFixed(2)
            : Number(value).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
      : null,
  });

  const appendedTraces = useMemo(() => {
    if (!extraTraces) return [];
    if (typeof extraTraces === "function") {
      return extraTraces({ baseTraces: projectionsData }) || [];
    }
    return Array.isArray(extraTraces) ? extraTraces : [];
  }, [extraTraces, projectionsData]);

  const finalTraces = useMemo(() => {
    if (!appendedTraces.length) return projectionsData;
    return [...projectionsData, ...appendedTraces];
  }, [projectionsData, appendedTraces]);

  useEffect(() => {
    getDefaultRangeRef.current = getDefaultRange;
    projectionsDataRef.current = projectionsData;
  }, [getDefaultRange, projectionsData]);

  const activeModels = useMemo(() => {
    if (activeModelsOverride) {
      return activeModelsOverride;
    }
    const activeModelSet = new Set();
    if (!forecasts || !resolvedForecastTarget || !selectedDates.length) {
      return activeModelSet;
    }

    selectedDates.forEach((date) => {
      const forecastsForDate = forecasts[date];
      if (!forecastsForDate) return;

      const targetData = forecastsForDate[resolvedForecastTarget];
      if (!targetData) return;

      Object.keys(targetData).forEach((model) => {
        activeModelSet.add(model);
      });
    });

    return activeModelSet;
  }, [activeModelsOverride, forecasts, selectedDates, resolvedForecastTarget]);

  const defaultRange = useMemo(() => getDefaultRange(), [getDefaultRange]);

  useEffect(() => {
    setXAxisRange(null);
  }, [selectedTarget, resolvedForecastTarget]);

  useEffect(() => {
    const currentXRange = xAxisRange || defaultRange;
    if (projectionsData.length > 0 && currentXRange) {
      const initialYRange = calculateYRange(projectionsData, currentXRange);
      setYAxisRange(initialYRange);
    } else {
      setYAxisRange(null);
    }
  }, [projectionsData, xAxisRange, defaultRange, calculateYRange]);

  const handlePlotUpdate = useCallback(
    (figure) => {
      if (isResettingRef.current) {
        isResettingRef.current = false;
        return;
      }
      if (figure && figure["xaxis.range"]) {
        const newXRange = figure["xaxis.range"];
        if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) {
          setXAxisRange(newXRange);
        }
      }
    },
    [xAxisRange],
  );

  const sqrtTicks = useMemo(() => {
    if (normalizedChartScale !== "sqrt") return null;
    return buildSqrtTicks({ rawRange: rawYRange });
  }, [normalizedChartScale, rawYRange]);

  const log2Ticks = useMemo(() => {
    if (normalizedChartScale !== "log2") return null;
    return buildLog2Ticks({ rawRange: rawYRange });
  }, [normalizedChartScale, rawYRange]);

  const layout = useMemo(() => {
    const baseLayout = {
      autosize: true,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      paper_bgcolor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
      plot_bgcolor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
      font: {
        color: colorScheme === "dark" ? "#c1c2c5" : "#000000",
      },
      showlegend: showLegend,
      legend: {
        x: 0,
        y: 1,
        xanchor: "left",
        yanchor: "top",
        bgcolor:
          colorScheme === "dark"
            ? "rgba(26, 27, 30, 0.8)"
            : "rgba(255, 255, 255, 0.8)",
        bordercolor: colorScheme === "dark" ? "#444" : "#ccc",
        borderwidth: 1,
        font: {
          size: 10,
        },
      },
      hovermode: "closest",
      dragmode: false,
      margin: { l: 60, r: 30, t: 30, b: 30 },
      xaxis: {
        domain: [0, 1],
        rangeslider: {
          range: getDefaultRange(true),
        },
        rangeselector: {
          buttons: [
            { count: 1, label: "1m", step: "month", stepmode: "backward" },
            { count: 6, label: "6m", step: "month", stepmode: "backward" },
            { step: "all", label: "all" },
          ],
        },
        range: xAxisRange || defaultRange,
        showline: true,
        linewidth: 1,
        linecolor: colorScheme === "dark" ? "#aaa" : "#444",
      },
      yaxis: {
        title: (() => {
          const longName = targetDisplayNameMap[resolvedDisplayTarget];
          const baseTitle =
            targetYAxisLabelMap[longName] ||
            longName ||
            resolvedDisplayTarget ||
            "Value";
          return `${baseTitle}${getScaleTitleSuffix(normalizedChartScale)}`;
        })(),
        range: isPlotlyLogScale(normalizedChartScale) ? undefined : yAxisRange,
        autorange: isPlotlyLogScale(normalizedChartScale)
          ? true
          : yAxisRange === null,
        type: isPlotlyLogScale(normalizedChartScale) ? "log" : "linear",
        tickmode:
          (normalizedChartScale === "sqrt" && sqrtTicks) ||
          (normalizedChartScale === "log2" && log2Ticks)
            ? "array"
            : undefined,
        tickvals:
          normalizedChartScale === "sqrt" && sqrtTicks
            ? sqrtTicks.tickvals
            : normalizedChartScale === "log2" && log2Ticks
              ? log2Ticks.tickvals
              : undefined,
        ticktext:
          normalizedChartScale === "sqrt" && sqrtTicks
            ? sqrtTicks.ticktext
            : normalizedChartScale === "log2" && log2Ticks
              ? log2Ticks.ticktext
              : undefined,
      },
      shapes: selectedDates.map((date) => {
        const shiftedDate = shiftDateStringByDays(date, -3);
        return {
          type: "line",
          x0: shiftedDate,
          x1: shiftedDate,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: {
            color: "red",
            width: 1,
            dash: "dash",
          },
        };
      }),
    };

    if (layoutOverrides) {
      return layoutOverrides(baseLayout);
    }

    return baseLayout;
  }, [
    colorScheme,
    defaultRange,
    resolvedDisplayTarget,
    selectedDates,
    yAxisRange,
    xAxisRange,
    getDefaultRange,
    layoutOverrides,
    normalizedChartScale,
    sqrtTicks,
    log2Ticks,
    showLegend,
  ]);

  const config = useMemo(() => {
    const baseConfig = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      showSendToCloud: false,
      plotlyServerURL: "",
      scrollZoom: false,
      doubleClick: "reset",
      toImageButtonOptions: {
        format: "png",
        filename: buildPlotDownloadName("forecast-plot"),
      },
      modeBarButtonsToRemove: ["resetScale2d", "select2d", "lasso2d"],
      modeBarButtonsToAdd: [
        {
          name: "Reset view",
          icon: Plotly.Icons.home,
          click: function (gd) {
            const currentGetDefaultRange = getDefaultRangeRef.current;
            const currentProjectionsData = projectionsDataRef.current;

            const range = currentGetDefaultRange();
            if (!range) return;

            const newYRange =
              currentProjectionsData.length > 0
                ? calculateYRange(currentProjectionsData, range)
                : null;

            isResettingRef.current = true;

            setXAxisRange(null);
            setYAxisRange(newYRange);

            Plotly.relayout(gd, {
              "xaxis.range": range,
              "yaxis.range": newYRange,
              "yaxis.autorange": newYRange === null,
            });
          },
        },
      ],
    };

    if (configOverrides) {
      return configOverrides(baseConfig);
    }

    return baseConfig;
  }, [calculateYRange, configOverrides]);

  const hasForecasts = projectionsData.length > 1;
  if (requireTarget && !selectedTarget) {
    return (
      <Stack align="center" justify="center" style={{ height: "300px" }}>
        <Text>Please select a target to view data.</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <TitleRow
        title={hubName ? `${stateName} — ${hubName}` : stateName}
        timestamp={metadata?.last_updated}
      />
      <div
        style={{
          width: "100%",
          height: "min(800px, 60vh)",
          minHeight: 320,
          position: "relative", // Ensure the container is relative for absolute positioning
        }}
      >
        {!hasForecasts && (
          <Box
            style={{
              position: "absolute",
              top: 80, // Adjusted slightly for the larger main view
              left: 0,
              right: 0,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <Center>
              <Text size="sm" c="dimmed" fs="italic">
                No forecast data available for the current selection
              </Text>
            </Center>
          </Box>
        )}

        <Plot
          ref={plotRef}
          useResizeHandler
          style={{
            width: "100%",
            height: "100%",
            opacity: hasForecasts ? 1 : 0.6, // Dim the plot if no forecasts exist
          }}
          data={finalTraces}
          layout={layout}
          config={config}
          onRelayout={(figure) => handlePlotUpdate(figure)}
        />
      </div>
      <Stack gap={2}>
        <p
          style={{
            fontStyle: "italic",
            fontSize: "12px",
            color: "#868e96",
            textAlign: "right",
            margin: 0,
          }}
        >
          Note that forecasts should be interpreted with great caution and may
          not reliably predict rapid changes in disease trends.
        </p>
        <ModelSelector
          models={models}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          activeModels={activeModels}
        />
      </Stack>
    </Stack>
  );
};

export default ForecastPlotView;
