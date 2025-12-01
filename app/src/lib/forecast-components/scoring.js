/**
 * Reusable Forecast Scoring Utilities
 * Extracted from forecastleScoring.js for use across the app
 */

/**
 * Calculate interval score for a single prediction interval
 * @param {number} observed - Observed value
 * @param {number} lower - Lower bound of prediction interval
 * @param {number} upper - Upper bound of prediction interval
 * @param {number} alpha - Alpha level (e.g., 0.5 for 50% interval, 0.05 for 95% interval)
 * @returns {Object} Interval score with components {score, dispersion, underprediction, overprediction}
 */
const calculateIntervalScore = (observed, lower, upper, alpha) => {
  if (!Number.isFinite(observed) || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    return null;
  }

  const dispersion = upper - lower;
  const underprediction = observed < lower ? (2 / alpha) * (lower - observed) : 0;
  const overprediction = observed > upper ? (2 / alpha) * (observed - upper) : 0;
  const score = dispersion + underprediction + overprediction;

  return {
    score,
    dispersion,
    underprediction,
    overprediction,
  };
};

/**
 * Calculate WIS (Weighted Interval Score) for a single forecast
 * @param {number} observed - Observed value
 * @param {number} median - Median prediction
 * @param {number} lower50 - Lower bound of 50% interval (0.25 quantile)
 * @param {number} upper50 - Upper bound of 50% interval (0.75 quantile)
 * @param {number} lower95 - Lower bound of 95% interval (0.025 quantile)
 * @param {number} upper95 - Upper bound of 95% interval (0.975 quantile)
 * @returns {Object} WIS with components {wis, dispersion, underprediction, overprediction}
 */
export const calculateWIS = (observed, median, lower50, upper50, lower95, upper95) => {
  if (!Number.isFinite(observed)) {
    return null;
  }

  // Calculate interval scores for each interval
  const interval50 = calculateIntervalScore(observed, lower50, upper50, 0.5);
  const interval95 = calculateIntervalScore(observed, lower95, upper95, 0.05);

  if (!interval50 || !interval95) {
    return null;
  }

  // Median absolute error (treated as 0-width interval)
  const medianAE = Number.isFinite(median) ? Math.abs(observed - median) : 0;

  // Weights: alpha/2 for each interval, 0.5 for median
  const weight50 = 0.5 / 2; // 0.25
  const weight95 = 0.05 / 2; // 0.025
  const weightMedian = 0.5; // 0.5

  // Weighted sum
  const totalWeight = weight50 + weight95 + weightMedian;
  const wis = (
    weight50 * interval50.score +
    weight95 * interval95.score +
    weightMedian * medianAE
  ) / totalWeight;

  // Calculate aggregate components
  const dispersion = (
    weight50 * interval50.dispersion +
    weight95 * interval95.dispersion
  ) / totalWeight;

  const underprediction = (
    weight50 * interval50.underprediction +
    weight95 * interval95.underprediction
  ) / totalWeight;

  const overprediction = (
    weight50 * interval50.overprediction +
    weight95 * interval95.overprediction
  ) / totalWeight;

  return {
    wis,
    dispersion,
    underprediction,
    overprediction,
  };
};

/**
 * Validate forecast intervals
 * @param {Object} forecast - Forecast object with median and intervals
 * @returns {Object} Validation result {valid, errors}
 */
export const validateForecastIntervals = (forecast) => {
  const errors = [];

  if (!forecast) {
    return { valid: false, errors: ['Forecast is required'] };
  }

  const { median, q25, q75, q025, q975 } = forecast;

  // Check all values are numbers
  if (!Number.isFinite(median)) errors.push('Median must be a number');
  if (!Number.isFinite(q25)) errors.push('25th percentile must be a number');
  if (!Number.isFinite(q75)) errors.push('75th percentile must be a number');
  if (!Number.isFinite(q025)) errors.push('2.5th percentile must be a number');
  if (!Number.isFinite(q975)) errors.push('97.5th percentile must be a number');

  // Check all values are non-negative
  if (median < 0) errors.push('Median must be non-negative');
  if (q25 < 0) errors.push('25th percentile must be non-negative');
  if (q75 < 0) errors.push('75th percentile must be non-negative');
  if (q025 < 0) errors.push('2.5th percentile must be non-negative');
  if (q975 < 0) errors.push('97.5th percentile must be non-negative');

  // Check interval ordering: q025 <= q25 <= median <= q75 <= q975
  if (q025 > q25) errors.push('2.5th percentile must be <= 25th percentile');
  if (q25 > median) errors.push('25th percentile must be <= median');
  if (median > q75) errors.push('Median must be <= 75th percentile');
  if (q75 > q975) errors.push('75th percentile must be <= 97.5th percentile');

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate average WIS across multiple forecasts
 * @param {Array} forecasts - Array of forecast objects
 * @param {Array} observations - Array of observed values
 * @returns {number} Average WIS
 */
export const calculateAverageWIS = (forecasts, observations) => {
  if (!forecasts || !observations || forecasts.length === 0 || observations.length === 0) {
    return null;
  }

  if (forecasts.length !== observations.length) {
    return null;
  }

  const wisScores = forecasts.map((forecast, idx) => {
    const obs = observations[idx];
    if (!Number.isFinite(obs)) return null;

    const result = calculateWIS(
      obs,
      forecast.median,
      forecast.q25,
      forecast.q75,
      forecast.q025,
      forecast.q975
    );

    return result?.wis ?? null;
  }).filter(score => score !== null);

  if (wisScores.length === 0) return null;

  return wisScores.reduce((sum, score) => sum + score, 0) / wisScores.length;
};
