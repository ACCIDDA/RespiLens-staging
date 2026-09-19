import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useMantineColorScheme,
  Stack,
  Text,
  Center,
  SimpleGrid,
  Paper,
  Loader,
  Box,
  UnstyledButton,
} from "@mantine/core";
import Plot from "react-plotly.js";
import ModelSelector from "../ModelSelector";
import { useView } from "../../hooks/useView";
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
} from "../../constants/chart";
import {
  targetDisplayNameMap,
  targetYAxisLabelMap,
} from "../../utils/mapUtils";
import { getDataPath } from "../../utils/paths";
import useQuantileForecastTraces from "../../hooks/useQuantileForecastTraces";
import useForecastDateDrag from "../../hooks/useForecastDateDrag";
import {
  buildLog2Ticks,
  buildSqrtTicks,
  getScaleTitleSuffix,
  isPlotlyLogScale,
  normalizeChartScale,
  transformValueForScale,
} from "../../utils/scaleUtils";
import { copyRange, getRelayoutXRange } from "../../utils/plotRange";
import ChartCaption from "../ChartCaption";

const METRO_STATE_MAP = {
  Colorado: "CO",
  Georgia: "GA",
  Indiana: "IN",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Minnesota: "MN",
  "South Carolina": "SC",
  Texas: "TX",
  Utah: "UT",
  Virginia: "VA",
  "North Carolina": "NC",
  Oregon: "OR",
};

