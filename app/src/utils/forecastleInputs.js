import { FORECASTLE_CONFIG } from "../config";

const buildPoissonInterval = (mean, zScore) => {
  if (!Number.isFinite(mean) || mean <= 0) {
    return { width: 0 };
  }
  const sd = Math.sqrt(mean);
  const width = Math.round(zScore * sd);
  return { width };
};

export const initialiseForecastInputs = (horizons = [], baselineValue = 0) => {
  const mean =
    Number.isFinite(baselineValue) && baselineValue > 0 ? baselineValue : 0;
  const interval95 = buildPoissonInterval(
    mean,
    FORECASTLE_CONFIG.confidence.zScore95,
  );
  const interval50 = buildPoissonInterval(
    mean,
    FORECASTLE_CONFIG.confidence.zScore50,
  );

  return horizons.map((horizon) => ({
    horizon,
    median: mean,
    width95: interval95.width,
    width50: interval50.width,
    // For asymmetric intervals: store actual lower/upper bounds
    lower95: Math.max(0, mean - interval95.width),
    upper95: mean + interval95.width,
    lower50: Math.max(0, mean - interval50.width),
    upper50: mean + interval50.width,
  }));
};

// Helper to convert from median + widths to intervals for submission
export const convertToIntervals = (entries) => {
  return entries.map((entry) => ({
    horizon: entry.horizon,
    interval50: {
      // Use asymmetric bounds if available, otherwise fall back to symmetric widths
      lower:
        entry.lower50 !== undefined
          ? entry.lower50
          : Math.max(0, entry.median - entry.width50),
      upper:
        entry.upper50 !== undefined
          ? entry.upper50
          : entry.median + entry.width50,
    },
    interval95: {
      lower:
        entry.lower95 !== undefined
          ? entry.lower95
          : Math.max(0, entry.median - entry.width95),
      upper:
        entry.upper95 !== undefined
          ? entry.upper95
          : entry.median + entry.width95,
    },
  }));
};

export const addWeeksToDate = (dateString, weeks) => {
  const base = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return dateString;
  }
  base.setUTCDate(base.getUTCDate() + weeks * 7);
  return base.toISOString().slice(0, 10);
};

// Applies one drag on the forecast chart to an entry. Moving the median
// shifts both intervals with it; an interval drag ([lower, upper]) keeps the
// 50% interval inside the 95% one.
export const adjustForecastEntry = (entry, field, value) => {
  const nextEntry = { ...entry };

  if (field === "median") {
    const newMedian = Math.max(0, value);
    const medianShift = newMedian - entry.median;
    nextEntry.median = newMedian;

    if (entry.lower95 !== undefined && entry.upper95 !== undefined) {
      nextEntry.lower95 = Math.max(0, entry.lower95 + medianShift);
      nextEntry.upper95 = entry.upper95 + medianShift;
    }
    if (entry.lower50 !== undefined && entry.upper50 !== undefined) {
      nextEntry.lower50 = Math.max(0, entry.lower50 + medianShift);
      nextEntry.upper50 = entry.upper50 + medianShift;
    }
  } else if (field === "interval95") {
    const [lower, upper] = value;
    nextEntry.lower95 = Math.max(0, lower);
    nextEntry.upper95 = Math.max(lower, upper);
    if (nextEntry.lower50 < nextEntry.lower95)
      nextEntry.lower50 = nextEntry.lower95;
    if (nextEntry.upper50 > nextEntry.upper95)
      nextEntry.upper50 = nextEntry.upper95;
    // Widths are kept for the symmetric fallback in convertToIntervals
    nextEntry.width95 = Math.max(
      nextEntry.upper95 - entry.median,
      entry.median - nextEntry.lower95,
    );
  } else if (field === "interval50") {
    const [lower, upper] = value;
    nextEntry.lower50 = Math.max(nextEntry.lower95 || 0, lower);
    nextEntry.upper50 = Math.min(
      nextEntry.upper95 || 99999,
      Math.max(lower, upper),
    );
    nextEntry.width50 = Math.max(
      nextEntry.upper50 - entry.median,
      entry.median - nextEntry.lower50,
    );
  }

  return nextEntry;
};
