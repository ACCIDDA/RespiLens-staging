// Chart and visualization constants
import { CHART_CONFIG } from "../config";

export const CHART_CONSTANTS = {
  // Plot dimensions (from centralized config)
  MAX_WIDTH: CHART_CONFIG.maxWidth,
  MAX_HEIGHT: CHART_CONFIG.maxHeight,
  WIDTH_RATIO: 0.8,
  HEIGHT_RATIO: 0.6,

  // Color opacity values for confidence intervals (from centralized config)
  CI_95_OPACITY: CHART_CONFIG.opacity.ci95,
  CI_50_OPACITY: CHART_CONFIG.opacity.ci50,

  // Date calculation offsets in weeks (from centralized config)
  DEFAULT_WEEKS_BEFORE: CHART_CONFIG.timeRange.weeksBefore,
  DEFAULT_WEEKS_AFTER: CHART_CONFIG.timeRange.weeksAfter,
  RANGESLIDER_WEEKS_AFTER: CHART_CONFIG.timeRange.rangeSliderWeeksAfter,

  // Grid layout for RSV subplots
  RSV_GRID: {
    ROWS: 3,
    COLUMNS: 2,
    ROW_HEIGHTS: [0.6, 0.2, 0.2],
    COLUMN_WIDTHS: [0.5, 0.5],
  },

  // Default margins
  MARGINS: {
    LEFT: 60,
    RIGHT: 30,
    TOP: 30,
    BOTTOM: 30,
  },

  // Y-axis padding percentage (from centralized config)
  Y_AXIS_PADDING_PERCENT: CHART_CONFIG.yAxisPaddingPercent,
};

// Rate change category order
export const RATE_CHANGE_CATEGORIES = [
  "large_decrease",
  "decrease",
  "stable",
  "increase",
  "large_increase",
];

// Plot chrome shared by every chart. Charts inherit the background of the
// surface holding them rather than painting their own white rectangle, and
// plotly's own furniture is tinted to match instead of falling back to its
// opaque grey defaults.
export const PLOT_CHROME = {
  // Fully transparent: the chart sits on the page rather than on a panel of
  // its own.
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  modebar: {
    bgcolor: "rgba(255,255,255,0.85)",
    color: "#9ca3af",
    activecolor: "#316896",
  },
};

export const RANGESLIDER_STYLE = {
  bgcolor: "rgba(0,0,0,0)",
  bordercolor: "rgba(15,23,42,0.10)",
  borderwidth: 1,
};
