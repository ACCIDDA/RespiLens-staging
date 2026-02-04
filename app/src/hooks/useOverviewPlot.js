import { useMemo } from 'react';

const DEFAULT_MARGIN = { l: 40, r: 20, t: 40, b: 40 };

const isValidDate = (dateValue) => {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime());
};

/**
 * Shared Plotly overview helper for card-sized charts.
 *
 * Responsibilities:
 * - Run a caller-provided `buildTraces(data)` to produce Plotly traces.
 * - Compute a y-axis range based on the visible x-axis window.
 * - Apply consistent layout defaults for overview cards.
 *
 * Customization points:
 * - `xRange`: restrict y-range computation to a time window.
 * - `yPaddingTopRatio` / `yPaddingBottomRatio`: asymmetric padding around min/max.
 * - `yMinFloor`: hard floor for the y-axis (set null to disable).
 * - `layoutDefaults` and `layoutOverrides` for layout customization.
 */
const useOverviewPlot = ({
  data,
  buildTraces,
  xRange = null,
  yPaddingTopRatio = 0.1,
  yPaddingBottomRatio = 0.1,
  yMinFloor = 0,
  layoutOverrides = null,
  layoutDefaults = null,
}) => {
  const traces = useMemo(() => {
    if (!data || typeof buildTraces !== 'function') return [];
    return buildTraces(data) || [];
  }, [data, buildTraces]);

  const yRange = useMemo(() => {
    if (!xRange || !Array.isArray(xRange) || xRange.length !== 2) return undefined;
    const [rangeStart, rangeEnd] = xRange;
    if (!isValidDate(rangeStart) || !isValidDate(rangeEnd)) return undefined;

    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    let minY = Infinity;
    let maxY = -Infinity;

    traces.forEach((trace) => {
      if (!trace?.x || !trace?.y) return;
      trace.x.forEach((xValue, index) => {
        const pointDate = new Date(xValue);
        if (Number.isNaN(pointDate.getTime())) return;
        if (pointDate < startDate || pointDate > endDate) return;
        const value = Number(trace.y[index]);
        if (Number.isNaN(value)) return;
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      });
    });

    if (minY === Infinity || maxY === -Infinity) return undefined;

    const spread = maxY - minY;
    const paddingTop = spread * yPaddingTopRatio;
    const paddingBottom = spread * yPaddingBottomRatio;
    const paddedMin = yMinFloor === null ? minY - paddingBottom : Math.max(yMinFloor, minY - paddingBottom);
    const paddedMax = maxY + paddingTop;

    return [paddedMin, paddedMax];
  }, [traces, xRange, yPaddingTopRatio, yPaddingBottomRatio, yMinFloor]);

  const layout = useMemo(() => {
    const baseLayout = {
      height: 280,
      margin: DEFAULT_MARGIN,
      title: { text: '', font: { size: 13 } },
      xaxis: {
        range: xRange || undefined,
        showgrid: false,
        tickfont: { size: 10 }
      },
      yaxis: {
        automargin: true,
        tickfont: { size: 10 },
        range: yRange
      },
      showlegend: false,
      hovermode: 'x unified'
    };

    const mergedLayout = layoutDefaults ? { ...baseLayout, ...layoutDefaults } : baseLayout;

    if (layoutOverrides) {
      return layoutOverrides(mergedLayout, { traces, xRange, yRange });
    }

    return mergedLayout;
  }, [xRange, yRange, layoutDefaults, layoutOverrides, traces]);

  return { traces, yRange, layout };
};

export default useOverviewPlot;
