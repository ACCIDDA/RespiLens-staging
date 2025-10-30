// src/components/NHSNRawView.jsx

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Stack, Alert, Text, Center, useMantineColorScheme, Loader, Select } from '@mantine/core';
import Plot from 'react-plotly.js';
import { getDataPath } from '../utils/paths';
import NHSNColumnSelector from './NHSNColumnSelector';
import { MODEL_COLORS } from '../config/datasets';
import { nhsnTargetsToColumnsMap } from '../utils/mapUtils';


const nhsnYAxisLabelMap = {
  'Raw Patient Counts': 'Patient Count',
  'Hospital Admission Rates': 'Rate per 100k',
  'Hospital Admission Percents': 'Percent (%)',
  'Raw Bed Capacity': 'Bed Count',
  'Bed Capacity Percents': 'Percent (%)',
  'Absolute Percent Change': 'Absolute Change (%)'
};

const NHSNRawView = ({ location }) => {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();
  
  const [allDataColumns, setAllDataColumns] = useState([]); // All columns from JSON
  const [filteredAvailableColumns, setFilteredAvailableColumns] = useState([]); // Columns for the selected target
  
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [availableTargets, setAvailableTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null); // This is the string key, e.g., "Raw Patient Counts"

  // Get URL search param tools
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      if (!location) return;
      
      try {
        setLoading(true);
        setData(null);
        setMetadata(null);
        setAllDataColumns([]);
        setFilteredAvailableColumns([]);
        setSelectedColumns([]);
        setAvailableTargets([]);
        setSelectedTarget(null);
        setError(null);

        const dataUrl = getDataPath(`nhsn/${location}_nhsn.json`);
        const metadataUrl = getDataPath('nhsn/metadata.json');

        const [dataResponse, metadataResponse] = await Promise.all([
          fetch(dataUrl),
          fetch(metadataUrl)
        ]);

        if (!dataResponse.ok) {
          if (dataResponse.status === 404) throw new Error('No NHSN data available for this location');
          throw new Error('Failed to load NHSN data');
        }
        if (!metadataResponse.ok) throw new Error('Failed to load NHSN metadata');

        const jsonData = await dataResponse.json();
        const jsonMetadata = await metadataResponse.json();

        if (!jsonData.series || !jsonData.series.dates) {
          throw new Error('Invalid data format');
        }
        if (!jsonMetadata.last_updated) {
          throw new Error('Invalid metadata format');
        }

        setData(jsonData);
        setMetadata(jsonMetadata); // Store for last_updated
        
        const allColumnsFromData = Object.keys(jsonData.series)
          .filter(key => key !== 'dates')
          .sort();
        setAllDataColumns(allColumnsFromData);

        const targets = Object.keys(nhsnTargetsToColumnsMap);
        setAvailableTargets(targets);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location]); // Runs when location is set

  useEffect(() => {
    // Wait for fetch to complete
    if (loading || availableTargets.length === 0) {
      return;
    }

    const urlTarget = searchParams.get('nhsn_target');
    if (urlTarget && availableTargets.includes(urlTarget)) {
      setSelectedTarget(urlTarget);
    } else {
      setSelectedTarget(availableTargets[0]); // Default to the first target
    }
  }, [loading, availableTargets, searchParams]); // Runs when data is loaded

  
  useEffect(() => {
    // Wait for target to be set
    if (loading || !selectedTarget || allDataColumns.length === 0) {
      setFilteredAvailableColumns([]);
      return;
    }
    const columnsForTarget = nhsnTargetsToColumnsMap[selectedTarget] || [];
    const filtered = allDataColumns.filter(col => columnsForTarget.includes(col));
    
    setFilteredAvailableColumns(filtered);

    const urlCols = searchParams.getAll('nhsn_cols');
    const validUrlCols = urlCols.filter(col => filtered.includes(col));

    if (validUrlCols.length > 0) {
      setSelectedColumns(validUrlCols);
    } else if (filtered.length > 0) {
      setSelectedColumns([filtered[0]]); // Default to first available column
    } else {
      setSelectedColumns([]);
    }
  }, [loading, selectedTarget, allDataColumns, searchParams]); // Runs when target is set

  useEffect(() => {
    // Don't update URL params until data is loaded and state is initialized
    if (loading || !selectedTarget || availableTargets.length === 0 || allDataColumns.length === 0) {
      return;
    }

    const newParams = new URLSearchParams(searchParams);

    const defaultTarget = availableTargets[0];
    if (selectedTarget && selectedTarget !== defaultTarget) {
      newParams.set('nhsn_target', selectedTarget);
    } else {
      newParams.delete('nhsn_target'); // It's the default, remove it
    }

    const columnsForTarget = nhsnTargetsToColumnsMap[selectedTarget] || [];
    const filteredCols = allDataColumns.filter(col => columnsForTarget.includes(col));
    const defaultColumns = filteredCols.length > 0 ? [filteredCols[0]] : [];
    
    const sortedSelected = [...selectedColumns].sort();
    const sortedDefault = [...defaultColumns].sort();

    if (JSON.stringify(sortedSelected) !== JSON.stringify(sortedDefault)) {
      newParams.delete('nhsn_cols'); // Clear all first
      sortedSelected.forEach(col => newParams.append('nhsn_cols', col));
    } else {
      newParams.delete('nhsn_cols'); // It's the default, remove it
    }

    if (newParams.toString() !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true });
    }

  }, [selectedTarget, selectedColumns, allDataColumns, availableTargets, loading, searchParams, setSearchParams]);


  const calculateNHSNYRange = () => {
    if (!data?.series || selectedColumns.length === 0) return null;
    const allValues = selectedColumns.reduce((acc, column) => {
        const valuesArray = data.series[column];
        if (valuesArray) {
            const numericValues = valuesArray.filter(v => typeof v === 'number' && !isNaN(v));
            return acc.concat(numericValues);
        }
        return acc;
    }, []);
    if (allValues.length === 0) return null;
    const maxY = Math.max(...allValues);
    const padding = maxY * 0.15; 
    return [0, maxY + padding];
  };

  if (loading) return <Center p="md"><Stack align="center"><Loader /><Text>Loading NHSN data...</Text></Stack></Center>;
  if (error) return <Center p="md"><Alert color="red">Error: {error}</Alert></Center>;
  if (!data) return <Center p="md"><Text>No NHSN data available for this location</Text></Center>;

  const traces = selectedColumns.map((column) => {
    // Use filteredAvailableColumns for index
    const columnIndex = filteredAvailableColumns.indexOf(column);
    return {
      x: data.series.dates,
      y: data.series[column],
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
      title: nhsnYAxisLabelMap[selectedTarget] || 'Value',
      range: calculateNHSNYRange()
    },
    height: 600,
    showlegend: false,
    margin: { t: 40, r: 10, l: 60, b: 120 }
  };

  const lastUpdatedTimestamp = metadata?.last_updated;
  let formattedDate = null;
  if (lastUpdatedTimestamp) {
    const date = new Date(lastUpdatedTimestamp);
    formattedDate = date.toLocaleString(undefined, {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  return (
    <Stack gap="md" w="100%">
      {formattedDate && (
        <Text size="xs" c="dimmed" ta="right">
          last updated: {formattedDate}
        </Text>
      )}

      <Select
        label="Select a timeseries unit"
        placeholder="Choose a time series unit"
        data={availableTargets}
        value={selectedTarget}
        onChange={setSelectedTarget} // This triggers the useEffect to filter columns
        disabled={loading}
        allowDeselect={false}
        // style={{ maxWidth: 200 }} // controls how wide the dropdown select thingy is 
      />

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
        availableColumns={filteredAvailableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
      />
    </Stack>
  );
};

export default NHSNRawView;