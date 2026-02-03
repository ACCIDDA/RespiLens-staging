import { useMemo, useState, useEffect } from 'react';
import { Card, Stack, Group, Title, Text, Loader, Button } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import { getDataPath } from '../utils/paths';
import { useView } from '../hooks/useView';

const DEFAULT_COLS = ['Total COVID-19 Admissions', 'Total Influenza Admissions', 'Total RSV Admissions'];

const PATHOGEN_COLORS = {
  'Total COVID-19 Admissions': '#e377c2',  
  'Total Influenza Admissions': '#1f77b4', 
  'Total RSV Admissions': '#7f7f7f'       
};

const NHSNOverviewGraph = ( {location} ) => {
  const { setViewType, viewType: activeViewType } = useView(); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolvedLocation = location || 'US';
  const isActive = activeViewType === 'nhsn';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(getDataPath(`nhsn/${resolvedLocation}_nhsn.json`));
        
        if (!response.ok) {
           throw new Error('Data not available');
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch NHSN snapshot", err);
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedLocation]);

  const { traces, layout } = useMemo(() => {
    if (!data || !data.series) return { traces: [], layout: {} };

    const activeTraces = DEFAULT_COLS.map((col) => {
      const yData = data.series[col];
      if (!yData) return null;

      return {
        x: data.series.dates,
        y: yData,
        name: col.replace('Total ', '').replace(' Admissions', ''),
        type: 'scatter',
        mode: 'lines',
        line: { 
          color: PATHOGEN_COLORS[col], 
          width: 2 
        },
        hovertemplate: '%{y}<extra></extra>'
      };
    }).filter(Boolean);

    const dates = data.series.dates;
    const lastDate = new Date(dates[dates.length - 1]);
    const twoMonthsAgo = new Date(lastDate);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const layoutConfig = {
      height: 280,
      margin: { l: 40, r: 20, t: 10, b: 40 },
      xaxis: {
        range: [twoMonthsAgo.toISOString().split('T')[0], lastDate.toISOString().split('T')[0]],
        showgrid: false,
        tickfont: { size: 10 }
      },
      yaxis: { 
        automargin: true, 
        tickfont: { size: 10 },
        fixedrange: true,
      },
      showlegend: true,
      legend: { 
        orientation: 'h', 
        y: -0.2, 
        x: 0.5, 
        xanchor: 'center', 
        font: { size: 9 } 
      },
      hovermode: 'x unified'
    };

    return { traces: activeTraces, layout: layoutConfig };
  }, [data]);

  const locationLabel = resolvedLocation === 'US' ? 'US national view' : resolvedLocation;

  return (
    <Card withBorder radius="md" padding="lg" shadow="xs">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={5}>NHSN data</Title>
        </Group>

        {loading && (
          <Stack align="center" py="lg" gap="xs">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">Loading CDC data...</Text>
          </Stack>
        )}

        {!loading && error && (
          <Stack align="center" py="lg" h={280} justify="center">
            <Text size="sm" c="red">No NHSN data for {resolvedLocation}</Text>
          </Stack>
        )}

        {!loading && !error && traces.length > 0 && (
          <Plot
            style={{ width: '100%', height: '100%' }}
            data={traces}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
          />
        )}

        <Group justify="space-between" align="center" mt="auto">
          <Button
            size="xs"
            variant={isActive ? 'light' : 'filled'}
            onClick={() => setViewType('nhsn')}
            rightSection={<IconChevronRight size={14} />}
          >
            {isActive ? 'Viewing' : 'View NHSN data'}
          </Button>
          <Text size="xs" c="dimmed">{locationLabel}</Text>
        </Group>
      </Stack>
    </Card>
  );
};

export default NHSNOverviewGraph;