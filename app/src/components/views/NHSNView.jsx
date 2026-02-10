import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack, Alert, Text, Center, useMantineColorScheme, Loader } from '@mantine/core';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly'; 
import { getDataPath } from '../../utils/paths';
import NHSNColumnSelector from '../NHSNColumnSelector';
import TitleRow from '../TitleRow';
import { MODEL_COLORS } from '../../config/datasets';
import { buildSqrtTicks, getYRangeFromTraces } from '../../utils/scaleUtils';
import { useView } from '../../hooks/useView';
import { getDatasetTitleFromView } from '../../utils/datasetUtils';
import { buildPlotDownloadName } from '../../utils/plotDownloadName';
import {
  nhsnTargetsToColumnsMap, // groupings
  nhsnNameToSlugMap, // { longform: shortform } map
  nhsnSlugToNameMap,   // { shortform: longform } map
  nhsnNameToPrettyNameMap // { longform: presentable name } map
} from '../../utils/mapUtils';


const nhsnYAxisLabelMap = {
  'Hospital Admissions (count)': 'Patient Count',
  'Hospital Admissions (rates)': 'Rate per 100k',
  'Hospital Admissions (%)': 'Percent (%)',
  'Bed Capacity (count)': 'Bed Count',
  'Bed Capacity (%)': 'Percent (%)'
};

// Helper function to get default columns for a given target
const getDefaultColumnsForTarget = (target) => {
  const defaultsMap = {
    'Hospital Admissions (count)': ['Total COVID-19 Admissions', 'Total Influenza Admissions', 'Total RSV Admissions'],
    'Hospital Admissions (rates)': ['Total number of COVID-19 Admissions per 100,000 population', 'Total number of Influenza Admissions per 100,000 population', 'Total number of RSV Admissions per 100,000 population'],
    'Hospital Admissions (%)': ['Percent Adult COVID-19 Admissions', 'Percent Adult Influenza Admissions', 'Percent Adult RSV Admissions'],
    'Bed Capacity (count)': ['Number of Inpatient Beds', 'Number of Inpatient Beds Occupied'],
    'Bed Capacity (%)': ['Percent Inpatient Beds Occupied']
  };
  return defaultsMap[target] || [];
};