const MetroPlotCard = ({
  locationData,
  title,
  isSmall = false,
  colorScheme,
  selectedTarget,
  selectedModels,
  selectedDates,
  getDefaultRange,
  xAxisRange,
  setXAxisRange,
  chartScale,
  intervalVisibility,
  showLegend = true,
  showOtherGroundTruthSeasons = false,
}) => {
  const groundTruth = locationData?.ground_truth;
  const forecasts = locationData?.forecasts;

  const calculateYRange = useCallback(
    (plotData, xRange) => {
      if (!plotData?.length || !xRange || !selectedTarget) return null;
      let minY = Infinity,
        maxY = -Infinity;
      const [startX, endX] = xRange;
      const start = new Date(startX),
        end = new Date(endX);

      plotData.forEach((trace) => {
        if (!trace.x || !trace.y) return;
        for (let i = 0; i < trace.x.length; i++) {
          const d = new Date(trace.x[i]);
          if (d >= start && d <= end) {
            const v = Number(trace.y[i]);
            if (!isNaN(v)) {
              minY = Math.min(minY, v);
              maxY = Math.max(maxY, v);
            }
          }
        }
      });
      if (minY === Infinity) return null;
      const pad = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
      return [Math.max(0, minY - pad), maxY + pad];
    },
    [selectedTarget],
  );

  const showMedian = intervalVisibility?.median ?? true;
  const show50 = intervalVisibility?.ci50 ?? true;
  const show95 = intervalVisibility?.ci95 ?? true;
  const normalizedChartScale = normalizeChartScale(chartScale);

  const manualScaleTransform = useMemo(() => {
    if (normalizedChartScale !== "sqrt" && normalizedChartScale !== "log2") {
      return null;
    }
    return (value) => transformValueForScale(value, normalizedChartScale);
  }, [normalizedChartScale]);

  const {
    traces: projectionsData,
    rawYRange,
    hasForecastTraces,
  } = useQuantileForecastTraces({
    groundTruth,
    forecasts,
    selectedDates,
    selectedModels,
    target: selectedTarget,
    groundTruthLabel: "Ground Truth Data",
    groundTruthValueFormat: "%{y:.2f}",
    valueSuffix: "%",
    formatValue: (value) => value.toFixed(2),
    modelLineWidth: isSmall ? 1 : 2,
    modelMarkerSize: isSmall ? 3 : 6,
    groundTruthLineWidth: isSmall ? 1.5 : GROUND_TRUTH_LINE_WIDTH,
    groundTruthMarkerSize: isSmall ? 2 : GROUND_TRUTH_MARKER_SIZE,
    groundTruthColor: getChartInk(colorScheme).text,
    showLegendForFirstDate: showLegend && !isSmall,
    fillMissingQuantiles: true,
    showMedian,
    show50,
    show95,
    showOtherGroundTruthSeasons,
    viewType: "metrocast_forecasts",
    transformY: manualScaleTransform,
    groundTruthHoverFormatter: manualScaleTransform
      ? (value) => Number(value).toFixed(2)
      : null,
  });

  const defRange = useMemo(() => getDefaultRange(), [getDefaultRange]);

  // On the main chart: click to add a forecast date, drag a line to move it
  const { containerRef, displayDates, draggingDate } = useForecastDateDrag({
    selectedDates,
    enabled: !isSmall,
    onBeforeCommit: (gd) => {
      const range = gd?._fullLayout?.xaxis?.range;
      if (!xAxisRange && range) setXAxisRange([...range]);
    },
  });

  const yAxisRange = useMemo(() => {
    const range = xAxisRange || defRange;
    return calculateYRange(projectionsData, range);
  }, [projectionsData, xAxisRange, defRange, calculateYRange]);

  const sqrtTicks = useMemo(() => {
    if (normalizedChartScale !== "sqrt") return null;
    return buildSqrtTicks({
      rawRange: rawYRange,
      formatValue: (value) => `${value.toFixed(2)}%`,
    });
  }, [normalizedChartScale, rawYRange]);

  const log2Ticks = useMemo(() => {
    if (normalizedChartScale !== "log2") return null;
    return buildLog2Ticks({
      rawRange: rawYRange,
      formatValue: (value) => `${value.toFixed(2)}%`,
    });
  }, [normalizedChartScale, rawYRange]);

  const hasForecasts = hasForecastTraces;

  const PlotContent = (
    <>
      {title && (
        <Text fw={400} size={isSmall ? "xs" : "sm"} mb={5} ta="center">
          {title}
        </Text>
      )}

      {!hasForecasts && (
        <Box
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Center>
            <Text size="xs" c="dimmed" fs="italic">
              No forecast data for selection
            </Text>
          </Center>
        </Box>
      )}

      <Plot
        style={{
          width: "100%",
          height: isSmall ? "240px" : "400px",
          opacity: hasForecasts ? 1 : 0.6,
        }}
        data={projectionsData}
        layout={{
          autosize: true,
          template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
          ...PLOT_CHROME,
          font: {
            ...getChartFont(colorScheme),
            size: isSmall ? 11 : 13,
          },
          margin: { l: isSmall ? 45 : 60, r: 20, t: 10, b: isSmall ? 25 : 80 },
          showlegend: showLegend && !isSmall,
          legend: {
            ...getChartLegendStyle(colorScheme),
            x: 0.01,
            y: 0.99,
            xanchor: "left",
            yanchor: "top",
          },
          xaxis: {
            ...getChartAxisStyle(colorScheme),
            range: copyRange(xAxisRange || defRange),
            showticklabels: !isSmall,
            rangeslider: {
              ...RANGESLIDER_STYLE,
              visible: !isSmall,
              range: getDefaultRange(true),
            },
          },
          yaxis: {
            ...getChartAxisStyle(colorScheme),
            title: !isSmall
              ? {
                  text: (() => {
                    const longName = targetDisplayNameMap[selectedTarget];
                    const baseTitle =
                      targetYAxisLabelMap[longName] ||
                      longName ||
                      selectedTarget ||
                      "Value";
                    return `${baseTitle}${getScaleTitleSuffix(normalizedChartScale)}`;
                  })(),
                }
              : undefined,
            range: isPlotlyLogScale(normalizedChartScale)
              ? undefined
              : yAxisRange,
            autorange: isPlotlyLogScale(normalizedChartScale)
              ? true
              : yAxisRange === null,
            type: isPlotlyLogScale(normalizedChartScale) ? "log" : "linear",
            tickfont: {
              ...getChartAxisStyle(colorScheme).tickfont,
              size: isSmall ? 10 : 12,
            },
            tickformat:
              normalizedChartScale === "sqrt" || normalizedChartScale === "log2"
                ? undefined
                : ".2f",
            ticksuffix:
              normalizedChartScale === "sqrt" || normalizedChartScale === "log2"
                ? undefined
                : "%",
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
          hovermode: isSmall ? false : "closest",
          hoverlabel: {
            namelength: -1,
          },
          shapes: displayDates.map((d) => ({
            type: "line",
            x0: d,
            x1: d,
            y0: 0,
            y1: 1,
            yref: "paper",
            line:
              d === draggingDate
                ? {
                    ...getForecastDateLineStyle(colorScheme),
                    width: 2.5,
                    dash: "dash",
                  }
                : getForecastDateLineStyle(colorScheme),
          })),
          annotations: draggingDate
            ? [
                {
                  x: draggingDate,
                  y: 1,
                  yref: "paper",
                  yanchor: "bottom",
                  text: draggingDate,
                  showarrow: false,
                  font: { ...getChartFont(colorScheme), size: 12 },
                  bgcolor: colorScheme === "dark" ? "#25262b" : "#ffffff",
                  borderpad: 2,
                },
              ]
            : [],
        }}
        config={{
          // Plotly's toolbar is hidden: download lives in the chart header,
          // zoom in the minimap and range buttons
          displayModeBar: false,
          responsive: true,
          displaylogo: false,
          staticPlot: isSmall,
        }}
        onRelayout={(e) => {
          const newRange = getRelayoutXRange(e, projectionsData);
          if (
            newRange &&
            JSON.stringify(xAxisRange) !== JSON.stringify(newRange)
          ) {
            setXAxisRange(newRange);
          }
        }}
      />
    </>
  );

  return isSmall ? (
    <Paper
      withBorder
      p="xs"
      radius="md"
      shadow="xs"
      style={{
        position: "relative",
        cursor: "pointer",
        border: "1px solid #dee2e6",
      }}
    >
      {PlotContent}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          borderRadius: "8px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.parentElement.style.transform = "translateY(-4px)";
          e.currentTarget.parentElement.style.borderColor = "#2563eb";
          e.currentTarget.parentElement.style.boxShadow =
            "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.parentElement.style.transform = "translateY(0)";
          e.currentTarget.parentElement.style.borderColor = "#dee2e6";
          e.currentTarget.parentElement.style.boxShadow = "none";
        }}
      />
    </Paper>
  ) : (
    <Box ref={containerRef} style={{ position: "relative" }}>
      {PlotContent}
    </Box>
  );
};

