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
import { getModelColor } from "../../config/datasets";
import { nhsnSlugToNameMap, targetDisplayNameMap } from "../../utils/mapUtils";
import {
  buildLog2Ticks,
  buildSqrtTicks,
  getYRangeFromTraces,
  isPlotlyLogScale,
  normalizeChartScale,
  transformValueForScale,
} from "../../utils/scaleUtils";
import {
  FLU_PEAK_GROUND_TRUTH_START,
  FLU_PEAK_NORMALIZED_X_RANGE,
  getNormalizedPeakDate,
} from "../../utils/forecastSeasons";

const NSSP_COLUMN_LABELS = {
  percent_visits_covid: "COVID-19",
  percent_visits_influenza: "Influenza",
  percent_visits_rsv: "RSV",
};

const toRgba = (hex, alpha) => {
  const match = hex.replace("#", "").match(/.{1,2}/g);
  if (!match) return hex;
  const [r, g, b] = match.map((component) => parseInt(component, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MiniPlot = ({ plot, onMetadataLoad, plotHeight = 210 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();

  const isNHSN = plot.viewType === "nhsnall";
  const isNSSP = plot.viewType === "nsspall";
  const isFluPeak = plot.viewType === "flu_peak";
  const isSeriesView = isNHSN || isNSSP;
  const normalizedScale = normalizeChartScale(plot.settings.scale);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const dataUrl = `/processed_data/${plot.fullDataPath}`;
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error("Data not found");
        const json = await response.json();
        setData(json);
        onMetadataLoad?.(json?.metadata || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [plot.fullDataPath, onMetadataLoad]);

  const { traces: forecastTraces } = useQuantileForecastTraces({
    groundTruth: isSeriesView || isFluPeak ? null : data?.ground_truth,
    forecasts: isSeriesView || isFluPeak ? null : data?.forecasts,
    selectedDates: plot.settings.dates || [],
    selectedModels: plot.settings.models || [],
    modelOrder: plot.settings.models || [],
    target: plot.settings.target,
    showMedian: plot.settings.intervals?.includes("median") ?? true,
    show50: plot.settings.intervals?.includes("ci50") ?? true,
    show95: plot.settings.intervals?.includes("ci95") ?? true,
    showLegendForFirstDate: false,
    modelLineWidth: 1.5,
    modelMarkerSize: 4,
    transformY:
      normalizedScale === "sqrt" || normalizedScale === "log2"
        ? (value) => transformValueForScale(value, normalizedScale)
        : null,
  });

  const nhsnTraces = useMemo(() => {
    if (!isNHSN || !data?.series) return [];

    const dateAxis = data.series.dates;
    return (plot.settings.columns || [])
      .map((slug) => {
        const longformName = nhsnSlugToNameMap[slug] || slug;
        const rawY = data.series[longformName] || [];
        const yValues = rawY.map((value) =>
          transformValueForScale(value, normalizedScale),
        );

        return {
          x: dateAxis,
          y: yValues,
          name: longformName,
          type: "scatter",
          mode: "lines",
          line: {
            color: getModelColor(slug, plot.settings.columns || []),
            width: 2,
          },
        };
      })
      .filter((trace) => trace.y.length > 0);
  }, [isNHSN, data, plot.settings, normalizedScale]);

  const nsspTraces = useMemo(() => {
    if (!isNSSP || !data?.series) return [];

    const dateAxis = data.series.dates || [];
    return (plot.settings.columns || [])
      .map((column) => {
        const rawY = data.series[column] || [];
        const yValues = rawY.map((value) =>
          transformValueForScale(value, normalizedScale),
        );

        return {
          x: dateAxis,
          y: yValues,
          name: NSSP_COLUMN_LABELS[column] || column,
          type: "scatter",
          mode: "lines+markers",
          line: {
            color: getModelColor(column, plot.settings.columns || []),
            width: 2,
          },
          marker: { size: 4 },
          customdata: rawY,
          hovertemplate:
            "%{x}<br>%{fullData.name}: %{customdata:.2f}%<extra></extra>",
        };
      })
      .filter((trace) => trace.y.length > 0);
  }, [isNSSP, data, plot.settings, normalizedScale]);

  const fluPeakTraces = useMemo(() => {
    if (!isFluPeak || !data) return [];

    const traces = [];
    const selectedDates = (plot.settings.dates || []).slice().sort();
    const selectedModels = plot.settings.models || [];
    const peaks = data.peaks || {};
    const groundTruth = data.ground_truth;
    const showMedian = plot.settings.intervals?.includes("median") ?? true;
    const show50 = plot.settings.intervals?.includes("ci50") ?? true;
    const show95 = plot.settings.intervals?.includes("ci95") ?? true;
    const transformY = (value) => {
      if (value === null || value === undefined) return value;
      return transformValueForScale(value, normalizedScale);
    };

    if (groundTruth?.["wk inc flu hosp"] && groundTruth?.dates) {
      const currentSeason = groundTruth.dates.reduce(
        (accumulator, date, index) => {
          if (date >= FLU_PEAK_GROUND_TRUTH_START) {
            const rawValue = groundTruth["wk inc flu hosp"][index];
            accumulator.x.push(getNormalizedPeakDate(date));
            accumulator.y.push(transformY(rawValue));
            accumulator.rawY.push(rawValue);
          }
          return accumulator;
        },
        { x: [], y: [], rawY: [] },
      );

      if (currentSeason.x.length > 0) {
        traces.push({
          x: currentSeason.x,
          y: currentSeason.y,
          customdata: currentSeason.rawY,
          name: "Current season",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "black", width: 2, dash: "dash" },
          marker: { size: 4, color: "black" },
          hovertemplate:
            "<b>Current season</b><br>%{x|%b %d}: %{customdata:.0f}<extra></extra>",
        });
      }
    }

    selectedModels.forEach((model) => {
      const baseColor = getModelColor(model, plot.settings.models || []);

      selectedDates.forEach((referenceDate, dateIndex) => {
        const dateData = peaks?.[referenceDate];
        const intensityData = dateData?.["peak inc flu hosp"]?.[model];
        const timingData = dateData?.["peak week inc flu hosp"]?.[model];

        if (!intensityData?.predictions || !timingData?.predictions) {
          return;
        }

        const intensityPredictions = intensityData.predictions;
        const getQuantileValue = (quantile) => {
          const quantileIndex =
            intensityPredictions.quantiles?.indexOf(quantile);
          return quantileIndex !== -1
            ? intensityPredictions.values?.[quantileIndex]
            : null;
        };

        const medianY = getQuantileValue(0.5);
        const low95 = getQuantileValue(0.025);
        const high95 = getQuantileValue(0.975);
        const low50 = getQuantileValue(0.25);
        const high50 = getQuantileValue(0.75);

        if (medianY === null) {
          return;
        }

        const timingPredictions = timingData.predictions;
        const dateArray =
          timingPredictions["peak week"] || timingPredictions.values || [];
        const probabilityArray = timingPredictions.probabilities || [];
        if (dateArray.length === 0) {
          return;
        }

        let cumulativeProbability = 0;
        let medianIndex = -1;
        probabilityArray.forEach((probability, probabilityIndex) => {
          cumulativeProbability += probability;
          if (medianIndex === -1 && cumulativeProbability >= 0.5) {
            medianIndex = probabilityIndex;
          }
        });

        if (medianIndex === -1) {
          medianIndex = Math.floor(dateArray.length / 2);
        }

        const normalizedDate = getNormalizedPeakDate(dateArray[medianIndex]);
        const opacity =
          selectedDates.length <= 1
            ? 1
            : 0.4 + (dateIndex / (selectedDates.length - 1)) * 0.6;
        const traceColor = toRgba(baseColor, opacity);

        if (show95 && low95 !== null && high95 !== null) {
          traces.push({
            x: [normalizedDate, normalizedDate],
            y: [transformY(low95), transformY(high95)],
            mode: "lines+markers",
            line: { color: traceColor, width: 1, dash: "dash" },
            marker: {
              symbol: "line-ew",
              color: traceColor,
              size: 8,
              line: { width: 1, color: traceColor },
            },
            hoverinfo: "skip",
            showlegend: false,
          });
        }

        if (show50 && low50 !== null && high50 !== null) {
          traces.push({
            x: [normalizedDate, normalizedDate],
            y: [transformY(low50), transformY(high50)],
            mode: "lines",
            line: { color: traceColor, width: 4 },
            hoverinfo: "skip",
            showlegend: false,
          });
        }

        if (showMedian) {
          traces.push({
            x: [normalizedDate],
            y: [transformY(medianY)],
            customdata: [[referenceDate, medianY]],
            name: model,
            type: "scatter",
            mode: "markers",
            marker: {
              color: traceColor,
              size: 8,
              line: { color: baseColor, width: 1 },
            },
            hovertemplate:
              "<b>%{fullData.name}</b><br>Reference date: %{customdata[0]}<br>Peak: %{customdata[1]:.0f}<br>Week: %{x|%b %d}<extra></extra>",
          });
        }
      });
    });

    return traces;
  }, [isFluPeak, data, plot.settings, normalizedScale]);

  let finalTraces = forecastTraces;
  if (isNHSN) {
    finalTraces = nhsnTraces;
  } else if (isNSSP) {
    finalTraces = nsspTraces;
  } else if (isFluPeak) {
    finalTraces = fluPeakTraces;
  }

  const layout = useMemo(() => {
    let xRange;
    let yRange;

    if (data) {
      if (isSeriesView && data.series?.dates?.length > 0) {
        const lastDate = new Date(
          data.series.dates[data.series.dates.length - 1],
        );
        const startDate = new Date(lastDate);
        startDate.setMonth(startDate.getMonth() - (isNSSP ? 6 : 3));
        const endDate = new Date(lastDate);
        if (isNSSP) {
          endDate.setDate(endDate.getDate() + 14);
        }
        xRange = [
          startDate.toISOString().split("T")[0],
          isNSSP
            ? endDate.toISOString().split("T")[0]
            : data.series.dates[data.series.dates.length - 1],
        ];
      } else if (isFluPeak) {
        xRange = FLU_PEAK_NORMALIZED_X_RANGE;
      } else if (plot.settings.dates?.length > 0) {
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

      if (finalTraces?.length > 0) {
        const traceRange = getYRangeFromTraces(finalTraces);
        if (traceRange) {
          const maxY = traceRange[1];
          const padding = maxY === 0 ? 1 : maxY * 0.2;
          yRange = [0, maxY + padding];
        }
      }
    }

    const usesPercentSuffix =
      isNSSP ||
      plot.settings.target?.includes("%") ||
      plot.settings.target?.includes("pct") ||
      plot.settings.target?.includes("Percent") ||
      plot.settings.target?.includes("percent");

    const sqrtTicks =
      normalizedScale === "sqrt" && yRange
        ? buildSqrtTicks({
            rawRange: [0, yRange[1] ** 2],
            tickCount: 4,
            formatValue: (value) =>
              value.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }),
          })
        : null;

    const log2Ticks =
      normalizedScale === "log2" && yRange
        ? buildLog2Ticks({
            rawRange: [1, 2 ** yRange[1]],
            maxTickCount: 4,
            formatValue: (value) =>
              value.toLocaleString(undefined, {
                maximumFractionDigits: usesPercentSuffix ? 2 : 0,
              }),
          })
        : null;

    return {
      autosize: true,
      height: plotHeight,
      margin: { l: 40, r: 8, t: 8, b: 30 },
      showlegend: false,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      dragmode: "pan",
      xaxis: {
        showgrid: false,
        fixedrange: false,
        tickfont: { size: 8 },
        range: xRange,
        tickformat: isFluPeak ? "%b" : undefined,
      },
      yaxis: {
        showgrid: true,
        gridcolor: colorScheme === "dark" ? "#333" : "#eee",
        fixedrange: true,
        tickfont: { size: 8 },
        type: isPlotlyLogScale(normalizedScale) ? "log" : "linear",
        range: isPlotlyLogScale(normalizedScale) ? undefined : yRange,
        nticks: 5,
        ticksuffix:
          normalizedScale === "sqrt" || normalizedScale === "log2"
            ? undefined
            : usesPercentSuffix
              ? "%"
              : "",
        tickvals: sqrtTicks?.tickvals ?? log2Ticks?.tickvals,
        ticktext: sqrtTicks?.ticktext ?? log2Ticks?.ticktext,
      },
      shapes:
        !isNHSN && !isNSSP && !isFluPeak
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
  }, [
    colorScheme,
    plot.settings,
    normalizedScale,
    isNHSN,
    isNSSP,
    isFluPeak,
    isSeriesView,
    data,
    finalTraces,
    plotHeight,
  ]);

  const tooltipContent = useMemo(() => {
    const resolvedTarget =
      targetDisplayNameMap[plot.settings.target] || plot.settings.target;
    let detailBadges = plot.settings.dates?.map((date) => (
      <Badge key={date} size="xs" variant="outline" color="blue.3">
        {date}
      </Badge>
    ));

    if (isNHSN) {
      detailBadges = plot.settings.columns?.map((slug) => (
        <Badge key={slug} size="xs" variant="outline" color="blue.3">
          {nhsnSlugToNameMap[slug] || slug}
        </Badge>
      ));
    } else if (isNSSP) {
      detailBadges = plot.settings.columns?.map((column) => (
        <Badge key={column} size="xs" variant="outline" color="blue.3">
          {NSSP_COLUMN_LABELS[column] || column}
        </Badge>
      ));
    }

    return (
      <Stack gap={8} p={5}>
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

        <Group gap={6} align="flex-start">
          <Text size="xs" fw={700} style={{ flexShrink: 0 }}>
            TARGET:
          </Text>
          <Text size="xs">{resolvedTarget}</Text>
        </Group>

        <Group gap={6}>
          <Text size="xs" fw={700}>
            SCALE:
          </Text>
          <Badge size="xs" variant="outline" color="blue.3">
            {normalizedScale.toUpperCase()}
          </Badge>
        </Group>

        <Stack gap={4}>
          <Text size="xs" fw={700}>
            {isNHSN || isNSSP ? "COLUMNS:" : "DATES:"}
          </Text>
          <Group gap={4}>{detailBadges}</Group>
        </Stack>

        {!isNHSN && !isNSSP && (
          <Stack gap={4}>
            <Text size="xs" fw={700}>
              MODELS:
            </Text>
            <Group gap={4}>
              {plot.settings.models?.map((model) => (
                <Badge key={model} size="xs" variant="outline" color="blue.3">
                  {model}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}
      </Stack>
    );
  }, [plot.settings, isNHSN, isNSSP, normalizedScale]);

  if (loading) {
    return (
      <Center h={plotHeight}>
        <Loader size="sm" variant="dots" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h={plotHeight}>
        <Text size="xs" c="red">
          Error loading chart
        </Text>
      </Center>
    );
  }

  return (
    <Tooltip
      label={tooltipContent}
      position="bottom"
      withArrow
      multiline
      w={350}
      events={{ hover: true, focus: false, touch: true }}
    >
      <Box h={plotHeight} style={{ overflow: "hidden", cursor: "grab" }}>
        <Plot
          data={finalTraces}
          layout={layout}
          config={{
            displayModeBar: false,
            staticPlot: false,
            scrollZoom: true,
            responsive: true,
          }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </Box>
    </Tooltip>
  );
};

export default MiniPlot;
