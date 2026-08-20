import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Stack, useMantineColorScheme } from "@mantine/core";
import Plot from "react-plotly.js";
import Plotly from "plotly.js/dist/plotly";
import ModelSelector from "./ModelSelector";
import { getModelColor } from "../config/datasets";
import { CHART_CONSTANTS } from "../constants/chart";
import {
  buildLog2Ticks,
  buildSqrtTicks,
  getScaleTitleSuffix,
  getYRangeFromTraces,
  isPlotlyLogScale,
  normalizeChartScale,
  transformValueForScale,
} from "../utils/scaleUtils";
import { buildPlotDownloadName } from "../utils/plotDownloadName";
import { extendStableModelOrder } from "../utils/modelColorUtils";

const FLU_PEAK_SEASON_START_MONTH_INDEX = 7;
const FLU_PEAK_SEASON_START_MONTH = 8;
const FLU_PEAK_SEASON_START_DAY = 1;

const toUtcDate = (dateString) => {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const shiftUtcDateByDays = (dateString, days) => {
  const date = toUtcDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
};

const shiftUtcDateByMonths = (dateString, months) => {
  const date = toUtcDate(dateString);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toIsoDate(date);
};

const padNumber = (value) => String(value).padStart(2, "0");

const getFluPeakSeasonStartYear = (dateString) => {
  const date = toUtcDate(dateString);
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= FLU_PEAK_SEASON_START_MONTH_INDEX
    ? year
    : year - 1;
};

const getFluPeakSeasonStartDate = (dateString) => {
  const seasonStartYear = getFluPeakSeasonStartYear(dateString);
  return `${seasonStartYear}-${padNumber(FLU_PEAK_SEASON_START_MONTH)}-${padNumber(FLU_PEAK_SEASON_START_DAY)}`;
};

const alignDateToFluPeakSeason = (dateString, anchorSeasonStartYear) => {
  const date = toUtcDate(dateString);
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const alignedYear =
    month >= FLU_PEAK_SEASON_START_MONTH_INDEX
      ? anchorSeasonStartYear
      : anchorSeasonStartYear + 1;

  return new Date(Date.UTC(alignedYear, month, day)).toISOString().slice(0, 10);
};

const buildHistoricalPeakGroundTruthTraces = ({
  groundTruth,
  showOtherGroundTruthSeasons,
}) => {
  if (!showOtherGroundTruthSeasons || !groundTruth?.["wk inc flu hosp"]) {
    return [];
  }

  const seasons = new Map();
  (groundTruth.dates || []).forEach((dateString, index) => {
    const value = groundTruth["wk inc flu hosp"][index];
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return;
    }

    const seasonStartYear = getFluPeakSeasonStartYear(dateString);
    if (!seasons.has(seasonStartYear)) {
      seasons.set(seasonStartYear, []);
    }

    seasons.get(seasonStartYear).push({
      actualDate: dateString,
      value,
    });
  });

  const seasonStartYears = Array.from(seasons.keys()).sort((a, b) => a - b);
  if (seasonStartYears.length <= 1) {
    return [];
  }

  const traces = [];
  let showLegend = true;

  seasonStartYears.forEach((anchorSeasonStartYear) => {
    seasonStartYears.forEach((sourceSeasonStartYear) => {
      if (anchorSeasonStartYear === sourceSeasonStartYear) {
        return;
      }

      const sourcePoints = seasons.get(sourceSeasonStartYear) || [];
      traces.push({
        x: sourcePoints.map((point) =>
          alignDateToFluPeakSeason(point.actualDate, anchorSeasonStartYear),
        ),
        y: sourcePoints.map((point) => point.value),
        type: "scatter",
        mode: "lines",
        name: "Historical Seasons",
        legendgroup: "history",
        showlegend: showLegend,
        line: { color: "#d3d3d3", width: 1.5 },
        customdata: sourcePoints.map((point) => [
          point.actualDate,
          `${sourceSeasonStartYear}-${sourceSeasonStartYear + 1}`,
          point.value,
        ]),
        hovertemplate:
          "<b>Historical season</b><br>" +
          "Source season: %{customdata[1]}<br>" +
          "Original date: %{customdata[0]}<br>" +
          "Hospitalizations: %{customdata[2]}<extra></extra>",
      });
      showLegend = false;
    });
  });

  return traces;
};

