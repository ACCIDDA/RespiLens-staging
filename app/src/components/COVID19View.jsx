import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useMantineColorScheme, Stack, Text } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import ModelSelector from './ModelSelector';
import LastUpdated from './LastUpdated';
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS } from '../constants/chart';
import { targetDisplayNameMap } from '../utils/mapUtils';

const COVID19View = ({ data, metadata, selectedDates, selectedModels, models, setSelectedModels, windowSize, getDefaultRange, selectedTarget }) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null); // Track user's zoom/rangeslider selection
  const plotRef = useRef(null);
  const { colorScheme } = useMantineColorScheme();
  const groundTruth = data?.ground_truth;
  const forecasts = data?.forecasts;

  const calculateYRange = useCallback((data, xRange) => {
    if (!data || !xRange || !Array.isArray(data) || data.length === 0 || !selectedTarget) return null; // Added check for selectedTarget
    let minY = Infinity;
    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    data.forEach(trace => {
      // Skip if trace doesn't have data, or if it's the ground truth trace for a different target
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
      const rangeMin = Math.max(0, minY - padding);
      return [rangeMin, maxY + padding];
    }
    return null;
  }, [selectedTarget]);

  const projectionsData = useMemo(() => {
    if (!groundTruth || !forecasts || selectedDates.length === 0 || !selectedTarget) {
      return [];
    }
    const groundTruthValues = groundTruth[selectedTarget];
    if (!groundTruthValues) {
      console.warn(`Ground truth data not found for target: ${selectedTarget}`);
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
        // Access forecast using selectedTarget
        const forecast = forecastsForDate[selectedTarget]?.[model];
        if (!forecast || forecast.type !== 'quantile') return []; // Ensure it's quantile data

        const forecastDates = [], medianValues = [], ci95Upper = [], ci95Lower = [], ci50Upper = [], ci50Lower = [];
        // Sort predictions by date, accessing the nested prediction object
        const sortedPredictions = Object.values(forecast.predictions || {}).sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedPredictions.forEach((pred) => {
          forecastDates.push(pred.date);
          const { quantiles = [], values = [] } = pred;

          // Find values for specific quantiles, defaulting to null or 0 if not found
          const findValue = (q) => {
            const index = quantiles.indexOf(q);
            return index !== -1 ? values[index] : null; // Use null if quantile is missing
          };

          const val_025 = findValue(0.025);
          const val_25 = findValue(0.25);
          const val_50 = findValue(0.5);
          const val_75 = findValue(0.75);
          const val_975 = findValue(0.975);

          // Only add points if median and CIs are available
          if (val_50 !== null && val_025 !== null && val_975 !== null && val_25 !== null && val_75 !== null) {
              ci95Lower.push(val_025);
              ci50Lower.push(val_25);
              medianValues.push(val_50);
              ci50Upper.push(val_75);
              ci95Upper.push(val_975);
          } else {
             // If essential quantiles are missing, we might skip this point or handle it differently
             // For now, let's just skip adding to the arrays to avoid breaking the CI shapes
             console.warn(`Missing quantiles for model ${model}, date ${date}, target ${selectedTarget}, prediction date ${pred.date}`);
          }
        });

        // Ensure we have data points before creating traces
        if (forecastDates.length === 0) return [];

        const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
        return [
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci95Upper, ...ci95Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} (${date}) 95% CI`, hoverinfo: 'none' },
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci50Upper, ...ci50Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} (${date}) 50% CI`, hoverinfo: 'none' },
          { x: forecastDates, y: medianValues, name: `${model} (${date})`, type: 'scatter', mode: 'lines+markers', line: { color: modelColor, width: 2, dash: 'solid' }, marker: { size: 6, color: modelColor }, showlegend: true }
        ];
      })
    );
    return [groundTruthTrace, ...modelTraces];
  }, [groundTruth, forecasts, selectedDates, selectedModels, selectedTarget]);

  const defaultRange = getDefaultRange();

  // Reset xaxis range only when target changes (null = auto-follow date changes)
  useEffect(() => {
    setXAxisRange(null); // Reset to auto-update mode on target change
  }, [selectedTarget]);

  // Recalculate y-axis when data or x-range changes
  useEffect(() => {
    const currentXRange = xAxisRange || defaultRange;
    if (projectionsData.length > 0 && currentXRange) {
      const initialYRange = calculateYRange(projectionsData, currentXRange);
      setYAxisRange(initialYRange);
    } else {
      setYAxisRange(null);
    }
  }, [projectionsData, xAxisRange, defaultRange, calculateYRange]);

  const handlePlotUpdate = useCallback((figure) => {
    // Capture xaxis range changes (from rangeslider or zoom) to preserve user's selection
    if (figure && figure['xaxis.range']) {
      const newXRange = figure['xaxis.range'];
      // Only update if different to avoid loops
      if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) {
        setXAxisRange(newXRange);
        // Y-axis will be recalculated by useEffect when xAxisRange changes
      }
    }
  }, [xAxisRange]);

  const layout = useMemo(() => ({ // Memoize layout to update only when dependencies change
    width: Math.min(CHART_CONSTANTS.MAX_WIDTH, windowSize.width * CHART_CONSTANTS.WIDTH_RATIO),
    height: Math.min(CHART_CONSTANTS.MAX_HEIGHT, windowSize.height * CHART_CONSTANTS.HEIGHT_RATIO),
    autosize: true,
    template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    font: {
      color: colorScheme === 'dark' ? '#c1c2c5' : '#000000'
    },
    showlegend: false, // Legend is handled by ModelSelector now
    hovermode: 'x unified',
    margin: { l: 60, r: 30, t: 30, b: 30 },
    xaxis: {
      domain: [0, 1], // Full width
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
      range: xAxisRange || defaultRange, // Use user's selection or default
      showline: true,
      linewidth: 1,
      linecolor: colorScheme === 'dark' ? '#aaa' : '#444'
    },
    yaxis: {
      // Use the map for a user-friendly title
      title: targetDisplayNameMap[selectedTarget] || selectedTarget || 'Value', // Fallback to raw target name or 'Value'
      range: yAxisRange, // Use state for dynamic range updates
      autorange: yAxisRange === null, // Enable autorange if yAxisRange is null
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
  }), [colorScheme, windowSize, defaultRange, selectedTarget, selectedDates, yAxisRange, xAxisRange, getDefaultRange]); 

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    showSendToCloud: false,
    plotlyServerURL: "",
    toImageButtonOptions: {
      format: 'png',
      filename: 'forecast_plot'
    },
    modeBarButtonsToAdd: [{
      name: 'Reset view',
      icon: Plotly.Icons.home,
      click: function(gd) {
        const range = getDefaultRange();
        if (range && projectionsData.length > 0) {
          const newYRange = calculateYRange(projectionsData, range);
          const update = {
            'xaxis.range': range,
            'xaxis.rangeslider.range': getDefaultRange(true),
            'yaxis.range': newYRange,
            'yaxis.autorange': newYRange === null,
          };
          Plotly.relayout(gd, update);
          setXAxisRange(null); // Reset to auto-update mode
          setYAxisRange(newYRange); // Update state
        } else if (range) {
            Plotly.relayout(gd, {
            'xaxis.range': range,
            'xaxis.rangeslider.range': getDefaultRange(true),
            'yaxis.autorange': true,
          });
            setXAxisRange(null); // Reset to auto-update mode
            setYAxisRange(null); // Reset state
        }
      }
    }]
  }), [getDefaultRange, projectionsData, calculateYRange]);

  if (!selectedTarget) {
    return (
        <Stack align="center" justify="center" style={{ height: '300px' }}>
            <Text>Please select a target to view data.</Text>
        </Stack>
    );
  }

  return (
    <Stack>
      <LastUpdated timestamp={metadata?.last_updated} />
      <div style={{ width: '100%', height: Math.min(800, windowSize.height * 0.6) }}>
        <Plot
          ref={plotRef}
          style={{ width: '100%', height: '100%' }}
          data={projectionsData}
          layout={layout}
          config={config}
          onRelayout={handlePlotUpdate} // Keep state update logic here
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

export default COVID19View;