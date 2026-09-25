import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePersistentXRange } from "../../hooks/usePersistentXRange";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import Plot from "react-plotly.js";
import SeriesToggleChips from "../controls/SeriesToggleChips";
import NSSPGeoMap from "../NSSPGeoMap";
import { assignSeriesColors } from "../../theme/pathogenColors";
import { useView } from "../../hooks/useView";
import { useChartReset } from "../../hooks/useChartReset";
import {
  getScaleYAxis,
  getYRangeFromTraces,
  normalizeChartScale,
  transformValueForScale,
} from "../../utils/scaleUtils";
import {
  NSSP_MAP_COLORS as MAP_COLORS,
  NSSP_MAP_HEIGHTS,
  getNsspUsFeatureCallout,
} from "../../utils/nsspMap";
import {
  NSSP_STATE_ABBREVIATION_TO_INFO,
  fetchNsspCountiesGeoJson,
  fetchNsspCountyAssignments,
  fetchNsspStateCoverage,
  fetchNsspStatesGeoJson,
  getCountySelectionForFeature,
  getNsspStateAbbreviationFromLocation,
  isNsspStatewideLocation,
  isNsspUnitedStatesLocation,
  normalizeCountyBasename,
} from "../../utils/nsspGeo";
import {
  GROUND_TRUTH_LINE_WIDTH,
  GROUND_TRUTH_MARKER_SIZE,
  PLOT_CONFIG,
  RANGESLIDER_STYLE,
  getBaseChartLayout,
  getRangeSelector,
} from "../../constants/chart";
import { copyRange, getRelayoutXRange } from "../../utils/plotRange";
import ChartCaption from "../ChartCaption";
import {
  NSSP_COLUMN_LABELS,
  NSSP_DEFAULT_COLUMNS,
} from "../../config/datasets";

