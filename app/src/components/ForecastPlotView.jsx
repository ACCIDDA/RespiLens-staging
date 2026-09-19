import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMantineColorScheme, Stack, Text, Box, Center } from "@mantine/core";
import Plot from "react-plotly.js";
import Plotly from "plotly.js/dist/plotly";
import ModelSelector from "./ModelSelector";
import {
  CHART_CONSTANTS,
  GROUND_TRUTH_LINE_WIDTH,
  GROUND_TRUTH_MARKER_SIZE,
  PLOT_CHROME,
  RANGESLIDER_STYLE,
  getChartAxisStyle,
  getChartFont,
  getChartInk,
  getChartLegendStyle,
  getForecastDateLineStyle,
  getRangeSelectorStyle,
} from "../constants/chart";
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
import {
  buildPlotDownloadName,
  PLOT_DOWNLOAD_IMAGE_SCALE,
} from "../utils/plotDownloadName";
import { getOfficialModels } from "../utils/forecastleScoring";
import {
  getEarliestGroundTruthSeasonStartDate,
  getSeasonDateRange,
  getSeasonStartYear,
} from "../utils/forecastSeasons";
import { copyRange, getRelayoutXRange } from "../utils/plotRange";
import ChartCaption from "./ChartCaption";

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
  const {
    chartScale,
    intervalVisibility,
    showLegend,
    showOtherGroundTruthSeasons,
    viewType,
  } = useView();

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

  const {
    traces: projectionsData,
    rawYRange,
    hasForecastTraces,
  } = useQuantileForecastTraces({
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
    groundTruthLineWidth: GROUND_TRUTH_LINE_WIDTH,
    groundTruthMarkerSize: GROUND_TRUTH_MARKER_SIZE,
    groundTruthColor: getChartInk(colorScheme).text,
    showLegendForFirstDate: showLegend,
    fillMissingQuantiles: false,
    showMedian,
    show50,
    show95,
    showOtherGroundTruthSeasons,
    viewType,
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
      const newXRange = getRelayoutXRange(figure, projectionsData);
      if (
        newXRange &&
        JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)
      ) {
        setXAxisRange(newXRange);
      }
    },
    [xAxisRange, projectionsData],
  );

  const sqrtTicks = useMemo(() => {
    if (normalizedChartScale !== "sqrt") return null;
    return buildSqrtTicks({ rawRange: rawYRange });
  }, [normalizedChartScale, rawYRange]);

  const log2Ticks = useMemo(() => {
    if (normalizedChartScale !== "log2") return null;
    return buildLog2Ticks({ rawRange: rawYRange });
  }, [normalizedChartScale, rawYRange]);

  const seasonDividerShapes = useMemo(() => {
    if (!showOtherGroundTruthSeasons || !groundTruth?.dates?.length) {
      return [];
    }

    const hubSeasonStartDate = getEarliestGroundTruthSeasonStartDate({
      groundTruth,
      target: resolvedForecastTarget,
    });
    const dividerYears = Array.from(
      new Set(
        groundTruth.dates
          .filter((dateString) =>
            hubSeasonStartDate ? dateString >= hubSeasonStartDate : true,
          )
          .map((dateString) => getSeasonStartYear(dateString)),
      ),
    )
      .sort((a, b) => a - b)
      .slice(1);

    return dividerYears.map((seasonStartYear) => {
      const { start } = getSeasonDateRange(seasonStartYear);
      return {
        type: "line",
        x0: start,
        x1: start,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: {
          color: colorScheme === "dark" ? "#495057" : "#ced4da",
          width: 1,
          dash: "dot",
        },
        layer: "below",
      };
    });
  }, [
    colorScheme,
    groundTruth,
    resolvedForecastTarget,
    showOtherGroundTruthSeasons,
  ]);

  const layout = useMemo(() => {
    const baseLayout = {
      autosize: true,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      ...PLOT_CHROME,
      font: getChartFont(colorScheme),
      showlegend: showLegend,
      legend: {
        ...getChartLegendStyle(colorScheme),
        x: 0.01,
        y: 0.99,
        xanchor: "left",
        yanchor: "top",
      },
      hovermode: "closest",
      dragmode: false,
      margin: { l: 64, r: 30, t: 36, b: 30 },
      xaxis: {
        ...getChartAxisStyle(colorScheme),
        domain: [0, 1],
        rangeslider: {
          ...RANGESLIDER_STYLE,
          range: getDefaultRange(true),
        },
        rangeselector: {
          ...getRangeSelectorStyle(colorScheme),
          buttons: [
            { count: 1, label: "1m", step: "month", stepmode: "backward" },
            { count: 6, label: "6m", step: "month", stepmode: "backward" },
            { step: "all", label: "all" },
          ],
        },
        range: copyRange(xAxisRange || defaultRange),
      },
      yaxis: {
        ...getChartAxisStyle(colorScheme),
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
      shapes: [
        ...seasonDividerShapes,
        ...selectedDates.map((date) => {
          const shiftedDate = shiftDateStringByDays(date, -3);
          return {
            type: "line",
            x0: shiftedDate,
            x1: shiftedDate,
            y0: 0,
            y1: 1,
            yref: "paper",
            line: getForecastDateLineStyle(colorScheme),
          };
        }),
      ],
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
    seasonDividerShapes,
  ]);

  const config = useMemo(() => {
    const baseConfig = {
      responsive: true,
      // Plotly's toolbar is hidden: download lives in the chart header,
      // zoom in the minimap and range buttons
      displayModeBar: false,
      displaylogo: false,
      showSendToCloud: false,
      plotlyServerURL: "",
      scrollZoom: false,
      doubleClick: "reset",
      toImageButtonOptions: {
        format: "png",
        filename: buildPlotDownloadName("forecast-plot"),
        scale: PLOT_DOWNLOAD_IMAGE_SCALE,
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

  const hasForecasts = hasForecastTraces;
  if (requireTarget && !selectedTarget) {
    return (
      <Stack align="center" justify="center" style={{ height: "300px" }}>
        <Text>Please select a target to view data.</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <div
        style={{
          width: "100%",
          height: "min(880px, 60vh)",
          minHeight: 340,
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
        <ChartCaption forecastNote />
        <ModelSelector
          models={models}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          activeModels={activeModels}
          selectedDates={selectedDates}
        />
      </Stack>
    </Stack>
  );
};

export default ForecastPlotView;
