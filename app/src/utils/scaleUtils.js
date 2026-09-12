const getYRangeFromTraces = (traces) => {
  if (!Array.isArray(traces)) return null;
  let minY = Infinity;
  let maxY = -Infinity;

  traces.forEach((trace) => {
    if (!Array.isArray(trace?.y)) return;
    trace.y.forEach((value) => {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      minY = Math.min(minY, numeric);
      maxY = Math.max(maxY, numeric);
    });
  });

  if (minY === Infinity || maxY === -Infinity) return null;
  return [minY, maxY];
};

const DEFAULT_CHART_SCALE = "linear";
const SUPPORTED_CHART_SCALES = new Set(["linear", "log10", "log2", "sqrt"]);

const normalizeChartScale = (scale) => {
  if (scale === "log") return "log10";
  return SUPPORTED_CHART_SCALES.has(scale) ? scale : DEFAULT_CHART_SCALE;
};

const isPlotlyLogScale = (scale) => normalizeChartScale(scale) === "log10";

const getScaleTitleSuffix = (scale) => {
  const normalizedScale = normalizeChartScale(scale);
  if (normalizedScale === "log10") return " (log10)";
  if (normalizedScale === "log2") return " (log2)";
  if (normalizedScale === "sqrt") return " (sqrt)";
  return "";
};

const transformValueForScale = (value, scale) => {
  if (value === null || value === undefined) return value;

  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;

  const normalizedScale = normalizeChartScale(scale);

  if (normalizedScale === "sqrt") {
    return Math.sqrt(Math.max(0, numeric));
  }

  if (normalizedScale === "log2") {
    return numeric > 0 ? Math.log2(numeric) : null;
  }

  return numeric;
};

const buildSqrtTicks = ({
  rawRange,
  tickCount = 5,
  formatValue = (value) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
}) => {
  if (!rawRange || rawRange.length !== 2) return null;
  const [rawMin, rawMax] = rawRange;
  if (rawMax <= 0) return null;

  const minValue = Math.max(0, rawMin);
  const maxValue = Math.max(minValue, rawMax);
  const sqrtMin = Math.sqrt(minValue);
  const sqrtMax = Math.sqrt(maxValue);

  if (sqrtMax === sqrtMin) {
    const tickValue = sqrtMax;
    const rawTick = tickValue ** 2;
    return {
      tickvals: [tickValue],
      ticktext: [formatValue(rawTick)],
    };
  }

  const steps = Math.max(2, tickCount);
  const step = (sqrtMax - sqrtMin) / (steps - 1);
  const tickvals = [];
  const ticktext = [];

  for (let i = 0; i < steps; i += 1) {
    const tickValue = sqrtMin + step * i;
    const rawTick = tickValue ** 2;
    tickvals.push(tickValue);
    ticktext.push(formatValue(rawTick));
  }

  return { tickvals, ticktext };
};

const buildLog2Ticks = ({
  rawRange,
  maxTickCount = 6,
  formatValue = (value) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
}) => {
  if (!rawRange || rawRange.length !== 2) return null;

  const [rawMin, rawMax] = rawRange;
  if (rawMax <= 0) return null;

  const minValue = Math.max(Number.MIN_VALUE, rawMin);
  const maxValue = Math.max(minValue, rawMax);

  const startExponent = Math.floor(Math.log2(minValue));
  const endExponent = Math.ceil(Math.log2(maxValue));

  if (!Number.isFinite(startExponent) || !Number.isFinite(endExponent)) {
    return null;
  }

  const exponentCount = endExponent - startExponent + 1;
  const step = Math.max(1, Math.ceil(exponentCount / maxTickCount));
  const tickvals = [];
  const ticktext = [];

  for (
    let exponent = startExponent;
    exponent <= endExponent;
    exponent += step
  ) {
    const rawTick = 2 ** exponent;
    tickvals.push(exponent);
    ticktext.push(formatValue(rawTick));
  }

  if (tickvals[tickvals.length - 1] !== endExponent) {
    const rawTick = 2 ** endExponent;
    tickvals.push(endExponent);
    ticktext.push(formatValue(rawTick));
  }

  return { tickvals, ticktext };
};

export {
  DEFAULT_CHART_SCALE,
  SUPPORTED_CHART_SCALES,
  normalizeChartScale,
  isPlotlyLogScale,
  getScaleTitleSuffix,
  transformValueForScale,
  getYRangeFromTraces,
  buildSqrtTicks,
  buildLog2Ticks,
};