const NSSPView = ({ location, data }) => {
  const {
    handleLocationSelect,
    nsspCounty,
    locationMessage,
    chartScale,
    showLegend,
  } = useView();
  const normalizedChartScale = normalizeChartScale(chartScale);
  const { colorScheme } = useMantineColorScheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [usMapData, setUsMapData] = useState(null);
  const [stateMapData, setStateMapData] = useState(null);
  const [countyAssignmentData, setCountyAssignmentData] = useState(null);
  const [stateCoverage, setStateCoverage] = useState({});
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [dataRevision, setDataRevision] = useState(0);
  const [plotRevision, setPlotRevision] = useState(0);
  // Kept across locations
  const [xAxisRange, setXAxisRange] = usePersistentXRange("nsspall");
  const [yAxisRange, setYAxisRange] = useState(null);

  useChartReset(() => setXAxisRange(null));

  const stateAbbreviation = getNsspStateAbbreviationFromLocation(location);
  const stateInfo = NSSP_STATE_ABBREVIATION_TO_INFO[stateAbbreviation];
  const isUnitedStates = isNsspUnitedStatesLocation(location);
  const isStatewide = isNsspStatewideLocation(location);
  const currentStateCoverage = stateCoverage[stateAbbreviation] || {
    hasAnyData: false,
    hasCountyData: false,
  };
  const availableColumns = useMemo(
    () =>
      Object.keys(data?.series || {}).filter((key) => key !== "dates" && key),
    [data],
  );
  const seriesColors = useMemo(
    () => assignSeriesColors(availableColumns),
    [availableColumns],
  );

  const getProcessedYValues = useCallback(
    (rawValues) => {
      if (!rawValues) return [];

      return rawValues.map((value) => {
        if (value === null || value === undefined) {
          return value;
        }

        return transformValueForScale(value, normalizedChartScale);
      });
    },
    [normalizedChartScale],
  );

  const getFullXRange = useCallback(() => {
    if (!data?.series?.dates?.length) return [null, null];

    const firstDate = data.series.dates[0];
    const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
    const twoWeeksAfter = new Date(lastDate);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);

    return [firstDate, twoWeeksAfter.toISOString().split("T")[0]];
  }, [data]);

  const getDefaultXRange = useCallback(() => {
    if (!data?.series?.dates?.length) return [null, null];

    const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
    const twoWeeksAfter = new Date(lastDate);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);

    const sixMonthsAgo = new Date(lastDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return [
      sixMonthsAgo.toISOString().split("T")[0],
      twoWeeksAfter.toISOString().split("T")[0],
    ];
  }, [data]);

  const defaultRange = useMemo(() => getDefaultXRange(), [getDefaultXRange]);
  const fullRange = useMemo(() => getFullXRange(), [getFullXRange]);

  const calculateYRange = useCallback((traces, range) => {
    if (!traces?.length || !range?.[0]) {
      return null;
    }

    let maxY = -Infinity;
    const [startX, endX] = range;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    traces.forEach((trace) => {
      if (!trace.x || !trace.y) return;

      for (let index = 0; index < trace.x.length; index += 1) {
        const pointDate = new Date(trace.x[index]);
        if (pointDate < startDate || pointDate > endDate) {
          continue;
        }

        const value = Number(trace.y[index]);
        if (!Number.isNaN(value)) {
          maxY = Math.max(maxY, value);
        }
      }
    });

    if (maxY === -Infinity) {
      return null;
    }

    const padding = maxY < 1 ? 0.1 : maxY * 0.15;
    return [0, maxY + padding];
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadCoverage = async () => {
      try {
        const coverage = await fetchNsspStateCoverage();
        if (isActive) {
          setStateCoverage(coverage);
        }
      } catch (error) {
        if (isActive) {
          setMapError(error.message);
        }
      }
    };

    loadCoverage();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadUnitedStatesMap = async () => {
      if (!isUnitedStates) {
        return;
      }

      try {
        setMapLoading(true);
        setMapError(null);
        setUsMapData(null);
        const statesGeoJson = await fetchNsspStatesGeoJson();
        if (isActive) {
          setUsMapData(statesGeoJson);
        }
      } catch (error) {
        if (isActive) {
          setMapError(error.message);
        }
      } finally {
        if (isActive) {
          setMapLoading(false);
        }
      }
    };

    loadUnitedStatesMap();
    return () => {
      isActive = false;
    };
  }, [isUnitedStates]);

  useEffect(() => {
    let isActive = true;

    const loadStateMap = async () => {
      if (
        isUnitedStates ||
        !stateAbbreviation ||
        stateAbbreviation === "US" ||
        !currentStateCoverage.hasCountyData
      ) {
        setStateMapData(null);
        setCountyAssignmentData(null);
        return;
      }

      try {
        setMapLoading(true);
        setMapError(null);
        setStateMapData(null);
        setCountyAssignmentData(null);
        const [countiesGeoJson, assignments] = await Promise.all([
          fetchNsspCountiesGeoJson(stateAbbreviation),
          fetchNsspCountyAssignments(stateAbbreviation),
        ]);

        if (isActive) {
          setStateMapData(countiesGeoJson);
          setCountyAssignmentData(assignments);
        }
      } catch (error) {
        if (isActive) {
          setMapError(error.message);
        }
      } finally {
        if (isActive) {
          setMapLoading(false);
        }
      }
    };

    loadStateMap();
    return () => {
      isActive = false;
    };
  }, [currentStateCoverage.hasCountyData, isUnitedStates, stateAbbreviation]);

  // The URL is the one source of the pathogen selection: read here, written
  // only when the user toggles a chip (two-way syncing through state made
  // the two overwrite each other after a location change). Pathogens this
  // location lacks stay in the URL for the next one.
  const selectedColumns = useMemo(() => {
    if (!availableColumns.length) return [];
    const urlColumns = searchParams.getAll("nssp_cols");
    if (urlColumns.includes("none")) return [];
    const validUrlColumns = urlColumns.filter((column) =>
      availableColumns.includes(column),
    );
    if (validUrlColumns.length > 0) return validUrlColumns;
    return NSSP_DEFAULT_COLUMNS.filter((column) =>
      availableColumns.includes(column),
    );
  }, [availableColumns, searchParams]);

  useEffect(() => {
    if (data) {
      setPlotRevision((current) => current + 1);
    }
  }, [data]);

  useEffect(() => {
    if (data) {
      setDataRevision((current) => current + 1);
    }
  }, [data, selectedColumns]);

  useEffect(() => {
    if (!data || selectedColumns.length === 0) {
      setYAxisRange(null);
      return;
    }

    const currentTraces = selectedColumns.map((column) => ({
      x: data.series.dates,
      y: getProcessedYValues(data.series[column]),
    }));
    const activeRange = xAxisRange || defaultRange;

    if (!activeRange?.[0]) {
      setYAxisRange(null);
      return;
    }

    setYAxisRange(calculateYRange(currentTraces, activeRange));
  }, [
    calculateYRange,
    data,
    defaultRange,
    getProcessedYValues,
    selectedColumns,
    xAxisRange,
  ]);

  // Filled after the traces are built below; read lazily on relayout
  const plotTracesRef = useRef([]);
  const handleRelayout = useCallback(
    (figure) => {
      const nextXRange = getRelayoutXRange(figure, plotTracesRef.current);
      if (
        nextXRange &&
        JSON.stringify(nextXRange) !== JSON.stringify(xAxisRange)
      ) {
        setXAxisRange(nextXRange);
      }
    },
    [xAxisRange, setXAxisRange],
  );

  const hasReachedCountyDetail =
    !isUnitedStates && !isStatewide && currentStateCoverage.hasCountyData;
  const isStatewideOnlyDetail =
    !isUnitedStates &&
    isStatewide &&
    currentStateCoverage.hasAnyData &&
    !currentStateCoverage.hasCountyData;
  const shouldShowPlot = hasReachedCountyDetail || isStatewideOnlyDetail;

  const handleUnitedStatesStateClick = (feature) => {
    const nextStateAbbreviation = feature?.properties?.STUSAB;
    if (
      !nextStateAbbreviation ||
      !stateCoverage[nextStateAbbreviation]?.hasAnyData
    ) {
      return;
    }
    handleLocationSelect(`${nextStateAbbreviation}_All`);
  };

  const handleCountyClick = (feature) => {
    if (!countyAssignmentData) {
      return;
    }

    const selection = getCountySelectionForFeature(
      feature,
      countyAssignmentData,
    );
    if (!selection.hasData || !selection.locationId) {
      return;
    }
    handleLocationSelect(selection.locationId, selection.countyName);
  };

  const getCountyFill = (feature) => {
    if (!countyAssignmentData) {
      return MAP_COLORS.base;
    }

    const selection = getCountySelectionForFeature(
      feature,
      countyAssignmentData,
    );
    if (!selection.hasData) {
      return MAP_COLORS.unavailable;
    }

    const isSelectedByLocation = selection.locationId === location;
    const isExplicitCountySelection =
      nsspCounty &&
      normalizeCountyBasename(selection.countyName) ===
        normalizeCountyBasename(nsspCounty);

    if (isExplicitCountySelection) {
      return MAP_COLORS.selected;
    }

    if (isSelectedByLocation) {
      return MAP_COLORS.active;
    }

    return selection.isStatewideFallback
      ? MAP_COLORS.fallback
      : MAP_COLORS.base;
  };

  const getStateFill = (feature) => {
    const featureStateAbbreviation = feature.properties?.STUSAB;
    const coverage = stateCoverage[featureStateAbbreviation];

    if (!coverage?.hasAnyData) {
      return MAP_COLORS.unavailable;
    }

    return featureStateAbbreviation === stateAbbreviation
      ? MAP_COLORS.selected
      : MAP_COLORS.base;
  };

  const isStateClickable = (feature) =>
    Boolean(stateCoverage[feature.properties?.STUSAB]?.hasAnyData);

  const isCountyClickable = (feature) =>
    Boolean(
      getCountySelectionForFeature(feature, countyAssignmentData).hasData,
    );

  const rawTraces = useMemo(
    () =>
      selectedColumns.map((column) => ({
        x: data?.series?.dates || [],
        y: getProcessedYValues(data?.series?.[column]),
      })),
    [data, getProcessedYValues, selectedColumns],
  );

  const rawYRange = useMemo(() => getYRangeFromTraces(rawTraces), [rawTraces]);
  const plotTraces = useMemo(() => {
    if (!data?.series?.dates?.length) {
      return [];
    }

    if (selectedColumns.length === 0) {
      return [
        {
          x: [data.series.dates[0]],
          y: [null],
          type: "scatter",
          mode: "lines",
          showlegend: false,
        },
      ];
    }

    return selectedColumns.map((column) => {
      return {
        x: data.series.dates,
        y: getProcessedYValues(data.series[column]),
        name: NSSP_COLUMN_LABELS[column] || column,
        type: "scatter",
        mode: "lines+markers",
        line: {
          color: seriesColors[column],
          width: GROUND_TRUTH_LINE_WIDTH,
        },
        marker: { size: GROUND_TRUTH_MARKER_SIZE },
        hovertemplate:
          "%{x}<br>%{fullData.name}: %{customdata:.2f}%<extra></extra>",
        customdata: data.series[column],
      };
    });
  }, [data, getProcessedYValues, selectedColumns, seriesColors]);
  plotTracesRef.current = plotTraces;

  const plotLayout = useMemo(() => {
    const base = getBaseChartLayout(colorScheme);
    const isTransformedScale =
      normalizedChartScale === "sqrt" || normalizedChartScale === "log2";
    return {
      ...base,
      xaxis: {
        ...base.xaxis,
        rangeslider: { ...RANGESLIDER_STYLE, visible: true, range: fullRange },
        rangeselector: getRangeSelector(colorScheme, { includeYear: true }),
        range: copyRange(xAxisRange || defaultRange),
      },
      yaxis: {
        ...base.yaxis,
        ...getScaleYAxis({
          scale: normalizedChartScale,
          rawRange: rawYRange,
          range: yAxisRange,
          autorange: selectedColumns.length === 0,
          title: "Percent of visits",
          formatValue: (value) =>
            `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`,
        }),
        tickformat: isTransformedScale ? undefined : ".2f",
        ticksuffix: isTransformedScale ? undefined : "%",
      },
      showlegend: showLegend ?? true,
      margin: { t: 56, r: 10, l: 72, b: 40 },
      uirevision: plotRevision,
      annotations:
        selectedColumns.length === 0
          ? [
              {
                text: "No series selected",
                xref: "paper",
                yref: "paper",
                showarrow: false,
                font: {
                  size: 20,
                  color: colorScheme === "dark" ? "#5c5f66" : "#adb5bd",
                },
              },
            ]
          : [],
    };
  }, [
    normalizedChartScale,
    colorScheme,
    defaultRange,
    fullRange,
    plotRevision,
    rawYRange,
    selectedColumns.length,
    showLegend,
    xAxisRange,
    yAxisRange,
  ]);

  const handleSetSelectedColumns = useCallback(
    (nextColumns) => {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("nssp_cols");
      const defaultColumns = NSSP_DEFAULT_COLUMNS.filter((column) =>
        availableColumns.includes(column),
      );
      const isDefaultSelection =
        JSON.stringify([...nextColumns].sort()) ===
        JSON.stringify([...defaultColumns].sort());
      if (!isDefaultSelection) {
        if (nextColumns.length === 0) {
          nextParams.set("nssp_cols", "none");
        } else {
          nextColumns.forEach((column) =>
            nextParams.append("nssp_cols", column),
          );
        }
      }
      setSearchParams(nextParams, { replace: true });
    },
    [availableColumns, setSearchParams],
  );

  if (!data?.series?.dates) {
    return (
      <Alert
        icon={<IconAlertTriangle size={16} />}
        color="yellow"
        variant="light"
      >
        NSSP data loaded, but the expected time series structure was not found.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {locationMessage ? (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          variant="light"
        >
          {locationMessage}
        </Alert>
      ) : null}

      {shouldShowPlot ? (
        <Stack gap="md" w="100%">
          {/* The header names the county; its data covers the whole HSA */}
          {hasReachedCountyDetail && data?.metadata?.location_name ? (
            <Text size="sm" c="dimmed">
              Data for the health service area covering{" "}
              {data.metadata.location_name}.
            </Text>
          ) : null}
          <div
            style={{
              width: "100%",
              height: "min(780px, 66vh)",
              minHeight: 360,
            }}
          >
            <Plot
              useResizeHandler
              data={plotTraces}
              layout={plotLayout}
              config={PLOT_CONFIG}
              style={{ width: "100%", height: "100%" }}
              revision={dataRevision}
              onRelayout={handleRelayout}
            />
          </div>
          <ChartCaption />

          <Stack gap="sm">
            <Text size="sm" fw={700}>
              Select a pathogen(s)
            </Text>
            <Group gap="xs">
              <SeriesToggleChips
                columns={availableColumns}
                selectedColumns={selectedColumns}
                setSelectedColumns={handleSetSelectedColumns}
                colors={seriesColors}
                labels={NSSP_COLUMN_LABELS}
              />
            </Group>
          </Stack>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {isUnitedStates
              ? "Pick a state on the map (or above) to see its data."
              : "Pick a county on the map (or above) to see its data."}
          </Text>

          {mapLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : mapError ? (
            <Alert
              color="red"
              variant="light"
              icon={<IconAlertTriangle size={16} />}
            >
              {mapError}
            </Alert>
          ) : isUnitedStates ? (
            <NSSPGeoMap
              featureCollection={usMapData}
              height={NSSP_MAP_HEIGHTS.usa}
              projectionKind="usa"
              onFeatureClick={handleUnitedStatesStateClick}
              isFeatureClickable={isStateClickable}
              getFeatureKey={(feature) => feature.properties?.GEOID}
              getFeatureLabel={(feature) => feature.properties?.NAME}
              getFeatureFill={getStateFill}
              getFeatureCallout={getNsspUsFeatureCallout}
            />
          ) : currentStateCoverage.hasCountyData ? (
            <NSSPGeoMap
              featureCollection={stateMapData}
              height={NSSP_MAP_HEIGHTS.state}
              projectionKind="state"
              onFeatureClick={handleCountyClick}
              isFeatureClickable={isCountyClickable}
              getFeatureKey={(feature) => feature.properties?.GEOID}
              getFeatureLabel={(feature) => feature.properties?.NAME}
              getFeatureFill={getCountyFill}
            />
          ) : (
            <Alert color="red" variant="light">
              County-level NSSP data is not available for {stateInfo?.name}.
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default NSSPView;
