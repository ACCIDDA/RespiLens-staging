import { useMemo, useCallback } from 'react';
import ForecastPlotView from '../ForecastPlotView';
import FluPeak from '../FluPeak';
import LastFetched from '../LastFetched';
import { Text, Box } from '@mantine/core';
import { MODEL_COLORS } from '../../config/datasets';
import { RATE_CHANGE_CATEGORIES } from '../../constants/chart';
import { useView } from '../../hooks/useView';
import { getDatasetTitleFromView } from '../../utils/datasetUtils';

const FluView = ({
  data,
  metadata,
  selectedDates,
  selectedModels,
  models,
  setSelectedModels,
  viewType,
  windowSize,
  getDefaultRange,
  selectedTarget,
  peaks,
  availablePeakDates,
  availablePeakModels,
  peakLocation
}) => {
  const { chartScale, intervalVisibility, showLegend } = useView();
  const forecasts = data?.forecasts;

  const lastSelectedDate = useMemo(() => {
    if (selectedDates.length === 0) return null;
    return selectedDates.slice().sort().pop();
  }, [selectedDates]);

  const rateChangeData = useMemo(() => {
    if (!forecasts || selectedDates.length === 0) return [];
    const categoryOrder = RATE_CHANGE_CATEGORIES;
    return selectedModels.map(model => {
      const forecast = forecasts[lastSelectedDate]?.['wk flu hosp rate change']?.[model];
      if (!forecast) return null;
      const horizon0 = forecast.predictions['0'];
      if (!horizon0) return null;
      const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
      const orderedData = categoryOrder.map(cat => ({
        category: cat.replace('_', '<br>'),
        value: (horizon0.probabilities[horizon0.categories.indexOf(cat)] || 0) * 100
      }));
      return {
        name: `${model} (${lastSelectedDate})`,
        y: orderedData.map(d => d.category),
        x: orderedData.map(d => d.value),
        type: 'bar',
        orientation: 'h',
        marker: { color: modelColor },
        showlegend: true,
        legendgroup: 'histogram',
        xaxis: 'x2',
        yaxis: 'y2',
        hovertemplate: '<b>%{fullData.name}</b><br>%{y}: %{x:.1f}%<extra></extra>'
      };
    }).filter(Boolean);
  }, [forecasts, selectedDates, selectedModels, lastSelectedDate]);

  const extraTraces = useMemo(() => {
    if (viewType !== 'fludetailed') return [];
    return rateChangeData.map(trace => ({
      ...trace,
      orientation: 'h',
      xaxis: 'x2',
      yaxis: 'y2'
    }));
  }, [rateChangeData, viewType]);

  const activeModels = useMemo(() => {
    const activeModelSet = new Set();
    if (viewType === 'flu_peak' || !forecasts || !selectedDates.length) {
      return activeModelSet;
    }

    const targetForProjections = (viewType === 'flu' || viewType === 'flu_forecasts')
      ? selectedTarget
      : 'wk inc flu hosp';

    if ((viewType === 'flu' || viewType === 'flu_forecasts') && !targetForProjections) return activeModelSet;

    selectedDates.forEach(date => {
      const forecastsForDate = forecasts[date];
      if (!forecastsForDate) return;

      if (targetForProjections) {
        const targetData = forecastsForDate[targetForProjections];
        if (targetData) {
          Object.keys(targetData).forEach(model => activeModelSet.add(model));
        }
      }

      if (viewType === 'fludetailed') {
        const rateChangeSet = forecastsForDate['wk flu hosp rate change'];
        if (rateChangeSet) {
          Object.keys(rateChangeSet).forEach(model => activeModelSet.add(model));
        }
      }
    });

    return activeModelSet;
  }, [forecasts, selectedDates, selectedTarget, viewType]);

  const forecastTarget = (viewType === 'flu' || viewType === 'flu_forecasts')
    ? selectedTarget
    : 'wk inc flu hosp';

  const displayTarget = selectedTarget || forecastTarget;
  const requireTarget = viewType === 'flu';

  const layoutOverrides = useCallback((baseLayout) => {
    const baseXAxis = {
      ...baseLayout.xaxis,
      showline: false,
      linewidth: undefined,
      linecolor: undefined,
      domain: viewType === 'fludetailed' ? [0, 0.8] : baseLayout.xaxis.domain
    };

    const nextLayout = {
      ...baseLayout,
      hoverlabel: { namelength: -1 },
      xaxis: baseXAxis
    };

    if (viewType !== 'fludetailed') {
      return nextLayout;
    }

    return {
      ...nextLayout,
      grid: {
        columns: 1,
        rows: 1,
        pattern: 'independent',
        subplots: [['xy'], ['x2y2']],
        xgap: 0.15
      },
      xaxis2: {
        title: {
          text: `displaying date ${lastSelectedDate || 'N/A'}`,
          font: {
            family: 'Arial, sans-serif',
            size: 13,
            color: '#1f77b4'
          },
          standoff: 10
        },
        domain: [0.85, 1],
        showgrid: false
      },
      yaxis2: {
        title: '',
        showticklabels: true,
        type: 'category',
        side: 'right',
        automargin: true,
        tickfont: { align: 'right' }
      }
    };
  }, [viewType, lastSelectedDate]);

  const configOverrides = useCallback((baseConfig) => ({
    ...baseConfig,
    modeBarPosition: 'left',
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'resetScale2d']
  }), []);

  if (viewType === 'flu_peak') {
    const stateName = data?.metadata?.location_name;
    const hubName = getDatasetTitleFromView(viewType) || data?.metadata?.dataset;
    return (
      <>
        <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Text size="lg" c="black" style={{ fontWeight: 400, textAlign: 'center' }}>
            {hubName ? `${stateName} — ${hubName}` : stateName}
          </Text>
          <Box style={{ position: 'absolute', right: 0 }}>
            <LastFetched timestamp={metadata?.last_updated} />
          </Box>
        </Box>
        <FluPeak
          data={data}
          peaks={peaks}
          peakDates={availablePeakDates}
          peakModels={availablePeakModels}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          selectedDates={selectedDates}
          windowSize={windowSize}
          peakLocation={peakLocation}
          chartScale={chartScale}
          intervalVisibility={intervalVisibility}
          showLegend={showLegend}
        />
      </>
    );
  }

  return (
    <ForecastPlotView
      data={data}
      metadata={metadata}
      selectedDates={selectedDates}
      selectedModels={selectedModels}
      models={models}
      setSelectedModels={setSelectedModels}
      windowSize={windowSize}
      getDefaultRange={getDefaultRange}
      selectedTarget={selectedTarget}
      forecastTarget={forecastTarget}
      displayTarget={displayTarget}
      requireTarget={requireTarget}
      activeModels={activeModels}
      extraTraces={extraTraces}
      layoutOverrides={layoutOverrides}
      configOverrides={configOverrides}
      groundTruthValueFormat="%{y}"
    />
  );
};

export default FluView;
