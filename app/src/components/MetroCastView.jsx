import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useMantineColorScheme, Stack, Text, Center } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import ModelSelector from './ModelSelector';
import LastFetched from './LastFetched';
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS } from '../constants/chart';
import { targetDisplayNameMap, targetYAxisLabelMap } from '../utils/mapUtils';

const MetroCastView = ({ data, metadata, selectedDates, selectedModels, models, setSelectedModels, windowSize, getDefaultRange, selectedTarget }) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null);
  const plotRef = useRef(null);
  const isResettingRef = useRef(false);
  
  const getDefaultRangeRef = useRef(getDefaultRange);
  const projectionsDataRef = useRef([]);

  const { colorScheme } = useMantineColorScheme();
  const groundTruth = data?.ground_truth;
  const forecasts = data?.forecasts;

  const calculateYRange = useCallback((plotData, xRange) => {
    if (!plotData || !xRange || !Array.isArray(plotData) || plotData.length === 0 || !selectedTarget) return null;
    let minY = Infinity;
    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    plotData.forEach(trace => {
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
      return [Math.max(0, minY - padding), maxY + padding];
    }
    return null;
  }, [selectedTarget]);

  const projectionsData = useMemo(() => {
    if (!groundTruth || !forecasts || selectedDates.length === 0 || !selectedTarget) return [];

    const groundTruthValues = groundTruth[selectedTarget];
    if (!groundTruthValues) return [];

    const groundTruthTrace = {
      x: groundTruth.dates || [],
      y: groundTruthValues,
      name: 'Observed',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: 'black', width: 2, dash: 'dash' },
      marker: { size: 4, color: 'black' }
    };

    const modelTraces = selectedModels.flatMap(model =>
      selectedDates.flatMap((date, dateIndex) => {
        const forecastsForDate = forecasts[date] || {};
        const forecast = forecastsForDate[selectedTarget]?.[model];
        if (!forecast || forecast.type !== 'quantile') return []; 

        const forecastDates = [], medianValues = [], ci95Upper = [], ci95Lower = [], ci50Upper = [], ci50Lower = [];
        const sortedHorizons = Object.keys(forecast.predictions || {}).sort((a, b) => Number(a) - Number(b));

        sortedHorizons.forEach((h) => {
          const pred = forecast.predictions[h];
          forecastDates.push(pred.date);
          const { quantiles = [], values = [] } = pred;
          
          const findValue = (q) => {
            const idx = quantiles.indexOf(q);
            return idx !== -1 ? values[idx] : null; 
          };

          const v025 = findValue(0.025), v25 = findValue(0.25), v50 = findValue(0.5), v75 = findValue(0.75), v975 = findValue(0.975);

          if (v50 !== null) {
            medianValues.push(v50);
            ci95Lower.push(v025 ?? v50);
            ci50Lower.push(v25 ?? v50);
            ci50Upper.push(v75 ?? v50);
            ci95Upper.push(v975 ?? v50);
          }
        });

        if (forecastDates.length === 0) return [];

        const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
        const isFirstDate = dateIndex === 0; 

        return [
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci95Upper, ...ci95Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 95% CI`, hoverinfo: 'none', legendgroup: model },
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci50Upper, ...ci50Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 50% CI`, hoverinfo: 'none', legendgroup: model },
          { x: forecastDates, y: medianValues, name: model, type: 'scatter', mode: 'lines+markers', line: { color: modelColor, width: 2, dash: 'solid' }, marker: { size: 6, color: modelColor }, showlegend: isFirstDate, legendgroup: model }
        ];
      })
    );

    return [groundTruthTrace, ...modelTraces];
  }, [groundTruth, forecasts, selectedDates, selectedModels, selectedTarget]);

  useEffect(() => {
    getDefaultRangeRef.current = getDefaultRange;
    projectionsDataRef.current = projectionsData;
  }, [getDefaultRange, projectionsData]);

  const activeModels = useMemo(() => {
    const activeModelSet = new Set();
    if (!forecasts || !selectedTarget || !selectedDates.length) return activeModelSet;
    selectedDates.forEach(date => {
      const targetData = forecasts[date]?.[selectedTarget];
      if (targetData) Object.keys(targetData).forEach(m => activeModelSet.add(m));
    });
    return activeModelSet;
  }, [forecasts, selectedDates, selectedTarget]);

  const defaultRange = useMemo(() => getDefaultRange(), [getDefaultRange]);

  useEffect(() => { setXAxisRange(null); }, [selectedTarget]);

  useEffect(() => {
    const currentXRange = xAxisRange || defaultRange;
    if (projectionsData.length > 0 && currentXRange) {
      setYAxisRange(calculateYRange(projectionsData, currentXRange));
    } else {
      setYAxisRange(null);
    }
  }, [projectionsData, xAxisRange, defaultRange, calculateYRange]);

  const handlePlotUpdate = useCallback((figure) => {
    if (isResettingRef.current) { isResettingRef.current = false; return; }
    if (figure?.['xaxis.range']) {
      const newXRange = figure['xaxis.range'];
      if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) setXAxisRange(newXRange);
    }
  }, [xAxisRange]);

  const layout = useMemo(() => ({ 
    width: Math.min(CHART_CONSTANTS.MAX_WIDTH, windowSize.width * CHART_CONSTANTS.WIDTH_RATIO),
    height: Math.min(CHART_CONSTANTS.MAX_HEIGHT, windowSize.height * CHART_CONSTANTS.HEIGHT_RATIO),
    autosize: true,
    template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000000' },
    showlegend: selectedModels.length < 15, 
    legend: {
      x: 0, y: 1, xanchor: 'left', yanchor: 'top',
      bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
      borderwidth: 1, font: { size: 10 }
    },
    hovermode: 'x unified',
    dragmode: false, 
    margin: { l: 60, r: 30, t: 30, b: 30 },
    xaxis: {
      domain: [0, 1], 
      rangeslider: { range: getDefaultRange(true) },
      rangeselector: {
        buttons: [
          {count: 1, label: '1m', step: 'month', stepmode: 'backward'},
          {count: 6, label: '6m', step: 'month', stepmode: 'backward'},
          {step: 'all', label: 'all'}
        ]
      },
      range: xAxisRange || defaultRange, 
      showline: true, linewidth: 1,
      linecolor: colorScheme === 'dark' ? '#aaa' : '#444'
    },
    yaxis: {
      title: (() => {
        const longName = targetDisplayNameMap[selectedTarget];
        return targetYAxisLabelMap[longName] || longName || selectedTarget || 'Value';
      })(),
      range: yAxisRange, 
      autorange: yAxisRange === null, 
    },
    shapes: selectedDates.map(date => ({
      type: 'line', x0: date, x1: date, y0: 0, y1: 1, yref: 'paper',
      line: { color: 'red', width: 1, dash: 'dash' }
    }))
  }), [colorScheme, windowSize, defaultRange, selectedTarget, selectedDates, selectedModels, yAxisRange, xAxisRange, getDefaultRange]); 

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['resetScale2d', 'select2d', 'lasso2d'], 
    modeBarButtonsToAdd: [{
      name: 'Reset view',
      icon: Plotly.Icons.home,
      click: function(gd) {
        const range = getDefaultRangeRef.current();
        if (!range) return;
        const newYRange = projectionsDataRef.current.length > 0 ? calculateYRange(projectionsDataRef.current, range) : null;
        isResettingRef.current = true;
        setXAxisRange(null);
        setYAxisRange(newYRange);
        Plotly.relayout(gd, { 'xaxis.range': range, 'yaxis.range': newYRange, 'yaxis.autorange': newYRange === null });
      }
    }]
  }), [calculateYRange]);

  if (!selectedTarget) {
    return (
      <Center style={{ height: '300px' }}>
        <Text>Please select a target to view MetroCast data.</Text>
      </Center>
    );
  }

  return (
    <Stack>
      <LastFetched timestamp={metadata?.last_updated} />
      
      <div style={{ width: '100%', height: Math.min(800, windowSize.height * 0.6) }}>
        <Plot
          ref={plotRef}
          style={{ width: '100%', height: '100%' }}
          data={projectionsData}
          layout={layout}
          config={config}
          onRelayout={handlePlotUpdate} 
        />
      </div>

      <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '8px', marginTop: 'auto' }}>
        <p style={{ fontStyle: 'italic', fontSize: '11px', color: '#868e96', textAlign: 'right', margin: 0 }}>
          Note that forecasts should be interpreted with great caution and may not reliably predict rapid changes in disease trends.
        </p>
      </div>

      <ModelSelector
        models={models}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        activeModels={activeModels}
        getModelColor={(model, selectedModels) => {
          const index = selectedModels.indexOf(model);
          return MODEL_COLORS[index % MODEL_COLORS.length];
        }}
      />
    </Stack>
  );
};

export default MetroCastView;