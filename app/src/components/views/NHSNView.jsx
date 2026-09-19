import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Stack,
  Alert,
  Text,
  Center,
  useMantineColorScheme,
  Loader,
} from "@mantine/core";
import Plot from "react-plotly.js";
import { getDataPath } from "../../utils/paths";
import NHSNColumnSelector from "../NHSNColumnSelector";
import {
  SERIES_MARKER_SIZE,
  assignSeriesStyles,
} from "../../theme/pathogenColors";
import {
  getScaleYAxis,
  getYRangeFromTraces,
  normalizeChartScale,
  transformValueForScale,
} from "../../utils/scaleUtils";
import { useView } from "../../hooks/useView";
import { useChartReset } from "../../hooks/useChartReset";
import {
  nhsnTargetsToColumnsMap, // groupings
  nhsnNameToSlugMap, // { longform: shortform } map
  nhsnSlugToNameMap, // { shortform: longform } map
  nhsnNameToPrettyNameMap, // { longform: presentable name } map
} from "../../utils/mapUtils";
import {
  GROUND_TRUTH_LINE_WIDTH,
  PLOT_CONFIG,
  RANGESLIDER_STYLE,
  getBaseChartLayout,
  getPreliminaryLegendTitle,
  getRangeSelector,
} from "../../constants/chart";
import { copyRange, getRelayoutXRange } from "../../utils/plotRange";
import ChartCaption from "../ChartCaption";

const nhsnYAxisLabelMap = {
  "Hospital Admissions (count)": "Patient Count",
  "Hospital Admissions (rate)": "Rate per 100k",
  "Hospital Admissions (%)": "Percent (%)",
  "Bed Capacity (count)": "Bed Count",
  "Bed Capacity (%)": "Percent (%)",
};

// Helper function to get default columns for a given target
const getDefaultColumnsForTarget = (target) => {
  const defaultsMap = {
    "Hospital Admissions (count)": [
      "Total COVID-19 Admissions",
      "Total Influenza Admissions",
      "Total RSV Admissions",
    ],
    "Hospital Admissions (rate)": [
      "Total number of COVID-19 Admissions per 100,000 population",
      "Total number of Influenza Admissions per 100,000 population",
      "Total number of RSV Admissions per 100,000 population",
    ],
    "Hospital Admissions (%)": [
      "Percent Adult COVID-19 Admissions",
      "Percent Adult Influenza Admissions",
      "Percent Adult RSV Admissions",
    ],
    "Bed Capacity (count)": [
      "Number of Inpatient Beds",
      "Number of Inpatient Beds Occupied",
    ],
    "Bed Capacity (%)": ["Percent Inpatient Beds Occupied"],
  };
  return defaultsMap[target] || [];
};

