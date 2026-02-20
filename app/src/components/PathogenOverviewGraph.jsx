import { useMemo, useCallback } from "react";
import { Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useForecastData } from "../hooks/useForecastData";
import { DATASETS } from "../config";
import { useView } from "../hooks/useView";
import OverviewGraphCard from "./OverviewGraphCard";
import useOverviewPlot from "../hooks/useOverviewPlot";

const DEFAULT_TARGETS = {
  covid_forecasts: "wk inc covid hosp",
  flu_forecasts: "wk inc flu hosp",
  rsv_forecasts: "wk inc rsv hosp",
};

const VIEW_TO_DATASET = {
  covid_forecasts: "covid",
  flu_forecasts: "flu",
  rsv_forecasts: "rsv",
};

const getRangeAroundDate = (dateStr, weeksBefore = 4, weeksAfter = 4) => {
  if (!dateStr) return undefined;
  const baseDate = new Date(dateStr);
  if (Number.isNaN(baseDate.getTime())) return undefined;

  const start = new Date(baseDate);
  start.setDate(start.getDate() - weeksBefore * 7);
  const end = new Date(baseDate);
  end.setDate(end.getDate() + weeksAfter * 7);

  return [start.toISOString().split("T")[0], end.toISOString().split("T")[0]];
};

const buildIntervalTraces = (forecast, model) => {
  if (!forecast || forecast.type !== "quantile") return null;

  const predictionEntries = Object.values(forecast.predictions || {}).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  const x = [];
  const median = [];
  const lower95 = [];
  const upper95 = [];
  const lower50 = [];
  const upper50 = [];

  predictionEntries.forEach((pred) => {
    const { quantiles = [], values = [] } = pred;
    const medianIndex = quantiles.indexOf(0.5);
    const lower95Index = quantiles.indexOf(0.025);
    const upper95Index = quantiles.indexOf(0.975);
    const lower50Index = quantiles.indexOf(0.25);
    const upper50Index = quantiles.indexOf(0.75);

    if (
      medianIndex !== -1 &&
      lower95Index !== -1 &&
      upper95Index !== -1 &&
      lower50Index !== -1 &&
      upper50Index !== -1
    ) {
      x.push(pred.date);
      median.push(values[medianIndex]);
      lower95.push(values[lower95Index]);
      upper95.push(values[upper95Index]);
      lower50.push(values[lower50Index]);
      upper50.push(values[upper50Index]);
    }
  });

  if (x.length === 0) return null;

  return [
    {
      x,
      y: upper95,
      name: `${model} 95% interval`,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    },
    {
      x,
      y: lower95,
      name: `${model} 95% interval`,
      type: "scatter",
      mode: "lines",
      fill: "tonexty",
      fillcolor: "rgba(34, 139, 230, 0.15)",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    },
    {
      x,
      y: upper50,
      name: `${model} 50% interval`,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    },
    {
      x,
      y: lower50,
      name: `${model} 50% interval`,
      type: "scatter",
      mode: "lines",
      fill: "tonexty",
      fillcolor: "rgba(34, 139, 230, 0.25)",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    },
    {
      x,
      y: median,
      name: `${model} median`,
      type: "scatter",
      mode: "lines+markers",
      line: { width: 2, color: "#228be6" },
      marker: { size: 4 },
    },
  ];
};

const PathogenOverviewGraph = ({ viewType, title, location }) => {
  const { viewType: activeViewType, setViewType } = useView();
  const resolvedLocation = location || "US";
  const { data, loading, error, availableDates, availableTargets, models } =
    useForecastData(resolvedLocation, viewType);
  const datasetKey = VIEW_TO_DATASET[viewType];
  const datasetConfig = datasetKey ? DATASETS[datasetKey] : null;

  const selectedDate = availableDates[availableDates.length - 1];
  const preferredTarget = DEFAULT_TARGETS[viewType];
  const selectedTarget =
    preferredTarget && availableTargets.includes(preferredTarget)
      ? preferredTarget
      : availableTargets[0];

  const selectedModel =
    datasetConfig?.defaultModel && models.includes(datasetConfig.defaultModel)
      ? datasetConfig.defaultModel
      : models[0];

  const chartRange = useMemo(
    () => getRangeAroundDate(selectedDate),
    [selectedDate],
  );
  const isActive =
    datasetConfig?.views?.some((view) => view.value === activeViewType) ??
    false;

  const buildTraces = useCallback(
    (forecastData) => {
      if (!forecastData || !selectedTarget) return [];
      const groundTruth = forecastData.ground_truth;
      const groundTruthValues = groundTruth?.[selectedTarget];
      const groundTruthTrace = groundTruthValues
        ? {
            x: groundTruth.dates || [],
            y: groundTruthValues,
            name: "Observed",
            type: "scatter",
            mode: "lines+markers",
            line: { color: "#1f1f1f", width: 2, dash: "dash" },
            marker: { size: 3 },
          }
        : null;

      const forecast =
        selectedDate && selectedTarget && selectedModel
          ? forecastData.forecasts?.[selectedDate]?.[selectedTarget]?.[
              selectedModel
            ]
          : null;

      const intervalTraces = buildIntervalTraces(forecast, selectedModel);

      return [groundTruthTrace, ...(intervalTraces || [])].filter(Boolean);
    },
    [selectedDate, selectedTarget, selectedModel],
  );

  const { traces, layout } = useOverviewPlot({
    data,
    buildTraces,
    xRange: chartRange,
    yPaddingTopRatio: 0.1,
    yPaddingBottomRatio: 0.1,
    yMinFloor: 0,
  });

  const locationLabel =
    resolvedLocation === "US" ? "US national view" : resolvedLocation;

  return (
    <OverviewGraphCard
      title={title}
      meta={
        selectedDate ? (
          <Text size="xs" c="dimmed">
            {selectedDate}
          </Text>
        ) : null
      }
      loading={loading}
      loadingLabel="Loading data..."
      error={error}
      traces={traces}
      layout={layout}
      emptyLabel="No data available."
      actionLabel={isActive ? "Viewing" : "View forecasts"}
      actionActive={isActive}
      onAction={() => setViewType(datasetConfig?.defaultView || viewType)}
      actionIcon={<IconChevronRight size={14} />}
      locationLabel={locationLabel}
    />
  );
};

export default PathogenOverviewGraph;
