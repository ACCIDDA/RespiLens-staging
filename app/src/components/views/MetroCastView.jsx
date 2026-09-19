import { useState, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { usePersistentXRange } from "../../hooks/usePersistentXRange";
import {
  useMantineColorScheme,
  Stack,
  Text,
  Center,
  Box,
  UnstyledButton,
} from "@mantine/core";
import Plot from "react-plotly.js";
import ModelSelector from "../ModelSelector";
import { useView } from "../../hooks/useView";
import { useChartReset } from "../../hooks/useChartReset";
import {
  CHART_CONSTANTS,
  GROUND_TRUTH_LINE_WIDTH,
  GROUND_TRUTH_MARKER_SIZE,
  PLOT_CONFIG,
  RANGESLIDER_STYLE,
  COMPACT_GROUND_TRUTH_LINE_WIDTH,
  getBaseChartLayout,
  getChartInk,
  getForecastDateMarks,
  getRangeSelector,
} from "../../constants/chart";
import {
  targetDisplayNameMap,
  targetYAxisLabelMap,
} from "../../utils/mapUtils";
import { fetchJson, getDataPath } from "../../utils/paths";
import { useAsyncData } from "../../hooks/useAsyncData";
import useQuantileForecastTraces from "../../hooks/useQuantileForecastTraces";
import useForecastDateDrag from "../../hooks/useForecastDateDrag";
import {
  getScaleYAxis,
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

// Same height as the other forecast charts
const MAIN_PLOT_HEIGHT = "min(880px, 60vh)";
const TILE_PLOT_HEIGHT = 150;

// State view: the state's chart (and its model list) takes the left two
// thirds; the city tiles fill the column beside it, two per row, then wrap
// into full rows below. The main block spans as many tile rows as its
// height needs, measured as it resizes.
const MetroStateLayout = ({ main, tiles }) => {
  const mainRef = useRef(null);
  const tilesRef = useRef(null);
  const [rows, setRows] = useState(1);

  useLayoutEffect(() => {
    const mainEl = mainRef.current;
    const layoutEl = tilesRef.current;
    if (!mainEl || !layoutEl) return undefined;
    const measure = () => {
      const tile = layoutEl.querySelector(".respilens-metro-tile-cell");
      if (!tile) return;
      const gap = parseFloat(getComputedStyle(layoutEl).rowGap) || 0;
      const tileHeight = tile.getBoundingClientRect().height;
      const mainHeight = mainEl.getBoundingClientRect().height;
      setRows(Math.max(1, Math.round((mainHeight + gap) / (tileHeight + gap))));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(mainEl);
    measure();
    return () => observer.disconnect();
  }, [tiles.length]);

  return (
    <div
      ref={tilesRef}
      className="respilens-metro-layout"
      style={{ "--metro-main-rows": rows }}
    >
      <div ref={mainRef} className="respilens-metro-main">
        {main}
      </div>
      {tiles}
    </div>
  );
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
    modelLineWidth: isSmall ? 1.5 : 2,
    modelMarkerSize: isSmall ? 3 : 6,
    groundTruthLineWidth: isSmall
      ? COMPACT_GROUND_TRUTH_LINE_WIDTH
      : GROUND_TRUTH_LINE_WIDTH,
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

  const hasForecasts = hasForecastTraces;
  const base = getBaseChartLayout(colorScheme, { compact: isSmall });
  const isTransformedScale =
    normalizedChartScale === "sqrt" || normalizedChartScale === "log2";
  const longName = targetDisplayNameMap[selectedTarget];

  const PlotContent = (
    <>
      {title && (
        <Text
          fw={600}
          size="sm"
          mb={4}
          ta="left"
          className="respilens-metro-tile-title"
        >
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
          height: isSmall ? TILE_PLOT_HEIGHT : MAIN_PLOT_HEIGHT,
          minHeight: isSmall ? undefined : 340,
          opacity: hasForecasts ? 1 : 0.6,
        }}
        data={projectionsData}
        layout={{
          ...base,
          // Full size: same frame as the other forecast charts
          margin: isSmall
            ? { l: 45, r: 12, t: 10, b: 30 }
            : { l: 64, r: 30, t: 36, b: 30 },
          showlegend: showLegend && !isSmall,
          dragmode: false,
          xaxis: {
            ...base.xaxis,
            range: copyRange(xAxisRange || defRange),
            ...(isSmall && { nticks: 4 }),
            ...(!isSmall && { rangeselector: getRangeSelector(colorScheme) }),
            rangeslider: {
              ...RANGESLIDER_STYLE,
              visible: !isSmall,
              range: getDefaultRange(true),
            },
          },
          yaxis: {
            ...base.yaxis,
            ...getScaleYAxis({
              scale: normalizedChartScale,
              rawRange: rawYRange,
              range: yAxisRange,
              title: isSmall
                ? undefined
                : targetYAxisLabelMap[longName] ||
                  longName ||
                  selectedTarget ||
                  "Value",
              formatValue: (value) => `${value.toFixed(2)}%`,
            }),
            tickformat: isTransformedScale ? undefined : ".2f",
            ticksuffix: isTransformedScale ? undefined : "%",
          },
          hovermode: isSmall ? false : "closest",
          hoverlabel: {
            namelength: -1,
          },
          ...getForecastDateMarks(colorScheme, displayDates, draggingDate, 0),
        }}
        config={{ ...PLOT_CONFIG, staticPlot: isSmall }}
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

  // Small city charts are tiles like the front page's: no card, a hairline
  // along the top, the title turning blue on hover (the whole tile opens the
  // city).
  return isSmall ? (
    <Box className="respilens-tile respilens-metro-tile">{PlotContent}</Box>
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
  // Kept across locations (the view remounts while one loads); each target
  // has its own window
  const [xAxisRange, setXAxisRange] = usePersistentXRange(
    `metrocast:${selectedTarget}`,
  );
  useChartReset(() => setXAxisRange(null));

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

  const { data: childData, loading: loadingChildren } = useAsyncData(
    stateCode && metadata?.locations
      ? async () => {
          const cityList = metadata.locations.filter((l) =>
            l.location_name.includes(`, ${stateCode}`),
          );
          const entries = await Promise.all(
            cityList.map((city) =>
              fetchJson(
                getDataPath(
                  `flumetrocast/${city.abbreviation}_flu_metrocast.json`,
                ),
              ).then(
                (json) => [city.abbreviation, json],
                (e) => {
                  console.error(e);
                  return null;
                },
              ),
            ),
          );
          return Object.fromEntries(entries.filter(Boolean));
        }
      : null,
    [stateCode, metadata],
  );

  if (!selectedTarget)
    return (
      <Center h={300}>
        <Text>Please select a target.</Text>
      </Center>
    );

  const main = (
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
      <Stack gap={2}>
        <ChartCaption forecastNote />
        <ModelSelector
          models={models}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          activeModels={activeModels}
          selectedDates={selectedDates}
          keyboardShortcut
        />
      </Stack>
    </Stack>
  );

  // A city: just its chart, like the other forecast pages
  if (!stateCode) return main;

  const tiles = loadingChildren
    ? []
    : Object.entries(childData ?? {}).map(([abbr, cityData]) => (
        <UnstyledButton
          key={abbr}
          className="respilens-metro-tile-cell"
          onClick={() => handleLocationSelect(abbr)}
          style={{ width: "100%", display: "block", minWidth: 0 }}
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
      ));

  return <MetroStateLayout main={main} tiles={tiles} />;
};

export default MetroCastView;
