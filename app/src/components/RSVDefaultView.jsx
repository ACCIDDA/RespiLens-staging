import { Center, Text, Paper, useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import ModelSelector from './ModelSelector';
import { MODEL_COLORS } from '../config/datasets';
import { useView } from '../contexts/ViewContext';

const RSVDefaultView = ({
  getModelColor = (model, selectedModels) => {
    const index = selectedModels.indexOf(model);
    return MODEL_COLORS[index % MODEL_COLORS.length];
  }
}) => {
  const { data, models, selectedModels, setSelectedModels, selectedDates } = useView();
  const { colorScheme } = useMantineColorScheme();

  // Find the primary target key from the ground_truth data (e.g., 'wk inc rsv hosp')
  const target = data?.ground_truth ? Object.keys(data.ground_truth).find(k => k !== 'dates' && Array.isArray(data.ground_truth[k])) : null;

  if (!data || !data.ground_truth || !data.forecasts || !target) {
    return (
      <Center h="100%" w="100%">
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            No RSV forecast data available for this location
          </Text>
        </Paper>
      </Center>
    );
  }

  const getDefaultRange = (forRangeslider = false) => {
    if (!data?.ground_truth || !selectedDates.length) return undefined;
    
    const firstGroundTruthDate = new Date(data.ground_truth.dates[0]);
    const lastGroundTruthDate = new Date(data.ground_truth.dates.slice(-1)[0]);
    
    if (forRangeslider) {
      const rangesliderEnd = new Date(lastGroundTruthDate);
      rangesliderEnd.setDate(rangesliderEnd.getDate() + (5 * 7));
      return [firstGroundTruthDate, rangesliderEnd];
    }
    
    const firstDate = new Date(selectedDates[0]);
    const lastDate = new Date(selectedDates[selectedDates.length - 1]);
    
    const startDate = new Date(firstDate);
    const endDate = new Date(lastDate);
    
    startDate.setDate(startDate.getDate() - (8 * 7));
    endDate.setDate(endDate.getDate() + (5 * 7));
    
    return [startDate, endDate];
  };

  // Calculate y-range for visible data
  const calculateYRange = (xRange) => {
    if (!data || !xRange || !target) return null;

    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);
    let minY = Infinity;
    let maxY = -Infinity;

    // Add ground truth values
    const groundTruthDates = data.ground_truth.dates;
    const groundTruthValues = data.ground_truth[target];

    if (groundTruthDates && groundTruthValues) {
        groundTruthDates.forEach((date, index) => {
            const pointDate = new Date(date);
            if (pointDate >= startDate && pointDate <= endDate) {
                const value = groundTruthValues[index];
                if (typeof value === 'number' && !isNaN(value)) {
                    minY = Math.min(minY, value);
                    maxY = Math.max(maxY, value);
                }
            }
        });
    }
    
    // Add forecast values
    selectedModels.forEach(model => {
      selectedDates.forEach(date => {
        const forecast = data.forecasts[date]?.[target]?.[model];
        if (forecast?.type === 'quantile') {
          Object.entries(forecast.predictions || {}).forEach(([, pred]) => {
            const pointDate = new Date(pred.date);
            if (pointDate >= startDate && pointDate <= endDate) {
              const values = pred.values || [];
              values.forEach(value => {
                if (typeof value === 'number' && !isNaN(value)) {
                  minY = Math.min(minY, value);
                  maxY = Math.max(maxY, value);
                }
              });
            }
          });
        }
      });
    });
    
    if (minY !== Infinity && maxY !== -Infinity) {
      const padding = maxY * 0.15;
      return [0, maxY + padding];
    }
    return null;
  };

  // Create the ground truth trace
  const groundTruthTrace = {
      x: data.ground_truth.dates || [],
      y: data.ground_truth[target] || [],
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Observed',
      line: { color: '#8884d8', width: 2 }
  };

  // Get model traces
  const modelTraces = selectedModels.flatMap(model => {
    const modelColor = getModelColor(model, selectedModels);
    
    return selectedDates.flatMap(forecastDate => {
      const forecastData = data.forecasts[forecastDate]?.[target]?.[model];
      if (!forecastData || forecastData.type !== 'quantile' || !forecastData.predictions) {
        return [];
      }
      
      const predictions = Object.entries(forecastData.predictions || {})
        .sort((a, b) => new Date(a[1].date) - new Date(b[1].date)); // Sort by prediction date

      const forecastDates = [];
      const medianValues = [];
      const ci95Upper = [];
      const ci95Lower = [];
      const ci50Upper = [];
      const ci50Lower = [];

      predictions.forEach(([, pred]) => {
        forecastDates.push(pred.date);
        
        const { quantiles, values } = pred;
        if (!quantiles || !values) return;

        const q95Lower = values[quantiles.indexOf(0.025)] ?? 0;
        const q50Lower = values[quantiles.indexOf(0.25)] ?? 0;
        const median = values[quantiles.indexOf(0.5)] ?? 0;
        const q50Upper = values[quantiles.indexOf(0.75)] ?? 0;
        const q95Upper = values[quantiles.indexOf(0.975)] ?? 0;

        ci95Lower.push(q95Lower);
        ci50Lower.push(q50Lower);
        medianValues.push(median);
        ci50Upper.push(q50Upper);
        ci95Upper.push(q95Upper);
      });

      return [
        {
          x: [...forecastDates, ...forecastDates.slice().reverse()],
          y: [...ci95Upper, ...ci95Lower.slice().reverse()],
          fill: 'toself',
          fillcolor: `${modelColor}10`,
          line: { color: 'transparent' },
          showlegend: false,
          type: 'scatter',
          name: `${model} 95% CI`,
          hoverinfo: 'none'
        },
        {
          x: [...forecastDates, ...forecastDates.slice().reverse()],
          y: [...ci50Upper, ...ci50Lower.slice().reverse()],
          fill: 'toself',
          fillcolor: `${modelColor}30`,
          line: { color: 'transparent' },
          showlegend: false,
          type: 'scatter',
          name: `${model} 50% CI`,
          hoverinfo: 'none'
        },
        {
          x: forecastDates,
          y: medianValues,
          name: `${model}`,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: modelColor, width: 2 },
          marker: { size: 6 }
        }];
    });
  });

  const traces = [groundTruthTrace, ...modelTraces];

  const layout = {
    template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    font: {
      color: colorScheme === 'dark' ? '#c1c2c5' : '#000000'
    },
    height: 600,
    margin: { l: 60, r: 30, t: 50, b: 80 },
    showlegend: false,
    xaxis: {
      rangeslider: {
        range: getDefaultRange(true),
        thickness: 0.05,
        yaxis: { rangemode: 'match' },
        bgcolor: '#f8f9fa',
      },
      range: getDefaultRange(),
      rangeselector: {
        buttons: [
          { count: 3, label: '3m', step: 'month', stepmode: 'backward' },
          { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
          { step: 'all', label: 'All' }
        ]
      }
    },
    yaxis: {
        title: 'Weekly Incident Cases',
        range: calculateYRange(getDefaultRange())
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
  };

  return (
    <div>
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToAdd: [{
            name: 'Reset view',
            click: function(gd) {
              const range = getDefaultRange();
              if (range) {
                Plotly.relayout(gd, {
                  'xaxis.range': range,
                  'xaxis.rangeslider.range': getDefaultRange(true)
                });
              }
            }
          }]
        }}
        style={{ width: '100%' }}
      />
      <ModelSelector
        models={models}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        getModelColor={getModelColor}
      />
    </div>
  );
};

export default RSVDefaultView;
