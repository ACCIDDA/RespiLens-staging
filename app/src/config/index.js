/**
 * Centralized configuration exports
 *
 * This file serves as the single entry point for all application configuration.
 * Import config values from './config' rather than from individual config files.
 *
 * @example
 * import { APP_CONFIG, DATASETS, CHART_CONFIG } from '../config';
 */

// Dataset configuration
export { DATASETS, getAllViewValues, MODEL_COLORS, getModelColor } from './datasets';

// Application defaults
export { APP_CONFIG } from './app';

// Forecastle game settings
export { FORECASTLE_CONFIG } from './forecastle';

// Visualization and chart settings
export { CHART_CONFIG } from './visualization';

/**
 * Convenience function to get the entire configuration object
 * Useful for debugging or when you need access to all configs at once
 *
 * @returns {Object} Object containing all configuration modules
 */
export const getConfig = () => ({
  app: APP_CONFIG,
  forecastle: FORECASTLE_CONFIG,
  chart: CHART_CONFIG,
  datasets: DATASETS,
});
