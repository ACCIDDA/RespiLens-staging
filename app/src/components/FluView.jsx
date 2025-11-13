import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useMantineColorScheme, Stack, Text } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import ModelSelector from './ModelSelector';
import LastFetched from './LastFetched';
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS, RATE_CHANGE_CATEGORIES } from '../constants/chart';
import { targetDisplayNameMap } from '../utils/mapUtils';

const FluView = ({ data, metadata, selectedDates, selectedModels, models, setSelectedModels, viewType, windowSize, getDefaultRange, selectedTarget }) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null); 
  const plotRef = useRef(null);
  const isResettingRef = useRef(false); 
  const debounceTimerRef = useRef(null);
  
  // Refs to hold the latest versions of props/data for the reset button
  const getDefaultRangeRef = useRef(getDefaultRange);
  const projectionsDataRef = useRef([]);

  const { colorScheme } = useMantineColorScheme();
  const groundTruth = data?.ground_truth;
  const forecasts = data?.forecasts;

  const calculateYRange = useCallback((data, xRange) => {
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
  }, []); 

  const projectionsData = useMemo(() => {
    const targetForProjections = viewType === 'flu' ? selectedTarget : 'wk inc flu hosp';

    if (!groundTruth || !forecasts || selectedDates.length === 0 || !targetForProjections) {
      return [];
    }
    
    const groundTruthValues = groundTruth[targetForProjections];
    if (!groundTruthValues) {
      console.warn(`Ground truth data not found for target: ${targetForProjections}`);
      return [];
    }
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
        const forecast = forecastsForDate[targetForProjections]?.[model];

        if (!forecast) return [];
        const forecastDates = [], medianValues = [], ci95Upper = [], ci95Lower = [], ci50Upper = [], ci50Lower = [];
        const sortedPredictions = Object.entries(forecast.predictions || {}).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
        sortedPredictions.forEach(([, pred]) => {
          forecastDates.push(pred.date);
          if (forecast.type !== 'quantile') return;
          const { quantiles = [], values = [] } = pred;
          
          const findValue = (q) => {
            const idx = quantiles.indexOf(q);
            return idx !== -1 ? values[idx] : 0;
          };

          ci95Lower.push(findValue(0.025));
          ci50Lower.push(findValue(0.25));
          medianValues.push(findValue(0.5));
          ci50Upper.push(findValue(0.75));
          ci95Upper.push(findValue(0.975));
        });
        const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
        const isFirstDate = dateIndex === 0; 

        return [
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci95Upper, ...ci95Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 95% CI`, legendgroup: model },
          { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci50Upper, ...ci50Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 50% CI`, legendgroup: model },
          { x: forecastDates, y: medianValues, name: model, type: 'scatter', mode: 'lines+markers', line: { color: modelColor, width: 2, dash: 'solid' }, marker: { size: 6, color: modelColor }, showlegend: isFirstDate, legendgroup: model }
        ];
      })
    );
    return [groundTruthTrace, ...modelTraces];
  }, [groundTruth, forecasts, selectedDates, selectedModels, viewType, selectedTarget]);

  // Update Refs on every render
  useEffect(() => {
    getDefaultRangeRef.current = getDefaultRange;
    projectionsDataRef.current = projectionsData;
  }, [getDefaultRange, projectionsData]);

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

  const finalPlotData = useMemo(() => {
    const histogramTraces = viewType === 'fludetailed' 
      ? rateChangeData.map(trace => ({
          ...trace,
          orientation: 'h',
          xaxis: 'x2',
          yaxis: 'y2'
        }))
      : [];
    
    return [...projectionsData, ...histogramTraces];
  }, [projectionsData, rateChangeData, viewType]);

  const activeModels = useMemo(() => {
    const activeModelSet = new Set();
    if (!forecasts || !selectedDates.length) {
      return activeModelSet;
    }

    const targetForProjections = viewType === 'flu' ? selectedTarget : 'wk inc flu hosp';

    if (viewType === 'flu' && !targetForProjections) return activeModelSet;

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
        const rateChangeData = forecastsForDate['wk flu hosp rate change'];
        if (rateChangeData) {
          Object.keys(rateChangeData).forEach(model => activeModelSet.add(model));
        }
      }
    });

    return activeModelSet;
  }, [forecasts, selectedDates, selectedTarget, viewType]);

  const defaultRange = useMemo(() => getDefaultRange(), [getDefaultRange]);

  useEffect(() => {
    setXAxisRange(null); 
  }, [viewType, selectedTarget]);

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
  }, [projectionsData, xAxisRange, defaultRange, calculateYRange]);

  const handlePlotUpdate = useCallback((figure) => {
    if (isResettingRef.current) {
      isResettingRef.current = false; 
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (figure && figure['xaxis.range']) {
      const newXRange = figure['xaxis.range'];

      debounceTimerRef.current = setTimeout(() => {
        if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) {
          setXAxisRange(newXRange);
        }
      }, 100); // 100ms debounce window
    }
  }, [xAxisRange]);

  const layout = useMemo(() => ({
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
    showlegend: selectedModels.length < 15, 
    legend: {
      x: 0,
      y: 1,
      xanchor: 'left',
      yanchor: 'top',
      bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
      borderwidth: 1,
      font: {
        size: 10
      }
    },
    hovermode: 'x unified',
    dragmode: false, 
    margin: { l: 60, r: 30, t: 30, b: 30 },
    xaxis: {
      domain: viewType === 'fludetailed' ? [0, 0.8] : [0, 1],
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
      range: xAxisRange || defaultRange 
    },
    yaxis: {
      title: viewType === 'fludetailed'
        ? 'Hospitalizations'
        : targetDisplayNameMap[selectedTarget] || selectedTarget || 'Value',
      range: yAxisRange,
      autorange: yAxisRange === null,
    },
    shapes: selectedDates.map(date => {
      return {
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
      };
    }),
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
  }), [colorScheme, windowSize, defaultRange, selectedTarget, selectedDates, selectedModels, yAxisRange, xAxisRange, getDefaultRange, viewType]);

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarPosition: 'left',
    showSendToCloud: false,
    plotlyServerURL: "",
    scrollZoom: false, 
    doubleClick: 'reset', 
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'resetScale2d'], 
    toImageButtonOptions: {
      format: 'png',
      filename: 'forecast_plot'
    },
    modeBarButtonsToAdd: [{
      name: 'Reset view',
      icon: Plotly.Icons.home,
      click: function(gd) {
        const currentGetDefaultRange = getDefaultRangeRef.current;
        const currentProjectionsData = projectionsDataRef.current;

        const range = currentGetDefaultRange();
        if (!range) return;

        const newYRange = currentProjectionsData.length > 0 ? calculateYRange(currentProjectionsData, range) : null;

        isResettingRef.current = true;

        setXAxisRange(null);
        setYAxisRange(newYRange);

        Plotly.relayout(gd, {
          'xaxis.range': range,
          'yaxis.range': newYRange,
          'yaxis.autorange': newYRange === null
        });
      }
    }]
  }), [calculateYRange]);

  if (viewType === 'flu' && !selectedTarget) {
    return (
        <Stack align="center" justify="center" style={{ height: '300px' }}>
            <Text>Please select a target to view data.</Text>
        </Stack>
    );
  }

  return (
    <Stack>
      <LastFetched timestamp={metadata?.last_updated} />
      <div style={{ width: '100%', height: Math.min(800, windowSize.height * 0.6) }}>
        <Plot
          ref={plotRef}
          style={{ width: '100%', height: '100%' }}
          data={finalPlotData} 
          layout={layout}
          config={config}
          onRelayout={(figure) => handlePlotUpdate(figure)}
        />
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

export default FluView;