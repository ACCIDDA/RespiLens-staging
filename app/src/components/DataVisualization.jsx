import React from 'react';
import Plot from 'react-plotly.js';
import FluView from './FluView';
import RSVDefaultView from './RSVDefaultView';
import NHSNRawView from './NHSNRawView';
import { CHART_CONSTANTS, RATE_CHANGE_CATEGORIES } from '../constants/chart';
import { MODEL_COLORS, getModelColor } from '../config/datasets';

/**
 * Component that handles rendering different data visualization types
 */
const DataVisualization = ({
  viewType,
  location,
  data,
  loading,
  error,
  availableDates,
  models,
  selectedDates,
  selectedModels,
  setSelectedDates,
  setActiveDate,
  setSelectedModels,
  activeDate,
  windowSize,
  searchParams
}) => {
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Data
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Create default range function for chart components
  const getDefaultRange = (forRangeslider = false) => {
    if (!data?.ground_truth || !selectedDates.length) return undefined;
    
    const firstGroundTruthDate = new Date(data.ground_truth.dates?.[0] || selectedDates[0]);
    const lastGroundTruthDate = new Date(data.ground_truth.dates?.slice(-1)[0] || selectedDates[0]);
    
    if (forRangeslider) {
      const rangesliderEnd = new Date(lastGroundTruthDate);
      rangesliderEnd.setDate(rangesliderEnd.getDate() + (CHART_CONSTANTS.RANGESLIDER_WEEKS_AFTER * 7));
      return [firstGroundTruthDate, rangesliderEnd];
    }
    
    const firstDate = new Date(selectedDates[0]);
    const lastDate = new Date(selectedDates[selectedDates.length - 1]);
    
    const startDate = new Date(firstDate);
    const endDate = new Date(lastDate);
    
    startDate.setDate(startDate.getDate() - (CHART_CONSTANTS.DEFAULT_WEEKS_BEFORE * 7));
    endDate.setDate(endDate.getDate() + (CHART_CONSTANTS.DEFAULT_WEEKS_AFTER * 7));
    
    return [startDate, endDate];
  };

  // Render appropriate view based on viewType
  switch (viewType) {
    case 'fludetailed':
    case 'flutimeseries':
      return (
        <FluView
          data={data}
          selectedDates={selectedDates}
          selectedModels={selectedModels}
          models={models}
          setSelectedModels={setSelectedModels}
          viewType={viewType}
          windowSize={windowSize}
          getDefaultRange={getDefaultRange}
        />
      );

    case 'rsvdetailed':
      return (
        <RSVDefaultView
          location={location}
          selectedDates={selectedDates}
          availableDates={availableDates}
          setSelectedDates={setSelectedDates}
          setActiveDate={setActiveDate}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          searchParams={searchParams}
        />
      );

    case 'nhsnall':
      return (
        <NHSNRawView 
          location={location}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unknown View Type
            </h3>
            <p className="text-gray-600">
              The requested view type "{viewType}" is not supported.
            </p>
          </div>
        </div>
      );
  }
};

export default DataVisualization;