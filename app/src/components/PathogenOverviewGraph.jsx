import { useMemo } from 'react';
import { Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import Plot from 'react-plotly.js';
import { useForecastData } from '../hooks/useForecastData';
import { DATASETS } from '../config';
import { targetDisplayNameMap } from '../utils/mapUtils';

const DEFAULT_TARGETS = {
  covid_projs: 'wk inc covid hosp',
  flu_projs: 'wk inc flu hosp',
  rsv_projs: 'wk inc rsv hosp'
};

const VIEW_TO_DATASET = {
  covid_projs: 'covid',
  flu_projs: 'flu',
  rsv_projs: 'rsv'
};

const getRangeAroundDate = (dateStr, weeksBefore = 4, weeksAfter = 4) => {
  if (!dateStr) return undefined;
  const baseDate = new Date(dateStr);
  if (Number.isNaN(baseDate.getTime())) return undefined;

  const start = new Date(baseDate);
  start.setDate(start.getDate() - weeksBefore * 7);
  const end = new Date(baseDate);
  end.setDate(end.getDate() + weeksAfter * 7);

  return [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  ];
};

const buildMedianTrace = (forecast, model) => {
  if (!forecast || forecast.type !== 'quantile') return null;

  const predictionEntries = Object.values(forecast.predictions || {}).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const x = [];
  const y = [];

  predictionEntries.forEach((pred) => {
    const { quantiles = [], values = [] } = pred;
    const medianIndex = quantiles.indexOf(0.5);
    if (medianIndex !== -1) {
      x.push(pred.date);
      y.push(values[medianIndex]);
    }
  });

  if (x.length === 0) return null;

  return {
    x,
    y,
    name: `${model} median`,
    type: 'scatter',
    mode: 'lines+markers',
    line: { width: 2, color: '#228be6' },
    marker: { size: 4 }
  };
};

const PathogenOverviewGraph = ({ viewType, title }) => {
  const { data, loading, error, availableDates, availableTargets, models } = useForecastData('US', viewType);
  const datasetKey = VIEW_TO_DATASET[viewType];
  const datasetConfig = datasetKey ? DATASETS[datasetKey] : null;

  const selectedDate = availableDates[availableDates.length - 1];
  const preferredTarget = DEFAULT_TARGETS[viewType];
  const selectedTarget = preferredTarget && availableTargets.includes(preferredTarget)
    ? preferredTarget
    : availableTargets[0];

  const selectedModel = datasetConfig?.defaultModel && models.includes(datasetConfig.defaultModel)
    ? datasetConfig.defaultModel
    : models[0];

  const chartRange = useMemo(() => getRangeAroundDate(selectedDate), [selectedDate]);

  const traces = useMemo(() => {
    if (!data || !selectedTarget) return [];

    const groundTruth = data.ground_truth;
    const groundTruthValues = groundTruth?.[selectedTarget];
    const groundTruthTrace = groundTruthValues
      ? {
        x: groundTruth.dates || [],
        y: groundTruthValues,
        name: 'Observed',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#1f1f1f', width: 2, dash: 'dash' },
        marker: { size: 3 }
      }
      : null;

    const forecast = selectedDate && selectedTarget && selectedModel
      ? data.forecasts?.[selectedDate]?.[selectedTarget]?.[selectedModel]
      : null;

    const medianTrace = buildMedianTrace(forecast, selectedModel);

    return [groundTruthTrace, medianTrace].filter(Boolean);
  }, [data, selectedDate, selectedTarget, selectedModel]);

  const layout = useMemo(() => ({
    height: 260,
    margin: { l: 40, r: 20, t: 40, b: 40 },
    title: {
      text: targetDisplayNameMap[selectedTarget] || selectedTarget || 'Forecast',
      font: { size: 13 }
    },
    xaxis: {
      range: chartRange,
      showgrid: false,
      tickfont: { size: 10 }
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 10 }
    },
    legend: {
      orientation: 'h',
      y: -0.25,
      x: 0
    },
    hovermode: 'x unified'
  }), [chartRange, selectedTarget]);

  return (
    <Card withBorder radius="md" padding="lg" shadow="xs">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={5}>{title}</Title>
          {selectedDate && (
            <Text size="xs" c="dimmed">{selectedDate}</Text>
          )}
        </Group>
        {loading && (
          <Stack align="center" gap="xs" py="lg">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading data...</Text>
          </Stack>
        )}
        {!loading && error && (
          <Text size="sm" c="red">{error}</Text>
        )}
        {!loading && !error && traces.length > 0 && (
          <Plot
            style={{ width: '100%', height: '100%' }}
            data={traces}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
          />
        )}
        {!loading && !error && traces.length === 0 && (
          <Text size="sm" c="dimmed">No data available.</Text>
        )}
      </Stack>
    </Card>
  );
};

export default PathogenOverviewGraph;
