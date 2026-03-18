/**
 * Visualization and chart configuration
 *
 * This file contains settings for charts, graphs, and visual displays
 * throughout the application, including dimensions, colors, and time ranges.
 */

export const CHART_CONFIG = {
  /**
   * Chart dimensions
   * Maximum width and height for chart containers
   */
  maxWidth: 1200,
  maxHeight: 800,

  /**
   * Default time ranges for forecast charts
   * Values are in weeks
   */
  timeRange: {
    weeksBefore: 8, // Show 8 weeks of historical data
    weeksAfter: 5, // Show 5 weeks of forecast data
    rangeSliderWeeksAfter: 5, // Range slider shows 5 weeks ahead
  },

  /**
   * Confidence interval opacity values
   * Used for displaying uncertainty in forecasts
   * Values are strings to match CSS/SVG opacity format
   */
  opacity: {
    ci95: "10", // 95% confidence interval (lighter)
    ci50: "30", // 50% confidence interval (darker)
  },

  /**
   * Y-axis padding
   * Additional space (as percentage) added to y-axis for visual clarity
   */
  yAxisPaddingPercent: 15,

  /**
   * Forecastle game-specific colors
   * Colors used in the Forecastle game for user-drawn forecasts
   */
  forecastleColors: {
    interval95: "rgba(220, 20, 60, 0.25)", // Crimson with transparency
    interval50: "rgba(220, 20, 60, 0.45)", // Crimson with more opacity
  },
};
