import { useState, useEffect, useMemo, useRef } from 'react';
import { useMantineColorScheme, Stack, Text } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import ModelSelector from './ModelSelector';
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS } from '../constants/chart';

const RSVDefaultView = ({ data, metadata, selectedDates, selectedModels, models, setSelectedModels, windowSize, getDefaultRange }) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const plotRef = useRef(null);
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

  const timeSeriesData = useMemo(() => {
    if (!groundTruth || !forecasts || selectedDates.length === 0) {
      return [];
    }
    const groundTruthValues = groundTruth.values || groundTruth['wk inc rsv hosp'];
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
        const forecast = forecastsForDate['wk inc rsv hosp']?.[model]; // Simplified to only look for time series data
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

  const defaultRange = getDefaultRange();

  useEffect(() => {
    if (timeSeriesData.length > 0 && defaultRange) {
      const initialYRange = calculateYRange(timeSeriesData, defaultRange);
      if (initialYRange) {
        setYAxisRange(initialYRange);
      }
    }
  }, [timeSeriesData, defaultRange]);

  const handlePlotUpdate = (figure) => {
    if (figure && figure['xaxis.range'] && timeSeriesData.length > 0) {
      const newYRange = calculateYRange(timeSeriesData, figure['xaxis.range']);
      if (newYRange && plotRef.current) {
        setYAxisRange(newYRange);
        Plotly.relayout(plotRef.current.el, {'yaxis.range': newYRange});
      }
    }
  };

  // Simplified layout for a single, full-width time series chart
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
    showlegend: false,
    hovermode: 'x unified',
    margin: { l: 60, r: 30, t: 30, b: 30 },
    xaxis: {
      domain: [0, 1], // Full width
      rangeslider: {
        range: getDefaultRange(true)
      },
      rangeselector: {
        buttons: [
          {count: 1, label: '1m', step: 'month', stepmode: 'backward'},
          {count: 6, label: '6m', step: 'month', stepmode: 'backward'},
          {step: 'all', label: 'all'}
        ]
      },
      range: defaultRange
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
    }))
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
        const range = getDefaultRange();
        if (range) {
          const newYRange = calculateYRange(timeSeriesData, range);
          Plotly.relayout(gd, {
            'xaxis.range': range,
            'xaxis.rangeslider.range': getDefaultRange(true),
            'yaxis.range': newYRange
          });
          setYAxisRange(newYRange);
        }
      }
    }]
  };

  const lastUpdatedTimestamp = metadata?.last_updated;
  let formattedDate = null;
  if (lastUpdatedTimestamp) {
    const date = new Date(lastUpdatedTimestamp); 
    formattedDate = date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  return (
    <Stack>
      {formattedDate && (
        <Text size="xs" c="dimmed" ta="right">
          last updated: {formattedDate}
        </Text>
      )}
      <div style={{ width: '100%', height: Math.min(800, windowSize.height * 0.6) }}>
        <Plot
          ref={plotRef}
          style={{ width: '100%', height: '100%' }}
          data={timeSeriesData} 
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

export default RSVDefaultView;
