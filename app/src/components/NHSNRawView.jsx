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
  const [availableColumns, setAvailableColumns] = useState({
    official: [],
    preliminary: []
  });

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

        if (!jsonData.data || !jsonData.data.official) {
          throw new Error('Invalid data format');
        }

        setData(jsonData);

        const officialCols = Object.keys(jsonData.data.official).sort();
        const prelimCols = Object.keys(jsonData.data.preliminary || {}).sort();

        setAvailableColumns({
          official: officialCols,
          preliminary: prelimCols
        });

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
    if (!data || selectedColumns.length === 0) return null;
    
    let maxY = -Infinity;
    
    selectedColumns.forEach(column => {
      const isPrelimininary = column.includes('_prelim');
      const dataType = isPrelimininary ? 'preliminary' : 'official';
      
      if (data.data?.[dataType]?.[column]) {
        data.data[dataType][column].forEach(value => {
          if (typeof value === 'number' && !isNaN(value)) {
            maxY = Math.max(maxY, value);
          }
        });
      }
    });
    
    if (maxY !== -Infinity) {
      const padding = maxY * 0.15;
      return [0, maxY + padding];
    }
    return null;
  };

  if (loading) return <Center p="md"><Text>Loading NHSN data...</Text></Center>;
  if (error) return <Center p="md"><Alert color="red">Error: {error}</Alert></Center>;
  if (!data) return <Center p="md"><Text>No NHSN data available for this location</Text></Center>;

  const traces = selectedColumns.map((column) => {
    const isPrelimininary = column.includes('_prelim');
    const dataType = isPrelimininary ? 'preliminary' : 'official';
    const columnIndex = [...availableColumns.official, ...availableColumns.preliminary].indexOf(column);

    return {
      x: data.ground_truth.dates,
      y: data.data[dataType][column],
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
        data.ground_truth.dates[0],
        data.ground_truth.dates[data.ground_truth.dates.length - 1]
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