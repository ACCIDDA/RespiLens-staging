import { createTheme } from '@mantine/core';

// Centralized color scheme for RespiLens
export const colors = {
  // Primary brand colors
  primary: '#2563eb',     // Blue primary
  primaryDark: '#1d4ed8', // Darker blue
  primaryLight: '#3b82f6', // Lighter blue
  
  // Secondary colors
  secondary: '#6b7280',   // Gray
  accent: '#f59e0b',      // Amber/Orange
  
  // Status colors
  success: '#10b981',     // Green
  warning: '#f59e0b',     // Amber
  error: '#ef4444',       // Red
  info: '#06b6d4',        // Cyan
  
  // Text colors
  text: {
    primary: '#111827',   // Dark gray
    secondary: '#6b7280', // Medium gray
    muted: '#9ca3af',     // Light gray
    inverse: '#ffffff',   // White
  },
  
  // Background colors
  background: {
    primary: '#ffffff',   // White
    secondary: '#f9fafb', // Very light gray
    tertiary: '#f3f4f6',  // Light gray
    dark: '#111827',      // Dark mode background
  },
  
  // Border colors
  border: {
    light: '#e5e7eb',     // Light border
    medium: '#d1d5db',    // Medium border
    dark: '#6b7280',      // Dark border
  },
  
  // Semantic colors for RespiLens features
  forecast: {
    line: '#2563eb',      // Main forecast line color
    confidence95: '10',   // Opacity for 95% CI
    confidence50: '30',   // Opacity for 50% CI
    groundTruth: '#000000', // Ground truth data
  },
  
  // Navigation and UI
  navigation: {
    active: '#2563eb',    // Active nav item
    hover: '#3b82f6',     // Hover state
    text: '#374151',      // Nav text
  },
  
  // Special RespiLens elements
  alpha: '#ef4444',       // Red alpha superscript
  logo: '#2563eb',        // Logo text color
};

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

// Enhanced Mantine theme with centralized colors
export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    // Custom color palette that integrates with Mantine's color system
    brand: [
      '#eff6ff', // 0 - lightest
      '#dbeafe', // 1
      '#bfdbfe', // 2
      '#93c5fd', // 3
      '#60a5fa', // 4
      '#3b82f6', // 5 - base
      '#2563eb', // 6 - primary
      '#1d4ed8', // 7
      '#1e40af', // 8
      '#1e3a8a', // 9 - darkest
    ],
  },
  other: {
    // Make our color scheme available throughout the app
    colors: colors,
    modelColors: MODEL_COLORS,
    getModelColor: getModelColor,
  },
});