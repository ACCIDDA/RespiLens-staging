import { useState, useEffect } from 'react';
import { Stack, Alert, Text, Center, useMantineColorScheme, Loader, Group, Title, Anchor, List } from '@mantine/core';
import Plot from 'react-plotly.js';
import { IconBrandGithub } from '@tabler/icons-react'
import { getDataPath } from '../utils/paths';
import NHSNColumnSelector from './NHSNColumnSelector';
import AboutHubOverlay from './AboutHubOverlay';
import { MODEL_COLORS } from '../config/datasets';

// --- CHANGE 1: Remove selectedColumns and setSelectedColumns from props ---
const NHSNRawView = ({ location }) => {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme } = useMantineColorScheme();
  const [availableColumns, setAvailableColumns] = useState([]);

  // --- CHANGE 2: Add state for selectedColumns inside this component ---
  const [selectedColumns, setSelectedColumns] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Reset state for new location to prevent showing old data
        setData(null);
        setMetadata(null);
        setAvailableColumns([]);
        setSelectedColumns([]);

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

        const dataColumns = Object.keys(jsonData.series)
          .filter(key => key !== 'dates')
          .sort();
        
        setAvailableColumns(dataColumns);

        // Set a default column selection when data loads ---
        if (dataColumns.length > 0) {
          // You can make this smarter, but for now, we'll select the first column by default.
          const defaultColumn = dataColumns.find(c => c.includes("COVID-19")) || dataColumns[0];
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
  }, [location]); // This effect only runs when the location changes

  // The calculateNHSNYRange function is correct and doesn't need changes.
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
    const columnIndex = availableColumns.indexOf(column);
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
      title: 'Patient count',
      range: calculateNHSNYRange()
    },
    height: 600,
    showlegend: false,
    margin: { t: 40, r: 10, l: 60, b: 120 }
  };

  const lastUpdatedTimestamp = metadata?.last_updated;
  let formattedDate = null;
  if (lastUpdatedTimestamp) {
    // Append 'Z' to treat the string as UTC and convert to local time
    const date = new Date(lastUpdatedTimestamp + 'Z'); 
    formattedDate = date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  return (
    <Stack gap="md" w="100%">
      {formattedDate && (
        <Text size="xs" c="dimmed" ta="right">
          last updated: {formattedDate}
        </Text>
      )}
      <AboutHubOverlay 
      title={
        <Group gap="sm">
          <Title order={4}>National Healthcare Safety Network (NHSN)</Title>
        </Group>
      }
      buttonLabel="About NHSN Data"
    >
      <p>
        Data for the RespiLens NHSN view comes from the CDC's <a href="https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Data-HRD-Metrics-by-Ju/ua7e-t2fy/about_data" target="_blank" rel="noopener noreferrer">National Healthcare Safety Network</a> weekly "Hosptial Respiratory Data" (HRD) dataset.
        This dataset represents metrics aggregated to national and state/territory levels beginning in August 2020. To plot data, you can select
        NHSN column(s).
      </p>
      <div>
        <Title order={4} mb="xs">Columns</Title>
        <p>
          The NHSN dataset contains ~300 columns for plotting data with a variety of scales, including hospitalization admission counts, percent of
          admissions by pathogen, hospitalization rates, number of hospitals reporting, raw bed capacity numbers, bed capacity percents, and absolute 
          percentage of change. Presently on RespiLens, you are only able to plot NHSN columns relating to raw patient counts.
        </p>
      </div>
    </AboutHubOverlay>
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