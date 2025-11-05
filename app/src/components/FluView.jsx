import { useState, useEffect, useMemo, useRef } from 'react';
import { useMantineColorScheme, Stack } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import ModelSelector from './ModelSelector';
import LastUpdated from './LastUpdated';
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS, RATE_CHANGE_CATEGORIES } from '../constants/chart';

const FluView = ({ data, metadata, selectedDates, selectedModels, models, setSelectedModels, viewType, windowSize, getDefaultRange }) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null); // Track user's zoom/rangeslider selection
  const plotRef = useRef(null);
  const isResettingRef = useRef(false); // Flag to prevent capturing programmatic resets
  const { colorScheme } = useMantineColorScheme();
  const groundTruth = data?.ground_truth;
  const forecasts = data?.forecasts;

  const calculateYRange = (data, xRange) => {
    if (!data || !xRange || !Array.isArray(data) || data.length === 0) return null;
    let minY = Infinity;
    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    data.forEach(trace => {
      if (!trace.x || !trace.y) return;
      for (let i = 0; i < trace.x.length; i++) {
        const pointDate = new Date(trace.x[i]);
        if (pointDate >= startDate && pointDate <= endDate) {
          const value = Number(trace.y[i]);
          if (!isNaN(value)) {
            minY = Math.min(minY, value);
            maxY = Math.max(maxY, value);
          }
        }
      }
    });

    if (minY !== Infinity && maxY !== -Infinity) {
      const padding = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
      return [0, maxY + padding];
    }
    return null;
  };

  const projectionsData = useMemo(() => {
    if (!groundTruth || !forecasts || selectedDates.length === 0) {
      return [];
    }
    const groundTruthValues = groundTruth.values || groundTruth['wk inc flu hosp'];
    if (!groundTruthValues) {
      return [];
    }
    const groundTruthTrace = {
      x: groundTruth.dates || [],
      y: groundTruthValues,
      name: 'Observed',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#8884d8', width: 2 },
      marker: { size: 6 }
    };
    const modelTraces = selectedModels.flatMap(model => 
      selectedDates.flatMap((date) => {
        const forecastsForDate = forecasts[date] || {};
        const forecast = 
          forecastsForDate['wk inc flu hosp']?.[model] || 
          forecastsForDate['wk flu hosp rate change']?.[model];
        if (!forecast) return [];
        const forecastDates = [], medianValues = [], ci95Upper = [], ci95Lower = [], ci50Upper = [], ci50Lower = [];
        const sortedPredictions = Object.entries(forecast.predictions || {}).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
        sortedPredictions.forEach(([, pred]) => {
          forecastDates.push(pred.date);
          if (forecast.type !== 'quantile') return;
          const { quantiles = [], values = [] } = pred;
          ci95Lower.push(values[quantiles.indexOf(0.025)] || 0);
          ci50Lower.push(values[quantiles.indexOf(0.25)] || 0);
          medianValues.push(values[quantiles.indexOf(0.5)] || 0);
          ci50Upper.push(values[quantiles.indexOf(0.75)] || 0);
          ci95Upper.push(values[quantiles.indexOf(0.975)] || 0);
        });
        const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
        return [
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci95Upper, ...ci95Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} (${date}) 95% CI` },
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci50Upper, ...ci50Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} (${date}) 50% CI` },
          { x: forecastDates, y: medianValues, name: `${model} (${date})`, type: 'scatter', mode: 'lines+markers', line: { color: modelColor, width: 2, dash: 'solid' }, marker: { size: 6, color: modelColor }, showlegend: true }
        ];
      })
    );
    return [groundTruthTrace, ...modelTraces];
  }, [groundTruth, forecasts, selectedDates, selectedModels]);

  const rateChangeData = useMemo(() => {
    if (!forecasts || selectedDates.length === 0) return [];
    const categoryOrder = RATE_CHANGE_CATEGORIES;
    const lastSelectedDate = selectedDates.slice().sort().pop();
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
      return { name: `${model} (${lastSelectedDate})`, y: orderedData.map(d => d.category), x: orderedData.map(d => d.value), type: 'bar', orientation: 'h', marker: { color: modelColor }, showlegend: true, legendgroup: 'histogram', xaxis: 'x2', yaxis: 'y2' };
    }).filter(Boolean);
  }, [forecasts, selectedDates, selectedModels]);

  const defaultRange = useMemo(() => getDefaultRange(), [getDefaultRange]);

  // Reset xaxis range only when viewType changes (null = auto-follow date changes)
  useEffect(() => {
    setXAxisRange(null); // Reset to auto-update mode on view change
  }, [viewType]);

  // Recalculate y-axis when data or x-range changes
  useEffect(() => {
    const currentXRange = xAxisRange || defaultRange;
    if (projectionsData.length > 0 && currentXRange) {
      const initialYRange = calculateYRange(projectionsData, currentXRange);
      if (initialYRange) {
        setYAxisRange(initialYRange);
      }
    } else {
      setYAxisRange(null);
    }
  }, [projectionsData, xAxisRange, defaultRange]);

  const handlePlotUpdate = (figure) => {
    // Don't capture range changes during programmatic resets
    if (isResettingRef.current) {
      isResettingRef.current = false; // Reset flag after ignoring the event
      return;
    }

    // Capture xaxis range changes (from rangeslider or zoom) to preserve user's selection
    if (figure && figure['xaxis.range']) {
      const newXRange = figure['xaxis.range'];
      // Only update if different to avoid loops
      if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) {
        setXAxisRange(newXRange);
        // Y-axis will be recalculated by useEffect when xAxisRange changes
      }
    }
  };

  const layout = {
    width: Math.min(CHART_CONSTANTS.MAX_WIDTH, windowSize.width * CHART_CONSTANTS.WIDTH_RATIO),
    height: Math.min(CHART_CONSTANTS.MAX_HEIGHT, windowSize.height * CHART_CONSTANTS.HEIGHT_RATIO),
    autosize: true,
    template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    font: {
      color: colorScheme === 'dark' ? '#c1c2c5' : '#000000'
    },
    grid: viewType === 'fludetailed' ? {
      columns: 1,
      rows: 1,
      pattern: 'independent',
      subplots: [['xy'], ['x2y2']],
      xgap: 0.15
    } : undefined,
    showlegend: false,
    hovermode: 'x unified',
    margin: { l: 60, r: 30, t: 30, b: 30 },
    xaxis: {
      domain: viewType === 'fludetailed' ? [0, 0.8] : [0, 1],
      rangeslider: {
        range: getDefaultRange(true) // Rangeslider always shows full extent
      },
      rangeselector: {
        buttons: [
          {count: 1, label: '1m', step: 'month', stepmode: 'backward'},
          {count: 6, label: '6m', step: 'month', stepmode: 'backward'},
          {step: 'all', label: 'all'}
        ]
      },
      range: xAxisRange || defaultRange // Use user's selection or default
    },
    yaxis: {
      title: 'Hospitalizations',
      range: yAxisRange
    },
    shapes: selectedDates.map(date => ({
      type: 'line',
      x0: date,
      x1: date,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: {
        color: 'red',
        width: 1,
        dash: 'dash'
      }
    })),
    ...(viewType === 'fludetailed' ? {
      xaxis2: {
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
    } : {})
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarPosition: 'left',
    showSendToCloud: false,
    plotlyServerURL: "",
    toImageButtonOptions: {
      format: 'png',
      filename: 'forecast_plot'
    },
    modeBarButtonsToAdd: [{
      name: 'Reset view',
      click: function(gd) {
        const range = getDefaultRange(); // Smart default: selected dates ± context weeks
        if (range) {
          const newYRange = calculateYRange(projectionsData, range);
          // Set flag to prevent onRelayout from capturing this programmatic change
          isResettingRef.current = true;
          setXAxisRange(null); // Reset to auto-update mode BEFORE relayout
          setYAxisRange(newYRange);
          // Only update xaxis.range, NOT rangeslider.range (keeps full extent visible in slider)
          Plotly.relayout(gd, {
            'xaxis.range': range,  // Smart default view
            'yaxis.range': newYRange
          });
        }
      }
    }]
  };

  return (
    <Stack>
      <LastUpdated timestamp={metadata?.last_updated} />
      <div style={{ width: '100%', height: Math.min(800, windowSize.height * 0.6) }}>
        <Plot
          ref={plotRef}
          style={{ width: '100%', height: '100%' }}
          data={[
            ...projectionsData,
            ...(viewType === 'fludetailed' 
              ? rateChangeData.map(trace => ({
                  ...trace,
                  orientation: 'h',
                  xaxis: 'x2',
                  yaxis: 'y2'
                }))
              : [])
          ]}
          layout={layout}
          config={config}
          onRelayout={(figure) => handlePlotUpdate(figure)}
        />
      </div>
      <ModelSelector 
        models={models}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        getModelColor={(model, selectedModels) => {
          const index = selectedModels.indexOf(model);
          return MODEL_COLORS[index % MODEL_COLORS.length];
        }}
      />
    </Stack>
  );
};

export default FluView;