const MetroCastView = ({
  data,
  metadata,
  selectedDates,
  selectedModels,
  models,
  setSelectedModels,
  windowSize,
  getDefaultRange,
  selectedTarget,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const {
    handleLocationSelect,
    chartScale,
    intervalVisibility,
    showLegend,
    showOtherGroundTruthSeasons,
  } = useView();
  const [childData, setChildData] = useState({});
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [xAxisRange, setXAxisRange] = useState(null);

  const stateName = data?.metadata?.location_name;
  const stateCode = METRO_STATE_MAP[stateName];
  const forecasts = data?.forecasts;

  const activeModels = useMemo(() => {
    const activeModelSet = new Set();
    if (!forecasts || !selectedTarget || !selectedDates.length)
      return activeModelSet;
    selectedDates.forEach((date) => {
      const targetData = forecasts[date]?.[selectedTarget];
      if (targetData)
        Object.keys(targetData).forEach((m) => activeModelSet.add(m));
    });
    return activeModelSet;
  }, [forecasts, selectedDates, selectedTarget]);

  useEffect(() => {
    setXAxisRange(null);
  }, [selectedTarget]);

  useEffect(() => {
    if (!stateCode || !metadata?.locations) {
      setChildData({});
      return;
    }

    const fetchChildren = async () => {
      setLoadingChildren(true);
      const results = {};
      const cityList = metadata.locations.filter((l) =>
        l.location_name.includes(`, ${stateCode}`),
      );

      await Promise.all(
        cityList.map(async (city) => {
          try {
            const res = await fetch(
              getDataPath(
                `flumetrocast/${city.abbreviation}_flu_metrocast.json`,
              ),
            );
            if (res.ok) {
              results[city.abbreviation] = await res.json();
            }
          } catch (e) {
            console.error(e);
          }
        }),
      );

      setChildData(results);
      setLoadingChildren(false);
    };

    fetchChildren();
  }, [stateCode, metadata, selectedTarget]);

  if (!selectedTarget)
    return (
      <Center h={300}>
        <Text>Please select a target.</Text>
      </Center>
    );

  return (
    <Stack gap="xl">
      <MetroPlotCard
        locationData={data}
        title={null}
        colorScheme={colorScheme}
        windowSize={windowSize}
        selectedTarget={selectedTarget}
        selectedModels={selectedModels}
        selectedDates={selectedDates}
        getDefaultRange={getDefaultRange}
        xAxisRange={xAxisRange}
        setXAxisRange={setXAxisRange}
        isSmall={false}
        chartScale={chartScale}
        intervalVisibility={intervalVisibility}
        showLegend={showLegend}
        showOtherGroundTruthSeasons={showOtherGroundTruthSeasons}
      />
      {stateCode && (
        <Stack gap="md">
          {loadingChildren ? (
            <Center p="xl">
              <Loader size="sm" />
            </Center>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} gap="md">
                {Object.entries(childData).map(([abbr, cityData]) => (
                  <UnstyledButton
                    key={abbr}
                    onClick={() => handleLocationSelect(abbr)}
                    style={{ width: "100%" }}
                  >
                    <MetroPlotCard
                      locationData={cityData}
                      title={cityData.metadata?.location_name}
                      isSmall={true}
                      colorScheme={colorScheme}
                      windowSize={windowSize}
                      selectedTarget={selectedTarget}
                      selectedModels={selectedModels}
                      selectedDates={selectedDates}
                      getDefaultRange={getDefaultRange}
                      xAxisRange={xAxisRange}
                      setXAxisRange={setXAxisRange}
                      chartScale={chartScale}
                      intervalVisibility={intervalVisibility}
                      showLegend={showLegend}
                      showOtherGroundTruthSeasons={showOtherGroundTruthSeasons}
                    />
                  </UnstyledButton>
                ))}
              </SimpleGrid>
            </>
          )}
        </Stack>
      )}
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

export default MetroCastView;
