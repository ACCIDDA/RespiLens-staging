import React, { useState, useEffect } from 'react';
import { Stack, Alert, Text, Center, useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import { getDataPath } from '../utils/paths';
import NHSNColumnSelector from './NHSNColumnSelector';
import { MODEL_COLORS } from '../config/datasets';

const NHSNRawView = ({ location, selectedColumns, setSelectedColumns }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();
  const [availableColumns, setAvailableColumns] = useState([]); // removed official and preliminary

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = getDataPath(`nhsn/${location}_nhsn.json`);
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('No NHSN data available for this location');
          }
          throw new Error('Failed to load NHSN data');
        }

        const text = await response.text();
        const jsonData = JSON.parse(text);

        if (!jsonData.series || !jsonData.series.dates) { // changed here too
          throw new Error('Invalid data format');
        }

        setData(jsonData);

        // added here
        const dataColumns = Object.keys(jsonData.series)
          .filter(key => key !== 'dates')
          .sort();
        
        setAvailableColumns(dataColumns);
        // end here

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (location) {
      fetchData();
    }
  }, [location]);

  const calculateNHSNYRange = () => {
    if (!data?.series || selectedColumns.length === 0) return null;

    // 1. Gather all numeric values from all selected columns into a single array
    const allValues = selectedColumns.reduce((acc, column) => {
        const valuesArray = data.series[column];
        if (valuesArray) {
            // Filter out any non-numeric or null values before adding to the list
            const numericValues = valuesArray.filter(v => typeof v === 'number' && !isNaN(v));
            return acc.concat(numericValues);
        }
        return acc;
    }, []);

    // If there are no valid numbers to plot, don't set a range
    if (allValues.length === 0) return null;

    // 2. Find the maximum value from the combined array of all points
    const maxY = Math.max(...allValues);

    // 3. Calculate the padded range and return it
    const padding = maxY * 0.15;
    return [0, maxY + padding];
};

  if (loading) return <Center p="md"><Text>Loading NHSN data...</Text></Center>;
  if (error) return <Center p="md"><Alert color="red">Error: {error}</Alert></Center>;
  if (!data) return <Center p="md"><Text>No NHSN data available for this location</Text></Center>;

  // changed here 
  const traces = selectedColumns.map((column) => {
    const columnIndex = availableColumns.indexOf(column);
    return {
      x: data.series.dates, // Get dates from series object
      y: data.series[column], // Get data directly from series object
      name: column,
      type: 'scatter',
      mode: 'lines+markers',
      line: {
        color: MODEL_COLORS[columnIndex % MODEL_COLORS.length],
        width: 2
      },
      marker: { size: 6 }
    };
  });

  const layout = {
    template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    font: {
      color: colorScheme === 'dark' ? '#c1c2c5' : '#000000'
    },
    title: `NHSN Raw Data for ${data.metadata.location_name}`,
    xaxis: {
      title: 'Date',
      rangeslider: {
        visible: true
      },
      range: [
        data.series.dates[0],
        data.series.dates[data.series.dates.length - 1]
      ]
    },
    yaxis: {
      title: 'Value',
      range: calculateNHSNYRange()
    },
    height: 600,
    showlegend: false,
    margin: { t: 40, r: 10, l: 60, b: 120 }
  };

  return (
    <Stack gap="md" w="100%">
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToAdd: ['resetScale2d']
        }}
        style={{ width: '100%' }}
      />

      <NHSNColumnSelector
        availableColumns={availableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
      />
    </Stack>
  );
};

export default NHSNRawView;