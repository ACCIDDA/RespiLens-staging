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
   * Forecastle game colours, shared by the chart and the results list.
   * The player's forecast is the brand blue; the hub ensemble a neutral
   * slate (it is the reference, like observed data); the top-ranked models
   * take the next three slots. As a line set (user + top models) these pass
   * the dataviz validator's adjacent checks on white.
   */
  forecastleColors: {
    user: "#0076d1",
    interval95: "rgba(0, 118, 209, 0.14)",
    interval50: "rgba(0, 118, 209, 0.3)",
    hub: "#495057",
    topModels: ["#c2255c", "#e67700", "#1098ad"],
  },
};
