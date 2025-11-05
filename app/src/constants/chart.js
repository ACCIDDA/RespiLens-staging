// Chart and visualization constants
import { CHART_CONFIG } from '../config';

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
    COLUMN_WIDTHS: [0.5, 0.5]
  },

  // Default margins
  MARGINS: {
    LEFT: 60,
    RIGHT: 30,
    TOP: 30,
    BOTTOM: 30
  },

  // Y-axis padding percentage (from centralized config)
  Y_AXIS_PADDING_PERCENT: CHART_CONFIG.yAxisPaddingPercent
};

// Rate change category order
export const RATE_CHANGE_CATEGORIES = [
  'large_decrease',
  'decrease', 
  'stable',
  'increase',
  'large_increase'
];