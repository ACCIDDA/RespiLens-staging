import { useMemo } from 'react';
import { Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import { useForecastData } from '../hooks/useForecastData';
import { DATASETS } from '../config';
import { useView } from '../hooks/useView';

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

const buildIntervalTraces = (forecast, model) => {
  if (!forecast || forecast.type !== 'quantile') return null;

  const predictionEntries = Object.values(forecast.predictions || {}).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
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

    if (medianIndex !== -1 && lower95Index !== -1 && upper95Index !== -1 && lower50Index !== -1 && upper50Index !== -1) {
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
      type: 'scatter',
      mode: 'lines',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip'
    },
    {
      x,
      y: lower95,
      name: `${model} 95% interval`,
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(34, 139, 230, 0.15)',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip'
    },
    {
      x,
      y: upper50,
      name: `${model} 50% interval`,
      type: 'scatter',
      mode: 'lines',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip'
    },
    {
      x,
      y: lower50,
      name: `${model} 50% interval`,
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(34, 139, 230, 0.25)',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip'
    },
    {
      x,
      y: median,
      name: `${model} median`,
      type: 'scatter',
      mode: 'lines+markers',
      line: { width: 2, color: '#228be6' },
      marker: { size: 4 }
    }
  ];
};

const PathogenOverviewGraph = ({ viewType, title, location }) => {
  const { viewType: activeViewType, setViewType } = useView();
  const resolvedLocation = location || 'US';
  const { data, loading, error, availableDates, availableTargets, models } = useForecastData(resolvedLocation, viewType);
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
  const isActive = datasetConfig?.views?.some((view) => view.value === activeViewType) ?? false;

  const { traces, yRange } = useMemo(() => {
    if (!data || !selectedTarget) {
      return { traces: [], yRange: undefined };
    }

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

    const intervalTraces = buildIntervalTraces(forecast, selectedModel);

    const combinedTraces = [
      groundTruthTrace,
      ...(intervalTraces || [])
    ].filter(Boolean);

    if (!chartRange) {
      return { traces: combinedTraces, yRange: undefined };
    }

    const [rangeStart, rangeEnd] = chartRange;
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    let minY = Infinity;
    let maxY = -Infinity;

    combinedTraces.forEach((trace) => {
      if (!trace?.x || !trace?.y) return;
      trace.x.forEach((xValue, index) => {
        const pointDate = new Date(xValue);
        if (pointDate < startDate || pointDate > endDate) return;
        const value = Number(trace.y[index]);
        if (Number.isNaN(value)) return;
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      });
    });

    if (minY === Infinity || maxY === -Infinity) {
      return { traces: combinedTraces, yRange: undefined };
    }

    const padding = (maxY - minY) * 0.1;
    const paddedMin = Math.max(0, minY - padding);
    const paddedMax = maxY + padding;

    return {
      traces: combinedTraces,
      yRange: [paddedMin, paddedMax]
    };
  }, [data, selectedDate, selectedTarget, selectedModel, chartRange]);

  const layout = useMemo(() => ({
    height: 280,
    margin: { l: 40, r: 20, t: 40, b: 40 },
    title: {
      text: '',
      font: { size: 13 }
    },
    xaxis: {
      range: chartRange,
      showgrid: false,
      tickfont: { size: 10 }
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 10 },
      range: yRange
    },
    showlegend: false,
    hovermode: 'x unified'
  }), [chartRange, yRange]);

  const locationLabel = resolvedLocation === 'US' ? 'US national view' : resolvedLocation;

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
        <Group justify="space-between" align="center">
          <Button
            size="xs"
            variant={isActive ? 'light' : 'filled'}
            onClick={() => setViewType(datasetConfig?.defaultView || viewType)}
            rightSection={<IconChevronRight size={14} />}
          >
            {isActive ? 'Viewing' : 'View forecasts'}
          </Button>
          <Text size="xs" c="dimmed">{locationLabel}</Text>
        </Group>
      </Stack>
    </Card>
  );
};

export default PathogenOverviewGraph;
