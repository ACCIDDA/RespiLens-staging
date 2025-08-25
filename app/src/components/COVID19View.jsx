import React, { useState, useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import ModelSelector from './ModelSelector';
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS, RATE_CHANGE_CATEGORIES } from '../constants/chart';

const COVID19View = ({ data, selectedDates, selectedModels, models, setSelectedModels, viewType, windowSize, getDefaultRange }) => {
  // State to track the current y-axis range
  const [yAxisRange, setYAxisRange] = useState(null);
  const plotRef = useRef(null);
  const { colorScheme } = useMantineColorScheme();

  const getTimeSeriesData = () => {
    if (!data || selectedDates.length === 0) {
      return null;
    }

    const groundTruthTrace = {
      x: data.ground_truth.dates,
      y: data.ground_truth.values,
      name: 'Observed',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#8884d8', width: 2 },
      marker: { size: 6 }
    };

    const modelTraces = selectedModels.flatMap(model => 
      selectedDates.flatMap((date) => {
        const forecasts = data.forecasts[date] || {};
        const forecast = 
          forecasts['wk inc covid hosp']?.[model] || 
          forecasts['wk covid hosp rate change']?.[model];
      
        if (!forecast) return [];

        const forecastDates = [];
        const medianValues = [];
        const ci95Upper = [];
        const ci95Lower = [];
        const ci50Upper = [];
        const ci50Lower = [];

        const sortedPredictions = Object.entries(forecast.predictions || {})
          .sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
        
        sortedPredictions.forEach(([horizon, pred]) => {
          forecastDates.push(pred.date);
          
          if (forecast.type !== 'quantile') {
            return;
          }
          const quantiles = pred.quantiles || [];
          const values = pred.values || [];
          
          const q95Lower = values[quantiles.indexOf(0.025)] || 0;
          const q50Lower = values[quantiles.indexOf(0.25)] || 0;
          const median = values[quantiles.indexOf(0.5)] || 0;
          const q50Upper = values[quantiles.indexOf(0.75)] || 0;
          const q95Upper = values[quantiles.indexOf(0.975)] || 0;
          
          ci95Lower.push(q95Lower);
          ci50Lower.push(q50Lower);
          medianValues.push(median);
          ci50Upper.push(q50Upper);
          ci95Upper.push(q95Upper);
        });

        const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];

        return [
          {
            x: [...forecastDates, ...forecastDates.slice().reverse()],
            y: [...ci95Upper, ...ci95Lower.slice().reverse()],
            fill: 'toself',
            fillcolor: `${modelColor}10`,
            line: { color: 'transparent' },
            showlegend: false,
            type: 'scatter',
            name: `${model} (${date}) 95% CI`
          },
          {
            x: [...forecastDates, ...forecastDates.slice().reverse()],
            y: [...ci50Upper, ...ci50Lower.slice().reverse()],
            fill: 'toself',
            fillcolor: `${modelColor}30`,
            line: { color: 'transparent' },
            showlegend: false,
            type: 'scatter',
            name: `${model} (${date}) 50% CI`
          },
          {
            x: forecastDates,
            y: medianValues,
            name: `${model} (${date})`,
            type: 'scatter',
            mode: 'lines+markers',
            line: { 
              color: modelColor,
              width: 2,
              dash: 'solid'
            },
            marker: { size: 6, color: modelColor },
            showlegend: true
          }
        ];
      })
    );

    return [groundTruthTrace, ...modelTraces];
  };

  const getRateChangeData = () => {
    if (!data || selectedDates.length === 0) return null;

    const categoryOrder = RATE_CHANGE_CATEGORIES;

    const lastSelectedDate = selectedDates.slice().sort().pop();
    
    return selectedModels.map(model => {
      const forecast = data.forecasts[lastSelectedDate]?.['wk covid hosp rate change']?.[model];
      if (!forecast) return null;

      const horizon0 = forecast.predictions['0'];
      if (!horizon0) return null;
      
      const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
    
      const orderedData = categoryOrder.map(cat => ({
        category: cat.replace('_', '<br>'),
        value: horizon0.probabilities[horizon0.categories.indexOf(cat)] * 100
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
        yaxis: 'y2'
      };
    }).filter(Boolean);
  };

  // Function to calculate y-axis range for visible data
  const calculateYRange = (data, xRange) => {
    if (!data || !xRange || !Array.isArray(data) || data.length === 0) return null;

    let minY = Infinity;
    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    // Process each trace
    data.forEach(trace => {
      if (!trace.x || !trace.y) return;

      // Find visible points in this trace
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

    // If we found valid min/max values
    if (minY !== Infinity && maxY !== -Infinity) {
      // Add padding, but always start from 0
      const padding = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
      return [0, maxY + padding];
    }

    return null;
  };

  const timeSeriesData = getTimeSeriesData() || [];
  const rateChangeData = getRateChangeData() || [];
  const defaultRange = getDefaultRange();

  // Initialize y-axis range based on default x range
  useEffect(() => {
    if (timeSeriesData.length > 0 && defaultRange) {
      const initialYRange = calculateYRange(timeSeriesData, defaultRange);
      if (initialYRange) {
        setYAxisRange(initialYRange);
      }
    }
  }, [timeSeriesData, defaultRange]);

  const handlePlotUpdate = (figure) => {
    // When plot is updated (e.g., zoom), recalculate y-axis range
    if (figure && figure['xaxis.range'] && timeSeriesData.length > 0) {
      const newYRange = calculateYRange(timeSeriesData, figure['xaxis.range']);
      if (newYRange && plotRef.current) {
        setYAxisRange(newYRange);
        // Also update the plot directly
        Plotly.relayout(plotRef.current, {'yaxis.range': newYRange});
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
    grid: viewType === 'coviddetailed' ? {
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
      domain: viewType === 'coviddetailed' ? [0, 0.8] : [0, 1],
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
      // Apply dynamic y-axis range if available
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
    ...(viewType === 'coviddetailed' ? {
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
        const range = getDefaultRange();
        if (range) {
          // Reset y-axis range based on default x range
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

  return (
    <div>
      <div style={{ width: '100%', height: Math.min(800, windowSize.height * 0.6) }}>
        <Plot
          ref={plotRef}
          style={{ width: '100%', height: '100%' }}
          data={[
            ...timeSeriesData,
            ...(viewType === 'coviddetailed' 
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
    </div>
  );
};

export default COVID19View;