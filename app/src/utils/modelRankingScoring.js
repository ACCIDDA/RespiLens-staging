/**
 * Enhanced model scoring utilities for ranking models across time periods
 * This extends forecastleScoring.js with time-based aggregation and ranking features
 */

import { scoreModels, extractGroundTruthForHorizons } from './forecastleScoring';

/**
 * Score models across multiple forecast dates
 * @param {Object} forecasts - Forecast data object keyed by date
 * @param {Object} groundTruth - Ground truth data with dates and values
 * @param {Array} dates - Array of forecast dates to evaluate (e.g., ['2024-11-01', '2024-11-08'])
 * @param {string} target - Target variable to score (e.g., 'wk inc flu hosp')
 * @param {Array} horizons - Array of horizons to evaluate (e.g., [1, 2, 3])
 * @param {Array} modelsToScore - Optional array of specific models to score (if null, scores all available models)
 * @returns {Array} Array of model scores aggregated across all dates
 */
export const scoreModelsAcrossDates = (
  forecasts,
  groundTruth,
  dates,
  target,
  horizons = [1, 2, 3],
  modelsToScore = null
) => {
  if (!forecasts || !groundTruth || !dates || dates.length === 0 || !target) {
    return [];
  }

  // Build ground truth time series for extraction
  const groundTruthSeries = (groundTruth.dates || []).map((date, idx) => ({
    date,
    value: groundTruth[target]?.[idx],
  }));

  // Accumulate scores for each model across all dates
  const modelScoreAccumulator = new Map();

  dates.forEach(forecastDate => {
    const forecastsForDate = forecasts[forecastDate];
    if (!forecastsForDate || !forecastsForDate[target]) {
      return;
    }

    const modelForecastsForTarget = forecastsForDate[target];

    // Get horizon dates by looking at the first available model's predictions
    const sampleModel = Object.values(modelForecastsForTarget)[0];
    if (!sampleModel || !sampleModel.predictions) {
      return;
    }

    const horizonDates = horizons
      .map(h => sampleModel.predictions[String(h)]?.date)
      .filter(d => d !== undefined);

    if (horizonDates.length === 0) {
      return;
    }

    // Extract ground truth for these horizon dates
    const groundTruthValues = extractGroundTruthForHorizons(groundTruthSeries, horizonDates);

    // Filter to only requested models if specified
    const modelsToEvaluate = modelsToScore
      ? Object.fromEntries(
          Object.entries(modelForecastsForTarget).filter(([modelName]) =>
            modelsToScore.includes(modelName)
          )
        )
      : modelForecastsForTarget;

    // Score models for this date
    const scoresForDate = scoreModels(modelsToEvaluate, horizons, groundTruthValues);

    // Accumulate scores
    scoresForDate.forEach(score => {
      if (!modelScoreAccumulator.has(score.modelName)) {
        modelScoreAccumulator.set(score.modelName, {
          modelName: score.modelName,
          totalWIS: 0,
          totalDispersion: 0,
          totalUnderprediction: 0,
          totalOverprediction: 0,
          totalValidCount: 0,
          dateCount: 0,
        });
      }

      const accumulated = modelScoreAccumulator.get(score.modelName);
      accumulated.totalWIS += score.wis * score.validCount; // Weight by valid count
      accumulated.totalDispersion += score.dispersion * score.validCount;
      accumulated.totalUnderprediction += score.underprediction * score.validCount;
      accumulated.totalOverprediction += score.overprediction * score.validCount;
      accumulated.totalValidCount += score.validCount;
      accumulated.dateCount += 1;
    });
  });

  // Calculate average scores
  const aggregatedScores = Array.from(modelScoreAccumulator.values()).map(acc => ({
    modelName: acc.modelName,
    wis: acc.totalValidCount > 0 ? acc.totalWIS / acc.totalValidCount : null,
    dispersion: acc.totalValidCount > 0 ? acc.totalDispersion / acc.totalValidCount : null,
    underprediction:
      acc.totalValidCount > 0 ? acc.totalUnderprediction / acc.totalValidCount : null,
    overprediction:
      acc.totalValidCount > 0 ? acc.totalOverprediction / acc.totalValidCount : null,
    validCount: acc.totalValidCount,
    dateCount: acc.dateCount,
  }));

  // Sort by WIS (lower is better)
  return aggregatedScores
    .filter(score => score.wis !== null)
    .sort((a, b) => a.wis - b.wis);
};