// helper to convert Hex to RGBA for opacity control
const hexToRgba = (hex, alpha) => {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    return (
      "rgba(" +
      [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") +
      "," +
      alpha +
      ")"
    );
  }
  return hex;
};

const FluPeak = ({
  data,
  peaks,
  peakDates,
  peakModels,
  windowSize,
  selectedModels,
  setSelectedModels,
  selectedDates,
  chartScale = "linear",
  intervalVisibility = { median: true, ci50: true, ci95: true },
  showLegend = true,
  showOtherGroundTruthSeasons = false,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const groundTruth = data?.ground_truth;
  const [xAxisRange, setXAxisRange] = useState(null);
  const [yAxisRange, setYAxisRange] = useState(null);
  const plotRef = useRef(null);
  const getDefaultRangeRef = useRef(() => null);
  const plotDataRef = useRef([]);
  const isResettingRef = useRef(false);
  const showMedian = intervalVisibility?.median ?? true;
  const show50 = intervalVisibility?.ci50 ?? true;
  const show95 = intervalVisibility?.ci95 ?? true;
  const normalizedChartScale = normalizeChartScale(chartScale);
  const stableModelOrderRef = useRef([]);
  const stableModelOrder = useMemo(() => {
    const nextOrder = extendStableModelOrder(
      stableModelOrderRef.current,
      selectedModels,
    );
    stableModelOrderRef.current = nextOrder;
    return nextOrder;
  }, [selectedModels]);

  const activePeakModels = useMemo(() => {
    const activeModelSet = new Set();
    const datesToCheck =
      selectedDates && selectedDates.length > 0
        ? selectedDates
        : peakDates || [];

    if (!peaks || !datesToCheck.length) return activeModelSet;

    datesToCheck.forEach((date) => {
      const dateData = peaks[date];
      if (!dateData) return;
      Object.values(dateData).forEach((metricData) => {
        if (!metricData) return;
        Object.keys(metricData).forEach((model) => activeModelSet.add(model));
      });
    });
    return activeModelSet;
  }, [peaks, selectedDates, peakDates]);

  const fullDataRange = useMemo(() => {
    const dateCandidates = [
      ...(groundTruth?.dates || []),
      ...(peakDates || []),
    ].sort();

    if (!dateCandidates.length) {
      return null;
    }

    return [dateCandidates[0], dateCandidates[dateCandidates.length - 1]];
  }, [groundTruth, peakDates]);

  const defaultRange = useMemo(() => {
    if (!fullDataRange) {
      return null;
    }

    const selectedPeakDates =
      selectedDates && selectedDates.length > 0
        ? [...selectedDates].sort()
        : peakDates && peakDates.length > 0
          ? [...peakDates].sort().slice(-1)
          : [];

    if (!selectedPeakDates.length) {
      const end = fullDataRange[1];
      return [shiftUtcDateByMonths(end, -6), shiftUtcDateByDays(end, 42)];
    }

    const initialStart = shiftUtcDateByMonths(selectedPeakDates[0], -3);
    const initialEnd = shiftUtcDateByDays(
      selectedPeakDates[selectedPeakDates.length - 1],
      42,
    );

    return [
      initialStart < fullDataRange[0] ? fullDataRange[0] : initialStart,
      initialEnd > fullDataRange[1] ? fullDataRange[1] : initialEnd,
    ];
  }, [fullDataRange, peakDates, selectedDates]);

  const rangesliderRange = useMemo(() => fullDataRange, [fullDataRange]);

  const calculateYRange = useCallback((chartData, xRange) => {
    if (!chartData?.length || !xRange) {
      return null;
    }

    let minY = Infinity;
    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    chartData.forEach((trace) => {
      if (!trace.x || !trace.y) return;

      for (let index = 0; index < trace.x.length; index += 1) {
        const pointDate = new Date(trace.x[index]);
        if (pointDate < startDate || pointDate > endDate) {
          continue;
        }

        const value = Number(trace.y[index]);
        if (Number.isNaN(value)) {
          continue;
        }

        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      }
    });

    if (minY === Infinity || maxY === -Infinity) {
      return null;
    }

    const padding = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
    return [Math.max(0, minY - padding), maxY + padding];
  }, []);

  const { plotData, rawYRange } = useMemo(() => {
    const traces = [];

    traces.push(
      ...buildHistoricalPeakGroundTruthTraces({
        groundTruth,
        showOtherGroundTruthSeasons,
      }),
    );

    // Continuous ground truth data
    const targetKey = "wk inc flu hosp";
    if (groundTruth && groundTruth[targetKey] && groundTruth.dates) {
      const dates = [...groundTruth.dates];
      const values = [...groundTruth[targetKey]];
      if (dates.length > 0) {
        traces.push({
          x: dates,
          y: values,
          name: "Observed",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "black", width: 2, dash: "dash" },
          showlegend: true,
          marker: { size: 4, color: "black" },
          hovertemplate:
            "<b>Observed</b><br>" +
            "Hospitalizations: %{y}<br>" +
            "Date: %{x}<extra></extra>",
        });
      }
    }

    // Model peak predictions data
    if (peaks && selectedModels.length > 0) {
      const rawDates =
        selectedDates && selectedDates.length > 0
          ? selectedDates
          : peakDates || [];
      const datesToCheck = [...rawDates].sort(); // Sort chronological

      selectedModels.forEach((model) => {
        const xValues = [];
        const yValues = [];
        const hoverTexts = [];
        const pointColors = [];

        // Base color for this model (Solid, used for Legend)
        const baseColorHex = getModelColor(model, stableModelOrder);

        datesToCheck.forEach((refDate, index) => {
          const dateData = peaks[refDate];
          if (!dateData) return;

          const intensityData = dateData["peak inc flu hosp"]?.[model];
          if (!intensityData || !intensityData.predictions) return;

          // extract confidence intervals
          const iPreds = intensityData.predictions;
          const getVal = (q) => {
            const idx = iPreds.quantiles.indexOf(q);
            return idx !== -1 ? iPreds.values[idx] : null;
          };

          const medianVal = getVal(0.5);
          const low95 = getVal(0.025);
          const high95 = getVal(0.975);
          const low50 = getVal(0.25);
          const high50 = getVal(0.75);

          if (medianVal === null) return;

          const timingData = dateData["peak week inc flu hosp"]?.[model];
          if (!timingData || !timingData.predictions) return;

          const tPreds = timingData.predictions;
          const dateArray = tPreds["peak week"] || tPreds["values"];
          const probArray = tPreds["probabilities"];

          let bestDateStr = null;
          let lowDate95 = null,
            highDate95 = null;
          let lowDate50 = null,
            highDate50 = null;

          if (dateArray && probArray) {
            let cumulativeProb = 0;
            let medianIdx = -1,
              q025Idx = -1,
              q975Idx = -1,
              q25Idx = -1,
              q75Idx = -1;
            for (let i = 0; i < probArray.length; i++) {
              cumulativeProb += probArray[i];

              if (q025Idx === -1 && cumulativeProb >= 0.025) q025Idx = i;
              if (q25Idx === -1 && cumulativeProb >= 0.25) q25Idx = i;
              if (medianIdx === -1 && cumulativeProb >= 0.5) medianIdx = i;
              if (q75Idx === -1 && cumulativeProb >= 0.75) q75Idx = i;
              if (q975Idx === -1 && cumulativeProb >= 0.975) q975Idx = i;
            }
            if (medianIdx === -1) medianIdx = probArray.length - 1;
            if (q975Idx === -1) q975Idx = probArray.length - 1;
            if (q75Idx === -1) q75Idx = probArray.length - 1;

            bestDateStr = dateArray[medianIdx];
            lowDate95 = dateArray[q025Idx !== -1 ? q025Idx : 0];
            highDate95 = dateArray[q975Idx];
            lowDate50 = dateArray[q25Idx !== -1 ? q25Idx : 0];
            highDate50 = dateArray[q75Idx];
          } else if (dateArray && dateArray.length > 0) {
            bestDateStr = dateArray[Math.floor(dateArray.length / 2)];
          }
          if (!bestDateStr) return;

          const normalizedDate = bestDateStr;
          // Gradient Opacity Calculation
          const minOpacity = 0.4;
          const alpha =
            datesToCheck.length === 1
              ? 1.0
              : minOpacity +
                (index / (datesToCheck.length - 1)) * (1 - minOpacity);

          const dynamicColor = hexToRgba(baseColorHex, alpha);

          if (show50 || show95) {
            // 95% vertical whisker (hosp)
            if (show95 && low95 !== null && high95 !== null) {
              traces.push({
                x: [normalizedDate, normalizedDate],
                y: [low95, high95],
                mode: "lines+markers",
                line: {
                  color: dynamicColor,
                  width: 1,
                  dash: "dash",
                },
                marker: {
                  symbol: "line-ew",
                  color: dynamicColor,
                  size: 10,
                  line: {
                    width: 1,
                    color: dynamicColor,
                  },
                },
                legendgroup: model,
                showlegend: false,
                hoverinfo: "skip",
              });
            }

            // 50% vertical whisker (hosp)
            if (show50 && low50 !== null && high50 !== null) {
              traces.push({
                x: [normalizedDate, normalizedDate],
                y: [low50, high50],
                mode: "lines",
                line: {
                  color: dynamicColor,
                  width: 4,
                  dash: "6px, 3px",
                },
                legendgroup: model,
                showlegend: false,
                hoverinfo: "skip",
              });
            }

            // 95% horizontal whisker (dates)
            if (show95 && lowDate95 && highDate95) {
              traces.push({
                x: [lowDate95, highDate95],
                y: [medianVal, medianVal],
                mode: "lines+markers",
                line: {
                  color: dynamicColor,
                  width: 1,
                  dash: "dash",
                },
                marker: {
                  symbol: "line-ns",
                  color: dynamicColor,
                  size: 10,
                  line: { width: 1, color: dynamicColor },
                },
                legendgroup: model,
                showlegend: false,
                hoverinfo: "skip",
              });
            }

            // 50% horizontal whisker (dates)
            if (show50 && lowDate50 && highDate50) {
              traces.push({
                x: [lowDate50, highDate50],
                y: [medianVal, medianVal],
                mode: "lines",
                line: {
                  color: dynamicColor,
                  width: 4,
                  dash: "6px, 3px",
                },
                legendgroup: model,
                showlegend: false,
                hoverinfo: "skip",
              });
            }
          }
          if (showMedian) {
            xValues.push(bestDateStr);
            yValues.push(medianVal);
            pointColors.push(dynamicColor);
          }

          const timing50 = `${lowDate50} - ${highDate50}`;
          const timing95 = `${lowDate95} - ${highDate95}`;
          const formattedMedian = Math.round(medianVal).toLocaleString();
          const formatted50 = `${Math.round(low50).toLocaleString()} - ${Math.round(high50).toLocaleString()}`;
          const formatted95 = `${Math.round(low95).toLocaleString()} - ${Math.round(high95).toLocaleString()}`;

          const timing50Row = show50 ? `50% CI: [${timing50}]<br>` : "";
          const timing95Row = show95 ? `95% CI: [${timing95}]<br>` : "";
          const burden50Row = show50 ? `50% CI: [${formatted50}]<br>` : "";
          const burden95Row = show95 ? `95% CI: [${formatted95}]<br>` : "";

          hoverTexts.push(
            `${model}<br>` +
              `<b>Peak timing:</b><br>` +
              `Median Week: <b>${bestDateStr}</b><br>` +
              timing50Row +
              timing95Row +
              `<span style="border-bottom: 1px solid #ccc; display: block; margin: 5px 0;"></span>` +
              `<b>Peak hospitalization:</b><br>` +
              `Median: <b>${formattedMedian}</b><br>` +
              burden50Row +
              burden95Row +
              `<span style="color: #ffffff; font-size: 0.8em">predicted as of ${refDate}</span>`,
          );
        });

        // actual trace
        if (showMedian && xValues.length > 0) {
          traces.push({
            x: xValues,
            y: yValues,
            name: model,
            type: "scatter",
            mode: "markers",
            marker: {
              color: pointColors,
              size: 12,
              symbol: "circle",
              line: { width: 1, color: "white" },
            },
            hoverlabel: {
              font: { color: "#ffffff" },
              bordercolor: "#ffffff", // maakes border white
            },
            hovertemplate: "%{text}<extra></extra>",
            text: hoverTexts,
            showlegend: false,
            legendgroup: model,
          });

          // dummy legend
          traces.push({
            x: [null],
            y: [null],
            name: model,
            type: "scatter",
            mode: "markers",
            marker: {
              color: baseColorHex,
              size: 12,
              symbol: "circle",
              line: { width: 1, color: "white" },
            },
            showlegend: true,
            legendgroup: model,
          });
        }
      });
    }

    const rawRange = getYRangeFromTraces(traces);

    if (normalizedChartScale !== "sqrt" && normalizedChartScale !== "log2") {
      return { plotData: traces, rawYRange: rawRange };
    }

    const scaledTraces = traces.map((trace) => {
      if (!Array.isArray(trace.y)) return trace;
      const originalY = trace.y;
      const scaledY = originalY.map((value) =>
        transformValueForScale(value, normalizedChartScale),
      );
      const nextTrace = { ...trace, y: scaledY };

      if (trace.hovertemplate && trace.hovertemplate.includes("%{y}")) {
        nextTrace.text = originalY.map((value) =>
          Number(value).toLocaleString(),
        );
        nextTrace.hovertemplate = trace.hovertemplate.replace(
          "%{y}",
          "%{text}",
        );
      } else if (trace.hoverinfo && trace.hoverinfo.includes("y")) {
        nextTrace.text = originalY.map(
          (value) => `${trace.name}: ${Number(value).toLocaleString()}`,
        );
        nextTrace.hoverinfo = "text";
      }

      return nextTrace;
    });

    return { plotData: scaledTraces, rawYRange: rawRange };
  }, [
    groundTruth,
    peaks,
    selectedModels,
    selectedDates,
    peakDates,
    showMedian,
    show50,
    show95,
    showOtherGroundTruthSeasons,
    normalizedChartScale,
    stableModelOrder,
  ]);

  useEffect(() => {
    getDefaultRangeRef.current = () => defaultRange;
    plotDataRef.current = plotData;
  }, [defaultRange, plotData]);

  useEffect(() => {
    const currentRange = xAxisRange || defaultRange;
    if (plotData.length > 0 && currentRange) {
      setYAxisRange(calculateYRange(plotData, currentRange));
    } else {
      setYAxisRange(null);
    }
  }, [plotData, xAxisRange, defaultRange, calculateYRange]);

  const handlePlotUpdate = useCallback(
    (figure) => {
      if (isResettingRef.current) {
        isResettingRef.current = false;
        return;
      }

      if (figure && figure["xaxis.range"]) {
        const nextXRange = figure["xaxis.range"];
        if (JSON.stringify(nextXRange) !== JSON.stringify(xAxisRange)) {
          setXAxisRange(nextXRange);
        }
      }
    },
    [xAxisRange],
  );

  const sqrtTicks = useMemo(() => {
    if (normalizedChartScale !== "sqrt") return null;
    return buildSqrtTicks({
      rawRange: rawYRange,
      formatValue: (value) => Number(value).toLocaleString(),
    });
  }, [normalizedChartScale, rawYRange]);

  const log2Ticks = useMemo(() => {
    if (normalizedChartScale !== "log2") return null;
    return buildLog2Ticks({
      rawRange: rawYRange,
      formatValue: (value) => Number(value).toLocaleString(),
    });
  }, [normalizedChartScale, rawYRange]);

  const layout = useMemo(
    () => ({
      width: windowSize
        ? Math.min(
            CHART_CONSTANTS.MAX_WIDTH,
            windowSize.width * CHART_CONSTANTS.WIDTH_RATIO,
          )
        : undefined,
      height: windowSize
        ? Math.min(CHART_CONSTANTS.MAX_HEIGHT, windowSize.height * 0.5)
        : 500,
      autosize: true,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      paper_bgcolor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
      plot_bgcolor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
      font: { color: colorScheme === "dark" ? "#c1c2c5" : "#000000" },
      margin: { l: 60, r: 30, t: 30, b: 50 },
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
        font: { size: 10 },
      },
      hovermode: "closest",
      hoverlabel: { namelength: -1 },
      dragmode: false,
      xaxis: {
        range: xAxisRange || defaultRange,
        rangeslider: rangesliderRange ? { range: rangesliderRange } : undefined,
        rangeselector: {
          buttons: [
            { count: 1, label: "1m", step: "month", stepmode: "backward" },
            { count: 6, label: "6m", step: "month", stepmode: "backward" },
            { step: "all", label: "all" },
          ],
        },
        showline: true,
        linewidth: 1,
        linecolor: colorScheme === "dark" ? "#aaa" : "#444",
      },
      yaxis: {
        title: (() => {
          const baseTitle = "Flu Hospitalizations";
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

      // dynamic gray shading section
      shapes: selectedDates.flatMap((dateStr) => {
        const seasonStart = getFluPeakSeasonStartDate(dateStr);
        return [
          {
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: seasonStart,
            x1: dateStr,
            y0: 0,
            y1: 1,
            fillcolor:
              colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(128, 128, 128, 0.1)",
            line: { width: 0 },
            layer: "below",
          },
          {
            type: "line",
            x0: dateStr,
            x1: dateStr,
            y0: 0,
            y1: 1,
            yref: "paper",
            line: {
              color: "rgba(255, 255, 255, 0.05)",
              width: 2,
            },
          },
        ];
      }),
    }),
    [
      colorScheme,
      windowSize,
      selectedDates,
      defaultRange,
      rangesliderRange,
      xAxisRange,
      yAxisRange,
      normalizedChartScale,
      sqrtTicks,
      log2Ticks,
      showLegend,
    ],
  );

  const config = useMemo(
    () => ({
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarPosition: "left",
      scrollZoom: false,
      doubleClick: "reset",
      modeBarButtonsToRemove: ["select2d", "lasso2d", "resetScale2d"],
      toImageButtonOptions: {
        format: "png",
        filename: buildPlotDownloadName("peak-plot"),
      },
      modeBarButtonsToAdd: [
        {
          name: "Reset view",
          icon: Plotly.Icons.home,
          click: function (gd) {
            const currentDefaultRange = getDefaultRangeRef.current();
            const currentPlotData = plotDataRef.current;

            if (!currentDefaultRange) return;

            const nextYRange = calculateYRange(
              currentPlotData,
              currentDefaultRange,
            );
            isResettingRef.current = true;
            setXAxisRange(null);
            setYAxisRange(nextYRange);

            Plotly.relayout(gd, {
              "xaxis.range": currentDefaultRange,
              "yaxis.range": nextYRange,
              "yaxis.autorange": nextYRange === null,
            });
          },
        },
      ],
    }),
    [calculateYRange],
  );

  return (
    <Stack gap="md" style={{ padding: "20px" }}>
      <style>{`
                .js-plotly-plot .plotly .nsewdrag {
                    cursor: default !important;
                }
            `}</style>
      <div style={{ width: "100%", minHeight: "400px" }}>
        <Plot
          ref={plotRef}
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler={true}
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
          models={peakModels}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          activeModels={activePeakModels}
        />
      </Stack>
    </Stack>
  );
};

export default FluPeak;
