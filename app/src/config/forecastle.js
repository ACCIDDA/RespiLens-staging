/**
 * Forecastle game configuration
 *
 * This file contains all settings related to the Forecastle forecasting game,
 * including game mechanics, scoring rules, forecast horizons, and display settings.
 */

export const FORECASTLE_CONFIG = {
  /**
   * Game mechanics
   */
  maxScenariosPerDay: 3,
  maxAttemptMultiplier: 2, // Max attempts = locationOptions.length * this value
  minModelsRequired: 5,

  /**
   * Forecast horizons by dataset
   * Defines which weeks ahead (1, 2, 3, 4) are used for each dataset
   */
  horizons: {
    flusight: [1, 2, 3],
    rsv: [1, 2, 3],
    covid19: [1, 2, 3],
  },

  /**
   * Target keys for each dataset
   * These match the target column names in the forecast data
   */
  targetKeys: {
    flusight: "wk inc flu hosp",
    rsv: "wk inc rsv hosp",
    covid19: "wk inc covid hosp",
  },

  /**
   * Historical data display ranges
   * Controls how much historical data to show in the game charts
   *
   * - 'seasonStart': Show data since July 1st of the current season
   * - Number: Show last N weeks of data
   */
  historyDisplay: {
    flusight: "seasonStart",
    rsv: "seasonStart",
    covid19: 20, // Last 20 weeks (~5 months)
    default: 26, // Last 26 weeks (~6 months)
  },

  /**
   * Default forecast interval widths
   * Used when players first load a scenario or reset their forecast
   *
   * Values are percentages of the median (e.g., 0.5 = 50% of median)
   */
  defaultIntervals: {
    width95Percent: 0.5, // 95% interval: median ± 50%
    width50Percent: 0.25, // 50% interval: median ± 25%
  },

  /**
   * Statistical confidence parameters
   * Z-scores for confidence interval calculations (Poisson distribution)
   */
  confidence: {
    zScore95: 1.96, // ~95% confidence interval
    zScore50: 0.674, // ~50% confidence interval
  },
};