const NHSNView = ({ location }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();
  const { chartScale, showLegend } = useView();
  const normalizedChartScale = normalizeChartScale(chartScale);

  const [allDataColumns, setAllDataColumns] = useState([]); // All columns from JSON
  const [filteredAvailableColumns, setFilteredAvailableColumns] = useState([]); // Columns for the selected target

  const [selectedColumns, setSelectedColumns] = useState([]);
  const hasInteractedRef = useRef(false);
  const [availableTargets, setAvailableTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null); // This is the string key, e.g., "Raw Patient Counts"

  const [searchParams, setSearchParams] = useSearchParams();

  const [dataRevision, setDataRevision] = useState(0);
  const [plotRevision, setPlotRevision] = useState(0);

  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null);

  const plotRef = useRef(null);
  useChartReset(() => setXAxisRange(null));

  const getProcessedYValues = useCallback(
    (columnName, rawValues) => {
      if (!rawValues) return [];
      return rawValues.map((val) => {
        if (val === null || val === undefined) return val;
        const transformed = val;
        return transformValueForScale(transformed, normalizedChartScale);
      });
    },
    [normalizedChartScale],
  );

  // Pathogen colour + marker shape, fixed per column across toggles
  const seriesStyles = useMemo(
    () => assignSeriesStyles(filteredAvailableColumns),
    [filteredAvailableColumns],
  );
  const seriesColors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(seriesStyles).map(([col, s]) => [col, s.color]),
      ),
    [seriesStyles],
  );
  const seriesSymbols = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(seriesStyles).map(([col, s]) => [col, s.symbol]),
      ),
    [seriesStyles],
  );

  const buildTracesForColumn = useCallback(
    (columnName) => {
      if (!data?.series?.dates) return [];

      const { color, symbol } = seriesStyles[columnName] ?? {};
      const tracesForColumn = [];

      tracesForColumn.push({
        x: data.series.dates,
        y: getProcessedYValues(columnName, data.series[columnName]),
        name: columnName,
        type: "scatter",
        mode: "lines+markers",
        line: {
          color,
          width: GROUND_TRUTH_LINE_WIDTH,
        },
        // Shape tells apart series of one pathogen along with the colour
        // step; a little larger than the default dot so shapes read
        marker: {
          symbol,
          size: SERIES_MARKER_SIZE,
          line: { width: 1, color: "#ffffff" },
        },
        legendgroup: columnName,
        hovertemplate: "%{x}<br>%{fullData.name}: %{y}<extra></extra>",
      });

      if (
        data.preliminary_series?.dates &&
        Array.isArray(data.preliminary_series[columnName])
      ) {
        tracesForColumn.push({
          x: data.preliminary_series.dates,
          y: getProcessedYValues(
            columnName,
            data.preliminary_series[columnName],
          ),
          name: `${columnName} (preliminary)`,
          type: "scatter",
          mode: "lines",
          line: {
            color,
            width: GROUND_TRUTH_LINE_WIDTH,
            dash: "dash",
          },
          legendgroup: columnName,
          showlegend: false,
          hovertemplate: "%{x}<br>%{fullData.name}: %{y}<extra></extra>",
        });
      }

      return tracesForColumn;
    },
    [data, seriesStyles, getProcessedYValues],
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!location) return;

      try {
        setLoading(true);
        setData(null);
        setAllDataColumns([]);
        setFilteredAvailableColumns([]);
        setSelectedColumns([]);
        setAvailableTargets([]);
        setSelectedTarget(null);
        setXAxisRange(null);
        setYAxisRange(null);
        setError(null);

        const dataUrl = getDataPath(`nhsn/${location}_nhsn.json`);
        const metadataUrl = getDataPath("nhsn/metadata.json");

        const [dataResponse, metadataResponse] = await Promise.all([
          fetch(dataUrl),
          fetch(metadataUrl),
        ]);

        if (!dataResponse.ok) {
          if (dataResponse.status === 404)
            throw new Error("No NHSN data available for this location");
          throw new Error("Failed to load NHSN data");
        }
        if (!metadataResponse.ok)
          throw new Error("Failed to load NHSN metadata");

        const jsonData = await dataResponse.json();
        const jsonMetadata = await metadataResponse.json();

        if (!jsonData.series || !jsonData.series.dates) {
          throw new Error("Invalid data format");
        }
        if (!jsonMetadata.last_updated) {
          throw new Error("Invalid metadata format");
        }

        setData(jsonData);

        const allColumnsFromData = Object.keys(jsonData.series)
          .filter((key) => key !== "dates")
          .sort();
        setAllDataColumns(allColumnsFromData);

        const targets = Object.keys(nhsnTargetsToColumnsMap);
        setAvailableTargets(targets);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location]);

  useEffect(() => {
    if (loading || availableTargets.length === 0) {
      return;
    }
    const urlTarget = searchParams.get("nhsn_target");
    const newTarget =
      urlTarget && availableTargets.includes(urlTarget)
        ? urlTarget
        : availableTargets[0];

    setSelectedTarget((currentTarget) => {
      if (currentTarget !== newTarget) {
        return newTarget;
      }
      return currentTarget;
    });
  }, [loading, availableTargets, searchParams]);

  useEffect(() => {
    if (loading || !selectedTarget || allDataColumns.length === 0) {
      setFilteredAvailableColumns([]);
      return;
    }
    const columnsForTarget = nhsnTargetsToColumnsMap[selectedTarget] || [];
    const filtered = allDataColumns.filter((col) =>
      columnsForTarget.includes(col),
    );
    setFilteredAvailableColumns(filtered);

    const urlSlugs = searchParams.getAll("nhsn_cols");
    const urlTarget = searchParams.get("nhsn_target");

    const isExplicitlyEmpty = urlSlugs.includes("none");

    const validUrlCols = urlSlugs
      .map((slug) => nhsnSlugToNameMap[slug])
      .filter((colName) => colName && filtered.includes(colName));

    let newSelectedCols;

    if (validUrlCols.length > 0) {
      newSelectedCols = validUrlCols;
    } else if (isExplicitlyEmpty) {
      newSelectedCols = [];
    } else if (
      !hasInteractedRef.current ||
      (urlTarget !== selectedTarget && urlSlugs.length === 0)
    ) {
      const defaultColumns = getDefaultColumnsForTarget(selectedTarget);
      const filteredDefaults = defaultColumns.filter((col) =>
        filtered.includes(col),
      );
      newSelectedCols =
        filteredDefaults.length > 0 ? filteredDefaults : [filtered[0]];
    } else {
      newSelectedCols = [];
    }

    setSelectedColumns((currentCols) => {
      const sortedNew = [...newSelectedCols].sort();
      const sortedCurrent = [...currentCols].sort();
      if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
        return newSelectedCols;
      }
      return currentCols;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedTarget, allDataColumns]);

  useEffect(() => {
    if (
      loading ||
      !selectedTarget ||
      availableTargets.length === 0 ||
      allDataColumns.length === 0
    ) {
      return;
    }

    const currentSearch = window.location.search;
    const newParams = new URLSearchParams(currentSearch);

    // Target Sync
    const defaultTarget = availableTargets[0];
    if (selectedTarget && selectedTarget !== defaultTarget) {
      newParams.set("nhsn_target", selectedTarget);
    } else {
      newParams.delete("nhsn_target");
    }

    // Column Sync
    newParams.delete("nhsn_cols");

    const defaultColumnsArray = getDefaultColumnsForTarget(selectedTarget);
    const filteredCols = allDataColumns.filter((col) =>
      (nhsnTargetsToColumnsMap[selectedTarget] || []).includes(col),
    );
    const filteredDefaults = defaultColumnsArray.filter((col) =>
      filteredCols.includes(col),
    );
    const defaultColumns =
      filteredDefaults.length > 0
        ? filteredDefaults
        : filteredCols.length > 0
          ? [filteredCols[0]]
          : [];

    const isDefault =
      JSON.stringify([...selectedColumns].sort()) ===
      JSON.stringify([...defaultColumns].sort());

    if (!isDefault) {
      if (selectedColumns.length > 0) {
        selectedColumns.forEach((name) => {
          const slug = nhsnNameToSlugMap[name];
          if (slug) newParams.append("nhsn_cols", slug);
        });
      } else if (hasInteractedRef.current) {
        newParams.set("nhsn_cols", "none");
      }
    }

    if (
      newParams.toString() !== new URLSearchParams(currentSearch).toString()
    ) {
      setSearchParams(newParams, { replace: true });
    }
  }, [
    selectedTarget,
    selectedColumns,
    allDataColumns,
    availableTargets,
    loading,
    setSearchParams,
  ]);

  const handleSetSelectedColumns = useCallback((newCols) => {
    hasInteractedRef.current = true;
    setSelectedColumns(newCols);
  }, []);

  useEffect(() => {
    if (data) setPlotRevision((p) => p + 1);
  }, [data, selectedTarget]);

  useEffect(() => {
    if (data) setDataRevision((d) => d + 1);
  }, [data, selectedColumns, selectedTarget]);

  const getFullXRange = useCallback(() => {
    if (!data) return [null, null];
    const firstDate = data.series.dates[0];
    const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
    const twoWeeksAfter = new Date(lastDate);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);
    return [firstDate, twoWeeksAfter.toISOString().split("T")[0]];
  }, [data]);

  const getDefaultXRange = useCallback(() => {
    if (!data) return [null, null];
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

  useEffect(() => {
    setXAxisRange(null);
  }, [selectedTarget]);

  const calculateYRange = useCallback((traces, xRange) => {
    if (!traces || traces.length === 0 || !xRange || !xRange[0]) return null;

    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    traces.forEach((trace) => {
      if (!trace.x || !trace.y) return;
      for (let i = 0; i < trace.x.length; i++) {
        const pointDate = new Date(trace.x[i]);
        if (pointDate >= startDate && pointDate <= endDate) {
          const value = Number(trace.y[i]);
          if (!isNaN(value)) {
            maxY = Math.max(maxY, value);
          }
        }
      }
    });

    if (maxY !== -Infinity) {
      const padding = maxY * 0.15;
      return [0, maxY + padding];
    }
    return null;
  }, []);

  useEffect(() => {
    if (!data || selectedColumns.length === 0) {
      setYAxisRange(null);
      return;
    }

    const currentTraces = selectedColumns.flatMap((column) =>
      buildTracesForColumn(column).map((trace) => ({
        x: trace.x,
        y: trace.y,
      })),
    );

    const currentXRange = xAxisRange || defaultRange;

    if (!currentXRange || currentXRange[0] === null) {
      setYAxisRange(null);
      return;
    }

    const newYRange = calculateYRange(currentTraces, currentXRange);
    setYAxisRange(newYRange);
  }, [
    data,
    selectedColumns,
    xAxisRange,
    selectedTarget,
    defaultRange,
    calculateYRange,
    buildTracesForColumn,
    getProcessedYValues,
  ]);

  // Filled after the traces are built below; read lazily on relayout
  const tracesRef = useRef([]);
  const handleRelayout = useCallback(
    (figure) => {
      const newXRange = getRelayoutXRange(figure, tracesRef.current);
      if (
        newXRange &&
        JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)
      ) {
        setXAxisRange(newXRange);
      }
    },
    [xAxisRange],
  );

  const rawTraces = useMemo(() => {
    if (!data) return [];
    return selectedColumns.flatMap(buildTracesForColumn);
  }, [data, selectedColumns, buildTracesForColumn]);

  const rawYRange = useMemo(() => getYRangeFromTraces(rawTraces), [rawTraces]);
  const hasPreliminary = rawTraces.some((t) => t.line?.dash === "dash");

  const traces = useMemo(() => {
    if (!data) return [];
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

    return rawTraces;
  }, [data, selectedColumns.length, rawTraces]);
  tracesRef.current = traces;

  const layout = useMemo(() => {
    const base = getBaseChartLayout(colorScheme);
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
          title: nhsnYAxisLabelMap[selectedTarget] || "Value",
        }),
      },
      showlegend: showLegend ?? selectedColumns.length < 15,
      legend: {
        ...base.legend,
        ...(hasPreliminary && {
          title: getPreliminaryLegendTitle(colorScheme),
        }),
      },
      margin: { t: 40, r: 10, l: 60, b: 40 },
      uirevision: plotRevision,
      annotations:
        selectedColumns.length === 0
          ? [
              {
                text: "No columns selected",
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
    colorScheme,
    fullRange,
    defaultRange,
    xAxisRange,
    yAxisRange,
    normalizedChartScale,
    rawYRange,
    showLegend,
    hasPreliminary,
    selectedTarget,
    selectedColumns.length,
    plotRevision,
  ]);

  if (loading)
    return (
      <Center p="md">
        <Stack align="center">
          <Loader />
          <Text>Loading NHSN data...</Text>
        </Stack>
      </Center>
    );
  if (error)
    return (
      <Center p="md">
        <Alert color="red">Error: {error}</Alert>
      </Center>
    );
  if (!data)
    return (
      <Center p="md">
        <Text>No NHSN data available for this location</Text>
      </Center>
    );

  return (
    <Stack gap="md" w="100%">
      <div
        style={{ width: "100%", height: "min(780px, 66vh)", minHeight: 360 }}
      >
        <Plot
          ref={plotRef}
          useResizeHandler
          data={traces}
          layout={layout}
          config={PLOT_CONFIG}
          style={{ width: "100%", height: "100%" }}
          revision={dataRevision}
          onRelayout={handleRelayout}
        />
      </div>
      <ChartCaption />

      <NHSNColumnSelector
        availableColumns={filteredAvailableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={handleSetSelectedColumns}
        seriesColors={seriesColors}
        seriesSymbols={seriesSymbols}
        nameMap={nhsnNameToPrettyNameMap}
        selectedTarget={selectedTarget}
        availableTargets={availableTargets}
        onTargetChange={(val) => {
          hasInteractedRef.current = false;
          setSelectedTarget(val);
        }}
        loading={loading}
      />
    </Stack>
  );
};

export default NHSNView;
