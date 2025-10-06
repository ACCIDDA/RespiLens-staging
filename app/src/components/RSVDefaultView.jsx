import React from 'react';
import { Center, Text, Paper, useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import ModelSelector from './ModelSelector';
import { MODEL_COLORS } from '../config/datasets';
import { useView } from '../contexts/ViewContext'; // 1. Import useView

// 2. Component signature is simplified. We only keep props that are not in the context.
const RSVDefaultView = ({ 
  ageGroups = ["0-130", "0-0.99", "1-4", "5-64", "65-130"],
  getModelColor = (model, selectedModels) => {
    const index = selectedModels.indexOf(model);
    return MODEL_COLORS[index % MODEL_COLORS.length];
  }
}) => {
  // 3. Get all data and state from the central useView() hook.
  const { data, loading, error, models, selectedModels, setSelectedModels, selectedDates } = useView();
  const { colorScheme } = useMantineColorScheme();

  // 4. The entire data-fetching useState and useEffect logic has been removed.

  // 5. Loading and error states are now handled by the parent component (DataVisualization.jsx).
  // We just need to check if the data from the context is ready for this specific component.
  if (!data || !data.ground_truth || !data.forecasts) {
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

  // Simple function to calculate y-range for visible data in RSV subplots
  const calculateYRangeForAgeGroup = (ageGroup, xRange) => {
    if (!data || !xRange) return null;

    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);
    let minY = Infinity;
    let maxY = -Infinity;

    // Find the full target name that matches the age group
    const allTargets = Object.keys(data.ground_truth).filter(k => k !== 'dates');
    const targetForAgeGroup = allTargets.find(t => t.startsWith(ageGroup));

    // Add ground truth values for this age group
    const groundTruthDates = data.ground_truth.dates;
    const groundTruthValues = data.ground_truth[targetForAgeGroup];

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
    
    // Add forecast values for this age group
    selectedModels.forEach(model => {
      selectedDates.forEach(date => {
        const forecast = data.forecasts[date]?.[ageGroup]?.['inc hosp']?.[model];
        if (forecast?.type === 'quantile') {
          Object.entries(forecast.predictions || {}).forEach(([horizon, pred]) => {
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


  // Create subplot traces for each age group
  const traces = ageGroups.map((age, index) => {
    // Find the full target name for the current age group
    const allTargets = Object.keys(data.ground_truth).filter(k => k !== 'dates');
    const targetForAgeGroup = allTargets.find(t => t.startsWith(age));

    // Create the ground truth trace using the shared dates and specific values array
    const groundTruthTrace = {
        x: data.ground_truth.dates || [],
        y: data.ground_truth[targetForAgeGroup] || [],
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Observed',
        xaxis: `x${index + 1}`,
        yaxis: `y${index + 1}`,
        line: { color: '#8884d8', width: 2 }
    };

    // Get model traces for this specific age group
    const modelTraces = selectedModels.flatMap(model => {
      const modelColor = getModelColor(model, selectedModels); // Use the passed in color function
      
      // Get all available forecast dates for this model and age group
      const availableForecastDates = Object.keys(data.forecasts || {})
        .filter(date => data.forecasts[date]?.[age]?.['inc hosp']?.[model])
        .sort();
      
      if (availableForecastDates.length === 0) {
        console.log(`No forecasts found for model ${model} and age group ${age}`);
        return [];
      }

      // Map over all selected dates to get forecasts for each
      return selectedDates.flatMap(forecastDate => {
        const forecastData = data.forecasts[forecastDate]?.[age]?.['inc hosp']?.[model];
        if (!forecastData?.type || !forecastData?.predictions) {
          console.log(`No valid forecast data for model ${model}, age group ${age}, date ${forecastDate}`);
          return [];
        }
        
        console.log(`Model: ${model}, Age Group: ${age}, Date: ${forecastDate}`);
      console.log('Forecast data structure:', {
        type: forecastData.type,
        predictions: Object.keys(forecastData.predictions || {}).length
      });

      if (!forecastData || forecastData.type !== 'quantile') {
        console.log(`Skipping model ${model} - no valid quantile forecast data`);
        return [];
      }

      // Process predictions
      const predictions = Object.entries(forecastData.predictions || {})
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0])); // Sort by horizon

      const forecastDates = [];
      const medianValues = [];
      const ci95Upper = [];
      const ci95Lower = [];
      const ci50Upper = [];
      const ci50Lower = [];

      predictions.forEach(([horizon, pred]) => {
        // Calculate target date based on forecast date + horizon weeks
        const targetDate = new Date(forecastDate);  // Use forecastDate from the outer scope
        targetDate.setDate(targetDate.getDate() + parseInt(horizon) * 7);
        forecastDates.push(targetDate.toISOString().split('T')[0]);
        
        // Extract quantiles
        const { quantiles, values } = pred;
        if (!quantiles || !values) {
          console.warn(`Missing quantiles/values for model ${model}, horizon ${horizon}`);
          return;
        }

        // Get specific quantile values
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
          xaxis: `x${index + 1}`,
          yaxis: `y${index + 1}`
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
          xaxis: `x${index + 1}`,
          yaxis: `y${index + 1}`
        },
        {
          x: forecastDates,
          y: medianValues,
          name: `${model}`,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: modelColor, width: 2 },
          marker: { size: 6 },
          xaxis: `x${index + 1}`,
          yaxis: `y${index + 1}`
        }];
      }); // Close the selectedDates.flatMap
    });

    return [groundTruthTrace, ...modelTraces];
  }).flat();

  const layout = {
    template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    font: {
      color: colorScheme === 'dark' ? '#c1c2c5' : '#000000'
    },
    grid: {
      rows: 3,
      columns: 2,
      pattern: 'independent',
      roworder: 'top to bottom',
      subplots: [
        ['xy'],          // First row spans full width
        ['x2y2', 'x3y3'], // Second row for first two age groups
        ['x4y4', 'x5y5']  // Third row for last two age groups
      ],
      rowheights: [0.6, 0.2, 0.2], // Adjusted to make first row significantly taller
      columnwidths: [0.5, 0.5]
    },
    height: 1000,
    margin: { 
      l: 60, 
      r: 30, 
      t: 50, 
      b: 80  // Increase bottom margin to accommodate range slider
    },
    showlegend: false, // Remove legend
    // Update domain ranges for subplots
    xaxis: { 
      domain: [0, 1],
      rangeslider: {
        range: getDefaultRange(true),
        thickness: 0.05,
        yaxis: {
          rangemode: 'match'
        },
        bgcolor: '#f8f9fa',
        y: -0.2,  // Move it below all graphs
        yanchor: 'top'
      },
      range: getDefaultRange(),
      rangeselector: {
        buttons: [
          {count: 1, label: '1m', step: 'month', stepmode: 'backward'},
          {count: 6, label: '6m', step: 'month', stepmode: 'backward'},
          {step: 'all', label: 'all'}
        ]
      }
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
    xaxis2: { 
      domain: [0, 0.48],
      range: getDefaultRange()
    },
    xaxis3: { 
      domain: [0.52, 1],
      range: getDefaultRange()
    },
    xaxis4: { 
      domain: [0, 0.48],
      range: getDefaultRange()
    },
    xaxis5: { 
      domain: [0.52, 1],
      range: getDefaultRange()
    },
    // Add y-axis ranges for each subplot
    yaxis: {
      range: calculateYRangeForAgeGroup(ageGroups[0], getDefaultRange())
    },
    yaxis2: {
      range: calculateYRangeForAgeGroup(ageGroups[1], getDefaultRange())
    },
    yaxis3: {
      range: calculateYRangeForAgeGroup(ageGroups[2], getDefaultRange())
    },
    yaxis4: {
      range: calculateYRangeForAgeGroup(ageGroups[3], getDefaultRange())
    },
    yaxis5: {
      range: calculateYRangeForAgeGroup(ageGroups[4], getDefaultRange())
    },
    annotations: ageGroups.map((age, index) => {
      if (index === 0) {
        return {
          text: `Overall (Age ${age})`,
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: 1.1,  // Move title up above the graph
          showarrow: false,
          font: { size: 16, weight: 'bold' }
        };
      } else {
        const row = Math.floor((index - 1) / 2) + 1;  // 1 for second row, 2 for third row
        const col = ((index - 1) % 2);  // 0 for left, 1 for right
        return {
          text: `Age ${age}`,
          xref: 'paper',
          yref: 'paper',
          x: col === 0 ? 0.24 : 0.76,   // Adjusted x positions
          y: row === 1 ? 0.6 : 0.25,    // Adjusted y positions
          showarrow: false,
          font: { size: 14, weight: 'bold' }
        };
      }
    })
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
                  'xaxis.range': range, 'xaxis2.range': range, 'xaxis3.range': range,
                  'xaxis4.range': range, 'xaxis5.range': range,
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
