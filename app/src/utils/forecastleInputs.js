import { FORECASTLE_CONFIG } from '../config';

const buildPoissonInterval = (mean, zScore) => {
  if (!Number.isFinite(mean) || mean <= 0) {
    return { width: 0 };
  }
  const sd = Math.sqrt(mean);
  const width = Math.round(zScore * sd);
  return { width };
};

export const initialiseForecastInputs = (horizons = [], baselineValue = 0) => {
  const mean = Number.isFinite(baselineValue) && baselineValue > 0 ? baselineValue : 0;
  const interval95 = buildPoissonInterval(mean, FORECASTLE_CONFIG.confidence.zScore95);
  const interval50 = buildPoissonInterval(mean, FORECASTLE_CONFIG.confidence.zScore50);

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
  return entries.map(entry => ({
    horizon: entry.horizon,
    interval50: {
      // Use asymmetric bounds if available, otherwise fall back to symmetric widths
      lower: entry.lower50 !== undefined ? entry.lower50 : Math.max(0, entry.median - entry.width50),
      upper: entry.upper50 !== undefined ? entry.upper50 : entry.median + entry.width50,
    },
    interval95: {
      lower: entry.lower95 !== undefined ? entry.lower95 : Math.max(0, entry.median - entry.width95),
      upper: entry.upper95 !== undefined ? entry.upper95 : entry.median + entry.width95,
    },
  }));
};
