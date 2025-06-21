import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import ModelSelector from './ModelSelector';
import { getDataPath } from '../utils/paths';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ViewSelector from './ViewSelector';
import InfoOverlay from './InfoOverlay';
import { useView } from '../contexts/ViewContext';
import NHSNColumnSelector from './NHSNColumnSelector';
import { MODEL_COLORS } from '../config/datasets';

const NHSNRawView = ({ location }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentDataset } = useView();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedColumns, setSelectedColumns] = useState(() => {
    return searchParams.get('nhsn_columns')?.split(',') || ['totalconfflunewadm'];
  });
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

        // Validate the data structure
        if (!jsonData.data || !jsonData.data.official) {
          throw new Error('Invalid data format');
        }

        setData(jsonData);

        // Get available columns (only those with data)
        const officialCols = Object.keys(jsonData.data.official).sort();
        const prelimCols = Object.keys(jsonData.data.preliminary || {}).sort();

        setAvailableColumns({
          official: officialCols,
          preliminary: prelimCols
        });

        // Get columns from URL if any, otherwise select only totalconfflunewadm
        const urlColumns = searchParams.get('nhsn_columns')?.split(',').filter(Boolean);
        if (urlColumns?.length > 0) {
          const validColumns = urlColumns.filter(col =>
            officialCols.includes(col) || prelimCols.includes(col)
          );
          setSelectedColumns(validColumns);
        } else {
          // By default, select only totalconfflunewadm
          const defaultColumn = officialCols.find(col => col === 'totalconfflunewadm') || officialCols[0];
          setSelectedColumns([defaultColumn]);
        }

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

  // Update URL when columns change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedColumns.length > 0) {
      newParams.set('nhsn_columns', selectedColumns.join(','));
    } else {
      newParams.delete('nhsn_columns');
    }
    setSearchParams(newParams, { replace: true });
  }, [selectedColumns]);

  // Simple function to calculate y-range for NHSN data
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

  if (loading) return <div className="p-4">Loading NHSN data...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-4">No NHSN data available for this location</div>;

  const traces = selectedColumns.map((column, index) => {
    // Add this line to determine the data type
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
    title: `NHSN Raw Data for ${data.metadata.location_name}`,
    xaxis: {
      title: 'Date',
      rangeslider: {
        visible: true
      },
      // Set default range to show all dates
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
    showlegend: false,  // Hide legend
    margin: { t: 40, r: 10, l: 60, b: 120 }  // Adjust margins to fit everything
  };

  return (
    <div className="w-full">
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToAdd: ['resetScale2d']
        }}
        className="w-full"
      />

      <NHSNColumnSelector
        availableColumns={availableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
      />
    </div>
  );
};

export default NHSNRawView;
