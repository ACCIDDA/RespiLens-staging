import { useMemo, useState, useEffect } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { getDataPath } from '../utils/paths';
import { useView } from '../hooks/useView';
import OverviewGraphCard from './OverviewGraphCard';
import useOverviewPlot from '../hooks/useOverviewPlot';

const DEFAULT_COLS = ['Total COVID-19 Admissions', 'Total Influenza Admissions', 'Total RSV Admissions'];

const PATHOGEN_COLORS = {
  'Total COVID-19 Admissions': '#e377c2',
  'Total Influenza Admissions': '#1f77b4',
  'Total RSV Admissions': '#7f7f7f'
};

const NHSNOverviewGraph = ({ location }) => {
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
        console.error('Failed to fetch NHSN snapshot', err);
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedLocation]);

  const { buildTraces, xRange } = useMemo(() => {
    if (!data?.series?.dates) {
      return { buildTraces: () => [], xRange: null };
    }

    const dates = data.series.dates;
    const lastDateStr = dates[dates.length - 1];
    const lastDate = new Date(lastDateStr);
    const twoMonthsAgo = new Date(lastDate);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const range = [twoMonthsAgo.toISOString().split('T')[0], lastDateStr];

    const tracesBuilder = (snapshot) => DEFAULT_COLS.map((col) => {
      const yData = snapshot.series?.[col];
      if (!yData) return null;

      return {
        x: snapshot.series.dates,
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

    return { buildTraces: tracesBuilder, xRange: range };
  }, [data]);

  const { traces, layout } = useOverviewPlot({
    data,
    buildTraces,
    xRange,
    yPaddingTopRatio: 0.15,
    yPaddingBottomRatio: 0.05,
    yMinFloor: 0,
    layoutDefaults: {
      margin: { l: 45, r: 20, t: 10, b: 40 },
      showlegend: true,
      legend: {
        orientation: 'h',
        y: -0.2,
        x: 0.5,
        xanchor: 'center',
        font: { size: 9 }
      }
    }
  });

  const layoutWithFloor = useMemo(() => ({
    ...layout,
    yaxis: {
      ...layout.yaxis,
      fixedrange: true
    }
  }), [layout]);

  const locationLabel = resolvedLocation === 'US' ? 'US national view' : resolvedLocation;

  return (
    <OverviewGraphCard
      title="NHSN data"
      loading={loading}
      loadingLabel="Loading CDC data..."
      error={error}
      errorLabel={`No NHSN data for ${resolvedLocation}`}
      traces={traces}
      layout={layoutWithFloor}
      emptyLabel={null}
      actionLabel={isActive ? 'Viewing' : 'View NHSN data'}
      actionActive={isActive}
      onAction={() => setViewType('nhsn')}
      actionIcon={<IconChevronRight size={14} />}
      locationLabel={locationLabel}
    />
  );
};

export default NHSNOverviewGraph;