/**
 * Get dates within a time window (e.g., past N weeks)
 * @param {Array} availableDates - All available forecast dates (sorted)
 * @param {number} weeksBack - Number of weeks to look back (null for all dates)
 * @param {string} referenceDate - Reference date to count back from (default: most recent date)
 * @returns {Array} Filtered array of dates within the time window
 */
export const getDatesByTimeWindow = (availableDates, weeksBack = null, referenceDate = null) => {
  if (!availableDates || availableDates.length === 0) {
    return [];
  }

  const sortedDates = [...availableDates].sort();

  if (weeksBack === null) {
    return sortedDates; // Return all dates
  }

  const endDate = referenceDate ? new Date(referenceDate) : new Date(sortedDates[sortedDates.length - 1]);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - weeksBack * 7);

  return sortedDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date >= startDate && date <= endDate;
  });
};

/**
 * Get top N models by performance
 * @param {Array} modelScores - Array of model scores from scoreModelsAcrossDates
 * @param {number} topN - Number of top models to return (default: 3)
 * @returns {Array} Top N model names
 */
export const getTopNModels = (modelScores, topN = 3) => {
  if (!modelScores || modelScores.length === 0) {
    return [];
  }

  return modelScores.slice(0, topN).map(score => score.modelName);
};

/**
 * Score models with time window filtering
 * @param {Object} forecasts - Forecast data
 * @param {Object} groundTruth - Ground truth data
 * @param {Array} availableDates - All available forecast dates
 * @param {string} target - Target variable
 * @param {Object} options - Scoring options
 * @param {number} options.weeksBack - Number of weeks to look back (null for all)
 * @param {Array} options.horizons - Horizons to evaluate
 * @param {Array} options.modelsToScore - Specific models to score
 * @param {string} options.referenceDate - Reference date for time window
 * @returns {Array} Model scores sorted by performance
 */
export const scoreModelsWithTimeWindow = (
  forecasts,
  groundTruth,
  availableDates,
  target,
  options = {}
) => {
  const {
    weeksBack = null,
    horizons = [1, 2, 3],
    modelsToScore = null,
    referenceDate = null,
  } = options;

  const datesToScore = getDatesByTimeWindow(availableDates, weeksBack, referenceDate);

  return scoreModelsAcrossDates(
    forecasts,
    groundTruth,
    datesToScore,
    target,
    horizons,
    modelsToScore
  );
};

/**
 * Get model ranking information with descriptive labels
 * @param {Array} modelScores - Scored models from scoreModelsAcrossDates
 * @param {number} topN - Number of top models to highlight
 * @returns {Array} Model scores with rank and label information
 */
export const getModelRankings = (modelScores, topN = 3) => {
  if (!modelScores || modelScores.length === 0) {
    return [];
  }

  return modelScores.map((score, index) => {
    const rank = index + 1;
    const isTopN = rank <= topN;

    return {
      ...score,
      rank,
      isTopN,
      rankLabel: rank === 1 ? '🥇 Best' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`,
    };
  });
};

/**
 * Format WIS score for display
 * @param {number} wis - WIS score
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted WIS string
 */
export const formatWIS = (wis, decimals = 2) => {
  if (wis === null || wis === undefined || !Number.isFinite(wis)) {
    return 'N/A';
  }
  return wis.toFixed(decimals);
};
