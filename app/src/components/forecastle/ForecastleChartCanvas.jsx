import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarElement,
  BarController,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  Tooltip,
  Legend,
);

const INTERVAL95_COLOR = 'rgba(199, 241, 17, 0.35)'; // #c7f111 with alpha
const INTERVAL50_COLOR = 'rgba(199, 241, 17, 0.65)';
const HANDLE_OUTLINE = '#000000';
const HANDLE_FILL = '#c7f111';
const LINE_COLOR = '#000000';

const buildLabels = (groundTruthSeries, horizonDates) => {
  const observedLabels = groundTruthSeries.map((entry) => entry.date);
  const seen = new Set(observedLabels);
  horizonDates.forEach((date) => {
    if (!seen.has(date)) {
      observedLabels.push(date);
      seen.add(date);
    }
  });
  return observedLabels;
};

const ForecastleChartCanvasInner = ({
  groundTruthSeries,
  horizonDates,
  entries,
  maxValue,
  onAdjust,
  height = 380,
}) => {
  const chartRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  const labels = useMemo(() => buildLabels(groundTruthSeries, horizonDates), [groundTruthSeries, horizonDates]);

  const observedDataset = useMemo(() => {
    const valueMap = new Map(groundTruthSeries.map((entry) => [entry.date, entry.value]));
    return labels.map((label) => {
      if (valueMap.has(label)) {
        return { x: label, y: valueMap.get(label) ?? null };
      }
      return { x: label, y: null };
    });
  }, [groundTruthSeries, labels]);

  const interval95Data = useMemo(
    () =>
      horizonDates.map((date, idx) => ({
        x: date,
        y: [entries[idx]?.interval95.lower ?? 0, entries[idx]?.interval95.upper ?? 0],
      })),
    [entries, horizonDates],
  );

  const interval50Data = useMemo(
    () =>
      horizonDates.map((date, idx) => ({
        x: date,
        y: [entries[idx]?.interval50.lower ?? 0, entries[idx]?.interval50.upper ?? 0],
      })),
    [entries, horizonDates],
  );

  const handlePoints = useMemo(() => {
    const points = [];
    horizonDates.forEach((date, idx) => {
      const entry = entries[idx];
      if (!entry) return;
      points.push({
        x: date,
        y: entry.interval95.upper,
        meta: { index: idx, band: 'interval95', edge: 'upper' },
        radius: 7,
      });
      points.push({
        x: date,
        y: entry.interval95.lower,
        meta: { index: idx, band: 'interval95', edge: 'lower' },
        radius: 7,
      });
      points.push({
        x: date,
        y: entry.interval50.upper,
        meta: { index: idx, band: 'interval50', edge: 'upper' },
        radius: 6,
      });
      points.push({
        x: date,
        y: entry.interval50.lower,
        meta: { index: idx, band: 'interval50', edge: 'lower' },
        radius: 6,
      });
    });
    return points;
  }, [entries, horizonDates]);

  const handleIndicesRef = useRef([]);
  useEffect(() => {
    handleIndicesRef.current = handlePoints.map((point) => point.meta);
  }, [handlePoints]);

  const dynamicMax = useMemo(() => {
    const entryMax = Math.max(
      maxValue,
      ...entries.map((entry) => Math.max(entry.interval95.upper, entry.interval50.upper)),
    );
    return entryMax > 0 ? entryMax * 1.1 : 1;
  }, [entries, maxValue]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;

    const canvas = chart.canvas;
    if (!canvas) return undefined;

    const getBandMeta = (activeElement) => {
      if (!activeElement || activeElement.datasetIndex !== 3) return null;
      const meta = handleIndicesRef.current[activeElement.index];
      return meta || null;
    };

    let animationFrame = null;
    const pointerMove = (event) => {
      if (!dragState) return;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const yScale = chart.scales.y;
        const bounds = canvas.getBoundingClientRect();
        const offsetY = event.clientY - bounds.top;
        const nextValue = yScale.getValueForPixel(offsetY);
        onAdjust(dragState.index, dragState.band, dragState.edge, nextValue);
      });
    };

    const pointerUp = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      setDragState(null);
    };

    const pointerDown = (event) => {
      const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
      if (!elements?.length) {
        setDragState(null);
        return;
      }
      const meta = getBandMeta(elements[0]);
      if (!meta) {
        setDragState(null);
        return;
      }
      event.preventDefault();
      setDragState(meta);
    };

    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
    };
  }, [dragState, onAdjust]);

  const chartData = useMemo(
    () => ({
      datasets: [
        {
          type: 'line',
          label: 'Observed',
          data: observedDataset,
          parsing: false,
          tension: 0.2,
          spanGaps: true,
          borderColor: LINE_COLOR,
          backgroundColor: LINE_COLOR,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          type: 'bar',
          label: '95% interval',
          data: interval95Data,
          parsing: {
            xAxisKey: 'x',
            yAxisKey: 'y',
          },
          backgroundColor: INTERVAL95_COLOR,
          borderColor: 'rgba(199, 241, 17, 0.55)',
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        },
        {
          type: 'bar',
          label: '50% interval',
          data: interval50Data,
          parsing: {
            xAxisKey: 'x',
            yAxisKey: 'y',
          },
          backgroundColor: INTERVAL50_COLOR,
          borderColor: 'rgba(199, 241, 17, 0.8)',
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.35,
          categoryPercentage: 0.8,
        },
        {
          type: 'scatter',
          label: 'Handles',
          data: handlePoints,
          parsing: false,
          pointBackgroundColor: (context) => {
            const meta = handlePoints[context.dataIndex]?.meta;
            if (!meta) return HANDLE_FILL;
            return meta.band === 'interval95' ? HANDLE_FILL : '#7a8f00';
          },
          pointBorderColor: HANDLE_OUTLINE,
          pointBorderWidth: 2,
          pointHoverRadius: (context) => handlePoints[context.dataIndex]?.radius ?? 6,
          pointRadius: (context) => handlePoints[context.dataIndex]?.radius ?? 6,
          showLine: false,
          hitRadius: 12,
        },
      ],
      labels,
    }),
    [handlePoints, interval50Data, interval95Data, labels, observedDataset],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: true,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const datasetLabel = context.dataset.label || '';
              if (datasetLabel === 'Observed') {
                return `${datasetLabel}: ${context.parsed.y?.toLocaleString('en-US') ?? '—'}`;
              }
              if (datasetLabel.includes('interval')) {
                if (Array.isArray(context.raw?.y)) {
                  const [lower, upper] = context.raw.y;
                  return `${datasetLabel}: ${Math.round(lower)} – ${Math.round(upper)}`;
                }
                return datasetLabel;
              }
              if (datasetLabel === 'Handles') {
                return `${Math.round(context.parsed.y)}`;
              }
              return datasetLabel;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'category',
          ticks: {
            color: '#000000',
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: dynamicMax,
          ticks: {
            color: '#000000',
            callback: (value) => Math.round(value).toLocaleString('en-US'),
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
      layout: {
        padding: {
          right: 12,
          left: 12,
        },
      },
    }),
    [dynamicMax],
  );

  return (
    <div style={{ width: '100%', height }}>
      <Chart ref={chartRef} type="bar" data={chartData} options={options} />
    </div>
  );
};

const ForecastleChartCanvas = memo(ForecastleChartCanvasInner);
ForecastleChartCanvas.displayName = 'ForecastleChartCanvas';

export default ForecastleChartCanvas;
