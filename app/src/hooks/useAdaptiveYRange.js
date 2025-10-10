import { useCallback } from 'react';

/**
 * Custom hook for calculating adaptive y-axis range based on visible data
 * Works across FluSight, RSV, and NHSN datasets
 * 
 * @param {Object} data - Dataset containing ground truth and/or forecasts
 * @param {Array} selectedDates - Currently selected forecast dates
 * @param {Array} selectedModels - Currently selected models
 * @param {Function} getDefaultRange - Function that returns current x-axis [start, end] range
 * @param {Object} options - Configuration options
 * @param {string} options.datasetType - 'flu', 'rsv', or 'nhsn'
 * @param {string} options.ageGroup - For RSV data (e.g., '0-130')
 * @param {string} options.target - Target type (e.g., 'inc hosp', 'wk inc flu hosp')
 * @param {number} options.paddingPercent - Y-axis padding percentage (default: 10%)
 * @param {boolean} options.includeGroundTruth - Whether to include ground truth in calculations
 * @returns {Function} Function that calculates adaptive y-range
 */
export const useAdaptiveYRange = (
  data, 
  selectedDates, 
  selectedModels, 
  getDefaultRange,
  options = {}
) => {
  const {
    datasetType = 'flu',
    ageGroup = '0-130',
    target = 'inc hosp',
    paddingPercent = 10,
    includeGroundTruth = true,
    selectedColumns = []
  } = options;

  return useCallback(() => {
    if (!data) return null;
    
    // Get current x-axis range to determine visible time period
    const currentXRange = getDefaultRange();
    if (!currentXRange) return null;
    
    const [startDate, endDate] = currentXRange;
    const allYValues = [];
    
    // Add ground truth values if available and requested
    if (includeGroundTruth && data.ground_truth) {
      const addGroundTruthValues = (dates, values) => {
        if (!dates || !values) return;
        dates.forEach((date, index) => {
          if (date >= startDate && date <= endDate) {
            const value = values[index];
            if (typeof value === 'number' && !isNaN(value)) {
              allYValues.push(value);
            }
          }
        });
      };

      switch (datasetType) {
        case 'flu':
          addGroundTruthValues(data.ground_truth.dates, data.ground_truth.values);
          break;
        case 'rsv':
          // RSV has age-group specific ground truth
          if (data.ground_truth[ageGroup]) {
            addGroundTruthValues(
              data.ground_truth[ageGroup].dates, 
              data.ground_truth[ageGroup].values
            );
          }
          break;
        case 'nhsn':
          // NHSN uses data.ground_truth structure (no forecasts)
          addGroundTruthValues(data.ground_truth.dates, data.ground_truth.values);
          break;
      }
    }
    
    // Add forecast values from selected models and dates (skip for NHSN - no forecasts)
    if (datasetType !== 'nhsn') {
      selectedModels.forEach(model => {
        selectedDates.forEach(date => {
          const forecasts = data.forecasts[date] || {};
          let forecast = null;
          
          // Get forecast data based on dataset type
          switch (datasetType) {
            case 'flu':
              forecast = 
                forecasts['wk inc flu hosp']?.[model] || 
                forecasts['wk flu hosp rate change']?.[model];
              break;
            case 'rsv':
              forecast = forecasts[ageGroup]?.[target]?.[model];
              break;
          }
          
          if (!forecast) return;
          
          // Handle quantile predictions
          if (forecast.type === 'quantile') {
            Object.entries(forecast.predictions || {}).forEach(([, pred]) => {
              if (pred.date >= startDate && pred.date <= endDate) {
                const values = pred.values || [];
                const quantiles = pred.quantiles || [];
                
                // Include key quantiles for range calculation
                [0.025, 0.25, 0.5, 0.75, 0.975].forEach(q => {
                  const index = quantiles.indexOf(q);
                  if (index !== -1 && typeof values[index] === 'number' && !isNaN(values[index])) {
                    allYValues.push(values[index]);
                  }
                });
              }
            });
          }
          
          // Handle sample predictions
          if (forecast.type === 'sample') {
            Object.entries(forecast.predictions || {}).forEach(([, pred]) => {
              if (pred.date >= startDate && pred.date <= endDate) {
                const samples = pred.samples || [];
                samples.forEach(sample => {
                  if (typeof sample === 'number' && !isNaN(sample)) {
                    allYValues.push(sample);
                  }
                });
              }
            });
          }
          
          // Handle PMF predictions (rate change) - not typically used for y-axis scaling
          // but included for completeness
        });
      });
    }
    
    // For NHSN, add values from selected columns
    if (datasetType === 'nhsn' && selectedColumns) {
      selectedColumns.forEach(column => {
        // Determine if column is preliminary or official
        const isPrelimininary = column.includes('_prelim');
        const dataType = isPrelimininary ? 'preliminary' : 'official';
        
        if (data.data?.[dataType]?.[column]) {
          data.ground_truth.dates.forEach((date, index) => {
            if (date >= startDate && date <= endDate) {
              const value = data.data[dataType][column][index];
              if (typeof value === 'number' && !isNaN(value)) {
                allYValues.push(value);
              }
            }
          });
        }
      });
    }
    
    // For Flu, ensure we have forecast data even with no selected dates
    if (datasetType === 'flu' && selectedDates.length === 0 && selectedModels.length > 0) {
      // Use all available forecast dates when none specifically selected
      const allForecastDates = Object.keys(data.forecasts || {});
      allForecastDates.forEach(date => {
        selectedModels.forEach(model => {
          const forecasts = data.forecasts[date] || {};
          const forecast = 
            forecasts['wk inc flu hosp']?.[model] || 
            forecasts['wk flu hosp rate change']?.[model];
          
          if (forecast && forecast.type === 'quantile') {
            Object.entries(forecast.predictions || {}).forEach(([, pred]) => {
              if (pred.date >= startDate && pred.date <= endDate) {
                const values = pred.values || [];
                const quantiles = pred.quantiles || [];
                
                [0.025, 0.25, 0.5, 0.75, 0.975].forEach(q => {
                  const index = quantiles.indexOf(q);
                  if (index !== -1 && typeof values[index] === 'number' && !isNaN(values[index])) {
                    allYValues.push(values[index]);
                  }
                });
              }
            });
          }
        });
      });
    }
    
    if (allYValues.length === 0) {
      // Return a sensible default range if no data found
      return [0, 100];
    }
    
    const minVal = Math.min(...allYValues);
    const maxVal = Math.max(...allYValues);
    
    // Handle edge case where min === max
    if (minVal === maxVal) {
      const baseValue = Math.max(minVal, 1);
      return [0, baseValue * 2];
    }
    
    // Add padding to prevent data from touching axis edges
    const range = maxVal - minVal;
    const padding = Math.max(range * (paddingPercent / 100), Math.abs(maxVal) * 0.05, 1);
    
    return [
      0, // Always start from 0 for count data
      maxVal + padding
    ];
  }, [
    data, 
    selectedDates, 
    selectedModels, 
    getDefaultRange,
    datasetType,
    ageGroup,
    target,
    paddingPercent,
    includeGroundTruth,
    selectedColumns
  ]);
};
