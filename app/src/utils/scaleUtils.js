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

export { getYRangeFromTraces, buildSqrtTicks };
