/**
 * Calculate RMSE (Root Mean Squared Error) for a set of predictions
 * @param {Array} predictions - Array of predicted values
 * @param {Array} observations - Array of observed (ground truth) values
 * @returns {number} RMSE value
 */
export const calculateRMSE = (predictions, observations) => {
  if (!predictions || !observations || predictions.length === 0 || observations.length === 0) {
    return null;
  }

  if (predictions.length !== observations.length) {
    return null;
  }

  let sumSquaredErrors = 0;
  let count = 0;

  for (let i = 0; i < predictions.length; i += 1) {
    const pred = predictions[i];
    const obs = observations[i];

    if (Number.isFinite(pred) && Number.isFinite(obs)) {
      const error = pred - obs;
      sumSquaredErrors += error * error;
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  return Math.sqrt(sumSquaredErrors / count);
};

/**
 * Extract ground truth values for specific horizon dates
 * @param {Array} groundTruthSeries - Full ground truth series with {date, value}
 * @param {Array} horizonDates - Array of dates to extract ground truth for
 * @returns {Array} Array of ground truth values matching horizonDates
 */
export const extractGroundTruthForHorizons = (groundTruthSeries, horizonDates) => {
  const truthMap = new Map(groundTruthSeries.map(entry => [entry.date, entry.value]));
  return horizonDates.map(date => truthMap.get(date) ?? null);
};

/**
 * Score user's median forecast using RMSE
 * @param {Array} userMedians - Array of user's median predictions for each horizon
 * @param {Array} groundTruthValues - Array of ground truth values for each horizon
 * @returns {Object} Score result with RMSE and valid count
 */
export const scoreUserForecast = (userMedians, groundTruthValues) => {
  const rmse = calculateRMSE(userMedians, groundTruthValues);
  const validCount = userMedians.filter((pred, i) =>
    Number.isFinite(pred) && Number.isFinite(groundTruthValues[i])
  ).length;

  return {
    rmse,
    validCount,
    totalHorizons: userMedians.length,
  };
};

/**
 * Score model forecasts against ground truth
 * @param {Object} modelForecasts - Object with model names as keys and predictions as values
 * @param {Array} horizons - Array of horizon values (e.g., [1, 2, 3])
 * @param {Array} groundTruthValues - Array of ground truth values for each horizon
 * @returns {Array} Array of {modelName, rmse, validCount} sorted by RMSE (best first)
 */
export const scoreModels = (modelForecasts, horizons, groundTruthValues) => {
  const modelScores = [];

  Object.entries(modelForecasts).forEach(([modelName, modelData]) => {
    const predictions = modelData?.predictions;
    if (!predictions) {
      return;
    }

    const modelMedians = horizons.map(horizon => {
      const horizonPrediction = predictions[String(horizon)];
      if (!horizonPrediction) {
        return null;
      }

      // Extract median from quantiles array
      // quantiles and values are parallel arrays: [0.025, 0.25, 0.5, 0.75, 0.975] and corresponding values
      const quantiles = horizonPrediction.quantiles;
      const values = horizonPrediction.values;

      if (!quantiles || !values || quantiles.length !== values.length) {
        return null;
      }

      // Find the index of the 0.5 quantile (median)
      const medianIndex = quantiles.findIndex(q => Math.abs(q - 0.5) < 0.001);
      if (medianIndex === -1) {
        return null;
      }

      const medianValue = values[medianIndex];
      return Number.isFinite(medianValue) ? medianValue : null;
    });

    const rmse = calculateRMSE(modelMedians, groundTruthValues);
    if (rmse !== null) {
      const validCount = modelMedians.filter((pred, i) =>
        Number.isFinite(pred) && Number.isFinite(groundTruthValues[i])
      ).length;

      modelScores.push({
        modelName,
        rmse,
        validCount,
        medians: modelMedians,
      });
    }
  });

  // Sort by RMSE (lower is better)
  return modelScores.sort((a, b) => a.rmse - b.rmse);
};