const NHSNView = ({ location }) => {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();
  const { viewType, chartScale, showLegend } = useView();
  const stateName = data?.metadata?.location_name;
  const hubName = getDatasetTitleFromView(viewType) || metadata?.dataset;

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

  const plotRef = useRef(null);
  const isResettingRef = useRef(false);

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
        setXAxisRange(null); 
        setYAxisRange(null);
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
        setMetadata(jsonMetadata);
        
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
    if (loading || availableTargets.length === 0) {
      return;
    }
    const urlTarget = searchParams.get('nhsn_target');
    const newTarget = (urlTarget && availableTargets.includes(urlTarget))
      ? urlTarget
      : availableTargets[0];
    
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

    const urlSlugs = searchParams.getAll('nhsn_cols');
    const validUrlCols = urlSlugs
      .map(slug => nhsnSlugToNameMap[slug])
      .filter(colName => colName && filtered.includes(colName));

    let newSelectedCols;
    if (validUrlCols.length > 0) {
      newSelectedCols = validUrlCols;
    } else if (filtered.length > 0) {
      const defaultColumns = getDefaultColumnsForTarget(selectedTarget);
      const filteredDefaults = defaultColumns.filter(col => filtered.includes(col));
      newSelectedCols = filteredDefaults.length > 0 ? filteredDefaults : [filtered[0]];
    } else {
      newSelectedCols = [];
    }

    setSelectedColumns(currentCols => {
      const newSorted = [...newSelectedCols].sort();
      const currentSorted = [...currentCols].sort();
      if (JSON.stringify(newSorted) !== JSON.stringify(currentSorted)) return newSelectedCols;
      return currentCols;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedTarget, allDataColumns]);

  useEffect(() => {
    if (loading || !selectedTarget || availableTargets.length === 0 || allDataColumns.length === 0) {
      return;
    }
    const currentSearch = window.location.search;
    const newParams = new URLSearchParams(currentSearch);
    const defaultTarget = availableTargets[0];
    if (selectedTarget && selectedTarget !== defaultTarget) newParams.set('nhsn_target', selectedTarget);
    else newParams.delete('nhsn_target'); 

    const columnsForTarget = nhsnTargetsToColumnsMap[selectedTarget] || [];
    const filteredCols = allDataColumns.filter(col => columnsForTarget.includes(col));
    const defaultColumnsArray = getDefaultColumnsForTarget(selectedTarget);
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
      newParams.delete('nhsn_cols');
    }
    if (newParams.toString() !== new URLSearchParams(currentSearch).toString()) {
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedTarget, selectedColumns, allDataColumns, availableTargets, loading, setSearchParams]);

  useEffect(() => {
    if (data) setPlotRevision(p => p + 1);
  }, [data, selectedTarget]); 

  useEffect(() => {
    if(data) setDataRevision(d => d + 1);
  }, [data, selectedColumns, selectedTarget]);

  const getFullXRange = useCallback(() => {
    if (!data) return [null, null];
    const firstDate = data.series.dates[0];
    const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
    const twoWeeksAfter = new Date(lastDate);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);
    return [firstDate, twoWeeksAfter.toISOString().split('T')[0]];
  }, [data]);

  const getDefaultXRange = useCallback(() => {
    if (!data) return [null, null];
    const lastDate = new Date(data.series.dates[data.series.dates.length - 1]);
    
    const twoWeeksAfter = new Date(lastDate);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);

    const sixMonthsAgo = new Date(lastDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return [sixMonthsAgo.toISOString().split('T')[0], twoWeeksAfter.toISOString().split('T')[0]];
  }, [data]);

  const defaultRange = useMemo(() => getDefaultXRange(), [getDefaultXRange]);
  const fullRange = useMemo(() => getFullXRange(), [getFullXRange]);

  useEffect(() => {
    setXAxisRange(null); 
  }, [selectedTarget]);

  const calculateYRange = useCallback((traces, xRange) => {
    if (!traces || traces.length === 0 || !xRange || !xRange[0]) return null;

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
  }, []); 

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

    const currentXRange = xAxisRange || defaultRange; 

    if (!currentXRange || currentXRange[0] === null) {
      setYAxisRange(null); 
      return;
    }

    const newYRange = calculateYRange(traces, currentXRange);
    if (chartScale === 'sqrt' && newYRange) {
      const [minY, maxY] = newYRange;
      const sqrtMin = Math.sqrt(Math.max(0, minY));
      const sqrtMax = Math.sqrt(Math.max(0, maxY));
      setYAxisRange([sqrtMin, sqrtMax]);
    } else {
      setYAxisRange(newYRange); 
    }

  }, [data, selectedColumns, xAxisRange, selectedTarget, defaultRange, calculateYRange, chartScale]);

  const handleRelayout = useCallback((figure) => {
    if (isResettingRef.current) {
      isResettingRef.current = false; 
      return;
    }
    if (figure && figure['xaxis.range']) {
      const newXRange = figure['xaxis.range'];
      if (JSON.stringify(newXRange) !== JSON.stringify(xAxisRange)) {
        setXAxisRange(newXRange);
      }
    }
  }, [xAxisRange]);


  const rawTraces = useMemo(() => {
    if (!data) return []; 
    const isPercentage = selectedTarget && selectedTarget.includes('%');
    return selectedColumns.map((column) => {
      const yValues = data.series[column];
      const processedYValues = isPercentage ? yValues.map(val => val !== null && val !== undefined ? val * 100 : val) : yValues;
      return {
        x: data.series.dates,
        y: processedYValues,
        name: column
      };
    });
  }, [data, selectedTarget, selectedColumns]);

  const rawYRange = useMemo(() => getYRangeFromTraces(rawTraces), [rawTraces]);

  const sqrtTicks = useMemo(() => {
    if (chartScale !== 'sqrt') return null;
    return buildSqrtTicks({ rawRange: rawYRange });
  }, [chartScale, rawYRange]);

  const traces = useMemo(() => {
    if (!data) return []; 
    const applySqrt = chartScale === 'sqrt';

    return rawTraces.map((trace) => {
      const columnIndex = filteredAvailableColumns.indexOf(trace.name);
      const transformedY = applySqrt
        ? trace.y.map(val => (val === null || val === undefined ? val : Math.sqrt(Math.max(0, val))))
        : trace.y;

      return {
        x: trace.x,
        y: transformedY,
        name: trace.name,
        type: 'scatter',
        mode: 'lines+markers',
        line: {
          color: MODEL_COLORS[columnIndex % MODEL_COLORS.length],
          width: 2
        },
        marker: { size: 6 }
      };
    });
  }, [data, rawTraces, filteredAvailableColumns, chartScale]);

  const layout = useMemo(() => ({
    autosize: true,
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
        range: fullRange, 
      },
      rangeselector: {
        buttons: [
          { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
          { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
          { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
          { step: 'all', label: 'All' }
        ],
        activecolor: colorScheme === 'dark' ? '#4c6ef5' : '#228be6',
        bgcolor: colorScheme === 'dark' ? '#2c2e33' : '#f1f3f5'
      },
      range: xAxisRange || defaultRange, 
    },
    yaxis: {
      title: nhsnYAxisLabelMap[selectedTarget] || 'Value',
      range: chartScale === 'log' ? undefined : yAxisRange, 
      autorange: chartScale === 'log' ? true : yAxisRange === null,
      type: chartScale === 'log' ? 'log' : 'linear',
      tickmode: chartScale === 'sqrt' && sqrtTicks ? 'array' : undefined,
      tickvals: chartScale === 'sqrt' && sqrtTicks ? sqrtTicks.tickvals : undefined,
      ticktext: chartScale === 'sqrt' && sqrtTicks ? sqrtTicks.ticktext : undefined
    },
    showlegend: showLegend ?? selectedColumns.length < 15,
    legend: {
      x: 0,
      y: 1,
      xanchor: 'left',
      yanchor: 'top',
      bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
      borderwidth: 1,
      font: { size: 10 }
    },
    margin: { t: 40, r: 10, l: 60, b: 120 },
    uirevision: plotRevision
  }), [
    colorScheme, 
    fullRange, 
    defaultRange, 
    xAxisRange, 
    yAxisRange, 
    chartScale,
    showLegend,
    selectedTarget, 
    selectedColumns.length, 
    plotRevision,
    sqrtTicks
  ]);

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    showSendToCloud: false,
    plotlyServerURL: "",
    toImageButtonOptions: {
      format: 'png',
      filename: buildPlotDownloadName('nhsn-plot')
    },
    modeBarButtonsToRemove: ['resetScale2d', 'select2d', 'lasso2d'], 
    modeBarButtonsToAdd: [{
      name: 'Reset view', 
      icon: Plotly.Icons.home,
      click: function(gd) {
        if (!data) return; 
        
        const newDefaultRange = getDefaultXRange(); 
        if (!newDefaultRange || newDefaultRange[0] === null) return;

        const isPct = selectedTarget && selectedTarget.includes('%');
        const currentTraces = selectedColumns.map((column) => {
          const yValues = data.series[column];
          const pYValues = isPct ? yValues.map(val => val !== null && val !== undefined ? val * 100 : val) : yValues;
          return { x: data.series.dates, y: pYValues };
        });
        
        const newYRange = calculateYRange(currentTraces, newDefaultRange);
        
        isResettingRef.current = true; 
        setXAxisRange(null); 
        setYAxisRange(newYRange); 

        Plotly.relayout(gd, {
          'xaxis.range': newDefaultRange,
          'yaxis.range': newYRange,
          'yaxis.autorange': newYRange === null
        });
      }
    }]
  }), [data, selectedTarget, selectedColumns, getDefaultXRange, calculateYRange]);

  if (loading) return <Center p="md"><Stack align="center"><Loader /><Text>Loading NHSN data...</Text></Stack></Center>;
  if (error) return <Center p="md"><Alert color="red">Error: {error}</Alert></Center>;
  if (!data) return <Center p="md"><Text>No NHSN data available for this location</Text></Center>;

  return (
    <Stack gap="md" w="100%">
      <TitleRow
        title={hubName ? `${stateName} — ${hubName}` : stateName}
        timestamp={metadata?.last_updated}
      />
      <div style={{ width: '100%', height: 'min(700px, 65vh)', minHeight: 360 }}>
        <Plot
          ref={plotRef}
          useResizeHandler
          data={traces}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          revision={dataRevision}
          onRelayout={handleRelayout}
        />
      </div>

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

export default NHSNView;
