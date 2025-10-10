const buildPoissonInterval = (mean, zScore) => {
  if (!Number.isFinite(mean) || mean <= 0) {
    return { lower: 0, upper: 0 };
  }
  const sd = Math.sqrt(mean);
  const lower = Math.max(0, Math.round(mean - zScore * sd));
  const upper = Math.max(lower, Math.round(mean + zScore * sd));
  return { lower, upper };
};

export const initialiseForecastInputs = (horizons = [], baselineValue = 0) => {
  const mean = Number.isFinite(baselineValue) && baselineValue > 0 ? baselineValue : 0;
  const interval95 = buildPoissonInterval(mean, 1.96);
  const interval50 = buildPoissonInterval(mean, 0.674);

  return horizons.map((horizon) => ({
    horizon,
    interval50: { ...interval50 },
    interval95: { ...interval95 },
  }));
};
