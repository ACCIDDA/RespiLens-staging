// Chart and visualization constants
export const CHART_CONSTANTS = {
  // Plot dimensions
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 800,
  WIDTH_RATIO: 0.8,
  HEIGHT_RATIO: 0.6,
  
  // Color opacity values for confidence intervals
  CI_95_OPACITY: '10',
  CI_50_OPACITY: '30',
  
  // Date calculation offsets (in weeks)
  DEFAULT_WEEKS_BEFORE: 8,
  DEFAULT_WEEKS_AFTER: 5,
  RANGESLIDER_WEEKS_AFTER: 5,
  
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
  
  // Y-axis padding percentage
  Y_AXIS_PADDING_PERCENT: 15
};

// Rate change category order
export const RATE_CHANGE_CATEGORIES = [
  'large_decrease',
  'decrease', 
  'stable',
  'increase',
  'large_increase'
];