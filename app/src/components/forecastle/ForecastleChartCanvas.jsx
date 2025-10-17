import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarElement,
  BarController,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  ScatterController,
  BarElement,
  BarController,
  Tooltip,
  Legend,
  Filler,
);

const INTERVAL95_COLOR = 'rgba(199, 241, 17, 0.35)';
const INTERVAL50_COLOR = 'rgba(199, 241, 17, 0.65)';
const MEDIAN_COLOR = '#000000';
const HANDLE_MEDIAN = '#c7f111';
const HANDLE_OUTLINE = '#000000';

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
  showIntervals = true,
  zoomedView = false,
  scores = null,
  showScoring = false,
  fullGroundTruthSeries = null,
}) => {
  const chartRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  // For zoomed view, only show last 3 observed data points
  const visibleGroundTruth = useMemo(() => {
    if (!zoomedView) return groundTruthSeries;
    return groundTruthSeries.slice(-3);
  }, [groundTruthSeries, zoomedView]);

  const labels = useMemo(() => buildLabels(visibleGroundTruth, horizonDates), [visibleGroundTruth, horizonDates]);

  const observedDataset = useMemo(() => {
    const valueMap = new Map(visibleGroundTruth.map((entry) => [entry.date, entry.value]));
    return labels.map((label) => {
      if (valueMap.has(label)) {
        return { x: label, y: valueMap.get(label) ?? null };
      }
      return { x: label, y: null };
    });
  }, [visibleGroundTruth, labels]);

  // Calculate interval bounds as separate upper/lower datasets for fill
  const interval95Upper = useMemo(
    () =>
      horizonDates.map((date, idx) => ({
        x: date,
        y: (entries[idx]?.median ?? 0) + (entries[idx]?.width95 ?? 0),
      })),
    [entries, horizonDates],
  );

  const interval95Lower = useMemo(
    () =>
      horizonDates.map((date, idx) => ({
        x: date,
        y: Math.max(0, (entries[idx]?.median ?? 0) - (entries[idx]?.width95 ?? 0)),
      })),
    [entries, horizonDates],
  );

  const interval50Upper = useMemo(
    () =>
      horizonDates.map((date, idx) => ({
        x: date,
        y: (entries[idx]?.median ?? 0) + (entries[idx]?.width50 ?? 0),
      })),
    [entries, horizonDates],
  );

  const interval50Lower = useMemo(
    () =>
      horizonDates.map((date, idx) => ({
        x: date,
        y: Math.max(0, (entries[idx]?.median ?? 0) - (entries[idx]?.width50 ?? 0)),
      })),
    [entries, horizonDates],
  );

  // Median line data - start from last observed point
  const medianData = useMemo(() => {
    const data = [];
    // Add the last observed point to connect the forecast line
    if (groundTruthSeries.length > 0) {
      const lastObserved = groundTruthSeries[groundTruthSeries.length - 1];
      data.push({
        x: lastObserved.date,
        y: lastObserved.value,
      });
    }
    // Add the forecast points
    horizonDates.forEach((date, idx) => {
      data.push({
        x: date,
        y: entries[idx]?.median ?? 0,
      });
    });
    return data;
  }, [entries, horizonDates, groundTruthSeries]);

  // Draggable median handles
  const medianHandles = useMemo(() => {
    return horizonDates.map((date, idx) => ({
      x: date,
      y: entries[idx]?.median ?? 0,
      meta: { index: idx, type: 'median' },
      radius: 8,
    }));
  }, [entries, horizonDates]);

  const handleIndicesRef = useRef([]);
  useEffect(() => {
    handleIndicesRef.current = medianHandles.map((point) => point.meta);
  }, [medianHandles]);

  const dynamicMax = useMemo(() => {
    if (zoomedView) {
      // In zoomed view, calculate 50% higher than the last observed data point
      const lastObserved = groundTruthSeries[groundTruthSeries.length - 1];
      const lastValue = lastObserved?.value ?? 0;

      // Also consider forecast values and ground truth in scoring mode
      const forecastMax = Math.max(
        ...entries.map((entry) => (entry.median ?? 0) + (entry.width95 ?? 0)),
      );

      let groundTruthMax = 0;
      if (showScoring && scores?.groundTruth) {
        groundTruthMax = Math.max(...scores.groundTruth.filter(v => v !== null));
      }

      // Get the maximum of all visible values
      const visibleMax = Math.max(lastValue, forecastMax, groundTruthMax);

      return visibleMax > 0 ? visibleMax * 1.5 : 1;
    }

    // In full view, use existing logic
    const entryMax = Math.max(
      maxValue,
      ...entries.map((entry) => (entry.median ?? 0) + (entry.width95 ?? 0)),
    );
    return entryMax > 0 ? entryMax * 1.1 : 1;
  }, [entries, maxValue, zoomedView, groundTruthSeries, showScoring, scores]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;

    const canvas = chart.canvas;
    if (!canvas) return undefined;

    const getHandleMeta = (activeElement) => {
      if (!activeElement) return null;
      // Find the "Median Handles" dataset - it's always the last dataset
      const chart = chartRef.current;
      const handleDatasetIndex = chart.data.datasets.findIndex(ds => ds.label === 'Median Handles');
      if (activeElement.datasetIndex !== handleDatasetIndex) return null;
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
        const nextValue = Math.max(0, yScale.getValueForPixel(offsetY));
        onAdjust(dragState.index, 'median', Math.round(nextValue));
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
      const meta = getHandleMeta(elements[0]);
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

  // Ground truth for forecast horizons (scoring mode only)
  const groundTruthForecastPoints = useMemo(() => {
    if (!showScoring || !scores?.groundTruth) return [];
    return horizonDates.map((date, idx) => ({
      x: date,
      y: scores.groundTruth[idx],
    })).filter(point => point.y !== null);
  }, [showScoring, scores, horizonDates]);

  // Top model forecasts (scoring mode only)
  const topModelForecasts = useMemo(() => {
    if (!showScoring || !scores?.models) return [];
    // Show top 3 models
    return scores.models.slice(0, 3).map((model, idx) => ({
      modelName: model.modelName,
      data: horizonDates.map((date, horizonIdx) => ({
        x: date,
        y: model.medians[horizonIdx],
      })).filter(point => point.y !== null),
      color: idx === 0 ? 'rgba(30, 144, 255, 0.8)' : // Blue for best model (likely Hub)
             idx === 1 ? 'rgba(255, 99, 71, 0.6)' : // Tomato for 2nd
             'rgba(255, 165, 0, 0.6)', // Orange for 3rd
    }));
  }, [showScoring, scores, horizonDates]);

  const chartData = useMemo(
    () => {
      const datasets = [
        {
          type: 'line',
          label: 'Observed',
          data: observedDataset,
          parsing: false,
          tension: 0, // No smoothing - straight lines between points
          spanGaps: true,
          borderColor: MEDIAN_COLOR,
          backgroundColor: MEDIAN_COLOR,
          borderWidth: 2,
          pointRadius: 4, // Show dots
          pointHoverRadius: 6,
          pointBackgroundColor: MEDIAN_COLOR,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
        },
      ];

      // Only show intervals when in interval mode - use filled areas
      if (showIntervals) {
        datasets.push(
          // 95% interval lower bound (invisible line, used for fill)
          {
            type: 'line',
            label: '95% lower',
            data: interval95Lower,
            parsing: false,
            tension: 0,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: false,
          },
          // 95% interval upper bound (fills down to previous dataset)
          {
            type: 'line',
            label: '95% interval',
            data: interval95Upper,
            parsing: false,
            tension: 0,
            borderColor: 'rgba(199, 241, 17, 0.6)',
            backgroundColor: INTERVAL95_COLOR,
            borderWidth: 2,
            pointRadius: 0,
            fill: '-1', // Fill to previous dataset (95% lower)
          },
          // 50% interval lower bound (invisible line)
          {
            type: 'line',
            label: '50% lower',
            data: interval50Lower,
            parsing: false,
            tension: 0,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: false,
          },
          // 50% interval upper bound (fills down to previous dataset)
          {
            type: 'line',
            label: '50% interval',
            data: interval50Upper,
            parsing: false,
            tension: 0,
            borderColor: 'rgba(199, 241, 17, 0.8)',
            backgroundColor: INTERVAL50_COLOR,
            borderWidth: 2,
            pointRadius: 0,
            fill: '-1', // Fill to previous dataset (50% lower)
          }
        );
      }

      // In scoring mode, show ground truth points for forecast horizons
      if (showScoring && groundTruthForecastPoints.length > 0) {
        datasets.push({
          type: 'scatter',
          label: 'Ground Truth (Forecast Period)',
          data: groundTruthForecastPoints,
          parsing: false,
          pointBackgroundColor: '#2e7d32',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        });
      }

      // User's forecast
      datasets.push({
        type: 'line',
        label: showScoring ? 'Your Forecast' : 'Median',
        data: medianData,
        parsing: false,
        tension: 0, // No smoothing - straight lines
        borderColor: showScoring ? '#c7f111' : MEDIAN_COLOR,
        backgroundColor: showScoring ? '#c7f111' : MEDIAN_COLOR,
        borderWidth: showScoring ? 4 : 3,
        pointRadius: showScoring ? 6 : 0,
        pointBackgroundColor: '#c7f111',
        pointBorderColor: '#000000',
        pointBorderWidth: 2,
        borderDash: showScoring ? [] : [5, 5],
      });

      // Top model forecasts (scoring mode only)
      if (showScoring) {
        topModelForecasts.forEach((model) => {
          datasets.push({
            type: 'line',
            label: model.modelName,
            data: model.data,
            parsing: false,
            tension: 0,
            borderColor: model.color,
            backgroundColor: model.color,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: model.color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1,
          });
        });
      }

      // Only show draggable handles when not in scoring mode
      if (!showScoring) {
        datasets.push({
          type: 'scatter',
          label: 'Median Handles',
          data: medianHandles,
          parsing: false,
          pointBackgroundColor: HANDLE_MEDIAN,
          pointBorderColor: HANDLE_OUTLINE,
          pointBorderWidth: 2,
          pointHoverRadius: 10,
          pointRadius: 8,
          showLine: false,
          hitRadius: 15,
        });
      }

      return { datasets, labels };
    },
    [medianHandles, interval50Upper, interval50Lower, interval95Upper, interval95Lower, medianData, labels, observedDataset, showIntervals, showScoring, groundTruthForecastPoints, topModelForecasts],
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
          display: showScoring,
          position: 'bottom',
          labels: {
            filter: (legendItem) => {
              // Hide helper datasets from legend
              return !legendItem.text.includes('lower') &&
                     !legendItem.text.includes('Handles');
            },
            usePointStyle: true,
            padding: 12,
            font: {
              size: 11,
            },
          },
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
              if (datasetLabel === 'Median' || datasetLabel === 'Median Handles') {
                return `Median: ${Math.round(context.parsed.y)}`;
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
    [dynamicMax, showScoring],
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
