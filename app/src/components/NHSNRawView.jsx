// src/components/NHSNRawView.jsx

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack, Alert, Text, Center, useMantineColorScheme, Loader, Select } from '@mantine/core';
import Plot from 'react-plotly.js';
import { getDataPath } from '../utils/paths';
import NHSNColumnSelector from './NHSNColumnSelector';
import LastUpdated from './LastUpdated';
import { MODEL_COLORS } from '../config/datasets';
import {
  nhsnTargetsToColumnsMap, // groupings
  nhsnNameToSlugMap, // { longform: shortform } map
  nhsnSlugToNameMap,   // { shortform: longform } map
  nhsnNameToPrettyNameMap // { longform: presentable name } map
} from '../utils/mapUtils';


const nhsnYAxisLabelMap = {
  'Hospital Admissions (count)': 'Patient Count',
  'Hospital Admissions (rates)': 'Rate per 100k',
  'Hospital Admissions (%)': 'Percent (%)',
  'Bed Capacity (count)': 'Bed Count',
  'Bed Capacity (%)': 'Percent (%)'
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

  const [searchParams, setSearchParams] = useSearchParams();

  const [dataRevision, setDataRevision] = useState(0);
  const [plotRevision, setPlotRevision] = useState(0);

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
  }, [location]);


  useEffect(() => {
    // Wait for fetch to complete
    if (loading || availableTargets.length === 0) {
      return;
    }

    const urlTarget = searchParams.get('nhsn_target');
    
    const newTarget = (urlTarget && availableTargets.includes(urlTarget))
      ? urlTarget
      : availableTargets[0];
    
    // Use functional update to avoid needing selectedTarget in the dependency array
    setSelectedTarget(currentTarget => {
      if (currentTarget !== newTarget) {
        return newTarget;
      }
      return currentTarget;
    });
  }, [loading, availableTargets, searchParams]); 


  useEffect(() => {
    if (loading || !selectedTarget || allDataColumns.length === 0) {
      setFilteredAvailableColumns([]);
      return;
    }
    const columnsForTarget = nhsnTargetsToColumnsMap[selectedTarget] || [];
    const filtered = allDataColumns.filter(col => columnsForTarget.includes(col));
    setFilteredAvailableColumns(filtered);

    // Read slugs and convert them to full names 
    const urlSlugs = searchParams.getAll('nhsn_cols');
    const validUrlCols = urlSlugs
      .map(slug => nhsnSlugToNameMap[slug]) // Convert slug TO full name
      .filter(colName => colName && filtered.includes(colName)); // Check if valid

    // Calculate what the new columns should be
    let newSelectedCols;
    if (validUrlCols.length > 0) {
      newSelectedCols = validUrlCols;
    } else if (filtered.length > 0) {
      newSelectedCols = [filtered[0]]; 
    } else {
      newSelectedCols = [];
    }

    setSelectedColumns(currentCols => {
      const newSorted = [...newSelectedCols].sort();
      const currentSorted = [...currentCols].sort();

      if (JSON.stringify(newSorted) !== JSON.stringify(currentSorted)) {
        return newSelectedCols;
      }
      return currentCols;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedTarget, allDataColumns]); // Removed searchParams to prevent loop 


  useEffect(() => {
    if (loading || !selectedTarget || availableTargets.length === 0 || allDataColumns.length === 0) {
      return;
    }
    const currentSearch = window.location.search;
    const newParams = new URLSearchParams(currentSearch);

    const defaultTarget = availableTargets[0];
    if (selectedTarget && selectedTarget !== defaultTarget) {
      newParams.set('nhsn_target', selectedTarget);
    } else {
      newParams.delete('nhsn_target'); 
    }

    const columnsForTarget = nhsnTargetsToColumnsMap[selectedTarget] || [];
    const filteredCols = allDataColumns.filter(col => columnsForTarget.includes(col));
    const defaultColumns = filteredCols.length > 0 ? [filteredCols[0]] : [];
    
    const sortedSelected = [...selectedColumns].sort();
    const sortedDefault = [...defaultColumns].sort();

    const selectedSlugs = sortedSelected.map(name => nhsnNameToSlugMap[name]).filter(Boolean);
    const defaultSlugs = sortedDefault.map(name => nhsnNameToSlugMap[name]).filter(Boolean);

    if (JSON.stringify(selectedSlugs) !== JSON.stringify(defaultSlugs)) {
      newParams.delete('nhsn_cols'); 
      selectedSlugs.forEach(slug => newParams.append('nhsn_cols', slug)); 
    } else {
      newParams.delete('nhsn_cols'); // It's the default, remove it
    }

    if (newParams.toString() !== new URLSearchParams(currentSearch).toString()) {
      setSearchParams(newParams, { replace: true });
    }

  }, [selectedTarget, selectedColumns, allDataColumns, availableTargets, loading, setSearchParams]); // <-- No 'searchParams'


  useEffect(() => {
    if (data) {
      setPlotRevision(p => p + 1);
    }
  }, [data, selectedTarget]); 

  useEffect(() => {
    if(data) {
      setDataRevision(d => d + 1);
    }
  }, [data, selectedColumns, selectedTarget]); 

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
    margin: { t: 40, r: 10, l: 60, b: 120 },
    uirevision: plotRevision
  };

  return (
    <Stack gap="md" w="100%">
      <LastUpdated timestamp={metadata?.last_updated} />

      <Select
        label="Select a timeseries unit"
        placeholder="Choose a time series unit"
        data={availableTargets}
        value={selectedTarget}
        onChange={setSelectedTarget} 
        disabled={loading}
        allowDeselect={false}
        // style={{ maxWidth: 200 }} // this is the width of the select bar
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
        revision={dataRevision}
      />
      
      <NHSNColumnSelector
        availableColumns={filteredAvailableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        nameMap={nhsnNameToPrettyNameMap}
      />
    </Stack>
  );
};

export default NHSNRawView;