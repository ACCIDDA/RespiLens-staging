import { createTheme } from '@mantine/core';

// Model colors - keep existing model color system intact
export const MODEL_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
];

// Model color helper function
export const getModelColor = (model, selectedModels) => {
  const index = selectedModels.indexOf(model);
  return index >= 0 ? MODEL_COLORS[index % MODEL_COLORS.length] : null;
};

// Enhanced Mantine theme with overridden color palettes
export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    // Override Mantine's blue palette to match our theme
    blue: [
      '#eff6ff', // 0 - lightest
      '#dbeafe', // 1
      '#bfdbfe', // 2  
      '#93c5fd', // 3
      '#60a5fa', // 4
      '#3b82f6', // 5
      '#2563eb', // 6 - primary (default Mantine primary)
      '#1d4ed8', // 7
      '#1e40af', // 8
      '#1e3a8a', // 9 - darkest
    ],
    
    // Override red palette for error states
    red: [
      '#fef2f2', // 0 - lightest
      '#fee2e2', // 1
      '#fecaca', // 2
      '#fca5a5', // 3
      '#f87171', // 4
      '#ef4444', // 5
      '#dc2626', // 6 - primary red
      '#b91c1c', // 7
      '#991b1b', // 8
      '#7f1d1d', // 9 - darkest
    ],
    
    // Override green palette for success states
    green: [
      '#f0fdf4', // 0 - lightest
      '#dcfce7', // 1
      '#bbf7d0', // 2
      '#86efac', // 3
      '#4ade80', // 4
      '#22c55e', // 5
      '#16a34a', // 6 - primary green
      '#15803d', // 7
      '#166534', // 8
      '#14532d', // 9 - darkest
    ],
    
    // Override amber/yellow palette for warnings
    yellow: [
      '#fffbeb', // 0 - lightest
      '#fef3c7', // 1
      '#fde68a', // 2
      '#fcd34d', // 3
      '#fbbf24', // 4
      '#f59e0b', // 5
      '#d97706', // 6 - primary amber
      '#b45309', // 7
      '#92400e', // 8
      '#78350f', // 9 - darkest
    ],
    
    // Override cyan palette for info states
    cyan: [
      '#ecfeff', // 0 - lightest
      '#cffafe', // 1
      '#a5f3fc', // 2
      '#67e8f9', // 3
      '#22d3ee', // 4
      '#06b6d4', // 5
      '#0891b2', // 6 - primary cyan
      '#0e7490', // 7
      '#155e75', // 8
      '#164e63', // 9 - darkest
    ],
    
    // Override gray palette for neutral elements
    gray: [
      '#f9fafb', // 0 - lightest
      '#f3f4f6', // 1
      '#e5e7eb', // 2
      '#d1d5db', // 3
      '#9ca3af', // 4
      '#6b7280', // 5
      '#4b5563', // 6 - primary gray
      '#374151', // 7
      '#1f2937', // 8
      '#111827', // 9 - darkest
    ],
  },
  
  other: {
    // Keep model colors available for data visualizations
    modelColors: MODEL_COLORS,
    getModelColor: getModelColor,
  },
});