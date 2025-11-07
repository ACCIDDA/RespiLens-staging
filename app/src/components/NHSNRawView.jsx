// src/components/NHSNRawView.jsx

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack, Alert, Text, Center, useMantineColorScheme, Loader } from '@mantine/core';
import Plot from 'react-plotly.js';
import { getDataPath } from '../utils/paths';
import NHSNColumnSelector from './NHSNColumnSelector';
import LastFetched from './LastFetched';
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

  const [yAxisRange, setYAxisRange] = useState(null);
  const [xAxisRange, setXAxisRange] = useState(null);

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
      // Default columns based on target type
      let defaultColumns = [];

      if (selectedTarget === 'Hospital Admissions (count)') {
        defaultColumns = [
          'Total COVID-19 Admissions',
          'Total Influenza Admissions',
          'Total RSV Admissions'
        ];
      } else if (selectedTarget === 'Hospital Admissions (rates)') {
        defaultColumns = [
          'Total number of COVID-19 Admissions per 100,000 population',
          'Total number of Influenza Admissions per 100,000 population',
          'Total number of RSV Admissions per 100,000 population'
        ];
      } else if (selectedTarget === 'Hospital Admissions (%)') {
        defaultColumns = [
          'Percent Adult COVID-19 Admissions',
          'Percent Adult Influenza Admissions',
          'Percent Adult RSV Admissions'
        ];
      } else if (selectedTarget === 'Bed Capacity (count)') {
        defaultColumns = [
          'Number of Inpatient Beds',
          'Number of Inpatient Beds Occupied'
        ];
      } else if (selectedTarget === 'Bed Capacity (%)') {
        defaultColumns = [
          'Percent Inpatient Beds Occupied'
        ];
      }

      const filteredDefaults = defaultColumns.filter(col => filtered.includes(col));
      newSelectedCols = filteredDefaults.length > 0 ? filteredDefaults : [filtered[0]];
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

    // Default columns based on target type
    let defaultColumnsArray = [];

    if (selectedTarget === 'Hospital Admissions (count)') {
      defaultColumnsArray = [
        'Total COVID-19 Admissions',
        'Total Influenza Admissions',
        'Total RSV Admissions'
      ];
    } else if (selectedTarget === 'Hospital Admissions (rates)') {
      defaultColumnsArray = [
        'Total number of COVID-19 Admissions per 100,000 population',
        'Total number of Influenza Admissions per 100,000 population',
        'Total number of RSV Admissions per 100,000 population'
      ];
    } else if (selectedTarget === 'Hospital Admissions (%)') {
      defaultColumnsArray = [
        'Percent Adult COVID-19 Admissions',
        'Percent Adult Influenza Admissions',
        'Percent Adult RSV Admissions'
      ];
    } else if (selectedTarget === 'Bed Capacity (count)') {
      defaultColumnsArray = [
        'Number of Inpatient Beds',
        'Number of Inpatient Beds Occupied'
      ];
    } else if (selectedTarget === 'Bed Capacity (%)') {
      defaultColumnsArray = [
        'Percent Inpatient Beds Occupied'
      ];
    }

    const filteredDefaults = defaultColumnsArray.filter(col => filteredCols.includes(col));
    const defaultColumns = filteredDefaults.length > 0 ? filteredDefaults : (filteredCols.length > 0 ? [filteredCols[0]] : []);
    
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

  // Calculate y-axis range based on visible x-axis range
  const calculateYRange = (traces, xRange) => {
    if (!traces || traces.length === 0 || !xRange) return null;

    let maxY = -Infinity;
    const [startX, endX] = xRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);

    traces.forEach(trace => {
      if (!trace.x || !trace.y) return;
      for (let i = 0; i < trace.x.length; i++) {
        const pointDate = new Date(trace.x[i]);
        if (pointDate >= startDate && pointDate <= endDate) {
          const value = Number(trace.y[i]);
          if (!isNaN(value)) {
            maxY = Math.max(maxY, value);
          }
        }
      }
    });

    if (maxY !== -Infinity) {
      const padding = maxY * 0.15;
      return [0, maxY + padding];
    }
    return null;
  };

  // Recalculate y-axis when data or x-range changes
  useEffect(() => {
    if (!data || selectedColumns.length === 0) {
      setYAxisRange(null);
      return;
    }

    const isPercentage = selectedTarget && selectedTarget.includes('%');
    const traces = selectedColumns.map((column) => {
      const yValues = data.series[column];
      const processedYValues = isPercentage ? yValues.map(val => val !== null && val !== undefined ? val * 100 : val) : yValues;
      return {
        x: data.series.dates,
        y: processedYValues
      };
    });

    const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
    const twoWeeksAfter = new Date(lastDate);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);
    const sixMonthsAgo = new Date(lastDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const defaultRange = [sixMonthsAgo.toISOString().split('T')[0], twoWeeksAfter.toISOString().split('T')[0]];
    const currentXRange = xAxisRange || defaultRange;

    const newYRange = calculateYRange(traces, currentXRange);
    if (newYRange) {
      setYAxisRange(newYRange);
    }
  }, [data, selectedColumns, xAxisRange, selectedTarget]);

  const handleRelayout = (figure) => {
    if (figure && figure['xaxis.range']) {
      const newXRange = figure['xaxis.range'];
      if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) {
        setXAxisRange(newXRange);
      }
    }
  };

  if (loading) return <Center p="md"><Stack align="center"><Loader /><Text>Loading NHSN data...</Text></Stack></Center>;
  if (error) return <Center p="md"><Alert color="red">Error: {error}</Alert></Center>;
  if (!data) return <Center p="md"><Text>No NHSN data available for this location</Text></Center>;

  const isPercentage = selectedTarget && selectedTarget.includes('%');
  const traces = selectedColumns.map((column) => {
    const columnIndex = filteredAvailableColumns.indexOf(column);
    const yValues = data.series[column];
    const processedYValues = isPercentage ? yValues.map(val => val !== null && val !== undefined ? val * 100 : val) : yValues;

    return {
      x: data.series.dates,
      y: processedYValues,
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
        visible: true,
        range: (() => {
          const firstDate = data.series.dates[0];
          const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
          const twoWeeksAfter = new Date(lastDate);
          twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);
          return [firstDate, twoWeeksAfter.toISOString().split('T')[0]];
        })()
      },
      rangeselector: {
        buttons: [
          {
            count: 1,
            label: '1m',
            step: 'month',
            stepmode: 'backward'
          },
          {
            count: 6,
            label: '6m',
            step: 'month',
            stepmode: 'backward'
          },
          {
            count: 1,
            label: '1y',
            step: 'year',
            stepmode: 'backward'
          },
          {
            step: 'all',
            label: 'All'
          }
        ],
        activecolor: colorScheme === 'dark' ? '#4c6ef5' : '#228be6',
        bgcolor: colorScheme === 'dark' ? '#2c2e33' : '#f1f3f5'
      },
      range: (() => {
        const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
        const twoWeeksAfter = new Date(lastDate);
        twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);

        const sixMonthsAgo = new Date(lastDate);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        return [sixMonthsAgo.toISOString().split('T')[0], twoWeeksAfter.toISOString().split('T')[0]];
      })()
    },
    yaxis: {
      title: nhsnYAxisLabelMap[selectedTarget] || 'Value',
      range: yAxisRange
    },
    height: 600,
    showlegend: selectedColumns.length < 15, // Show legend only when fewer than 15 columns selected
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
    margin: { t: 40, r: 10, l: 60, b: 120 },
    uirevision: plotRevision
  };

  return (
    <Stack gap="md" w="100%">
      <LastFetched timestamp={metadata?.last_updated} />

      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToAdd: ['resetScale2d']
        }}
        style={{ width: '100%', marginBottom: '-20px' }}
        revision={dataRevision}
        onRelayout={handleRelayout}
      />

      <NHSNColumnSelector
        availableColumns={filteredAvailableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        nameMap={nhsnNameToPrettyNameMap}
        selectedTarget={selectedTarget}
        availableTargets={availableTargets}
        onTargetChange={setSelectedTarget}
        loading={loading}
      />
    </Stack>
  );
};

export default NHSNRawView;