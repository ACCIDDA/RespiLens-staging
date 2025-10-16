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
  const interval95 = buildPoissonInterval(mean, 1.96);
  const interval50 = buildPoissonInterval(mean, 0.674);

  return horizons.map((horizon) => ({
    horizon,
    median: mean,
    width95: interval95.width,
    width50: interval50.width,
  }));
};

// Helper to convert from median + widths to intervals for submission
export const convertToIntervals = (entries) => {
  return entries.map(entry => ({
    horizon: entry.horizon,
    interval50: {
      lower: Math.max(0, entry.median - entry.width50),
      upper: entry.median + entry.width50,
    },
    interval95: {
      lower: Math.max(0, entry.median - entry.width95),
      upper: entry.median + entry.width95,
    },
  }));
};
