import React, { useState, useEffect } from 'react';
import { useView } from '../contexts/ViewContext';
import { useSearchParams } from 'react-router-dom';
import InfoOverlay from './InfoOverlay';
import ViewSelector from './ViewSelector';
import DateSelector from './DateSelector';
import Layout from './Layout';
import DataVisualization from './DataVisualization';
import ErrorBoundary from './ErrorBoundary';
import { useForecastData } from '../hooks/useForecastData';
import { useUrlParameterInit } from '../hooks/useUrlParameterInit';

/**
 * Main forecast visualization component - simplified and focused
 * Now handles coordination between components rather than doing everything
 */
const ForecastViz = ({ location, handleStateSelect }) => {
  // Get view state from context
  const {
    selectedModels, setSelectedModels,
    selectedDates, setSelectedDates,
    activeDate, setActiveDate,
    viewType, setViewType,
    currentDataset
  } = useView();
  
  const [searchParams] = useSearchParams();
  
  // Window size state (moved from Layout since we need it here)
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Fetch data for forecast views (not NHSN)
  const shouldFetchData = viewType !== 'nhsnall';
  const { 
    data, 
    loading, 
    error, 
    availableDates, 
    models,
    locationMetadata 
  } = useForecastData(shouldFetchData ? location : null, shouldFetchData ? viewType : null);

  // Initialize state from URL parameters
  useUrlParameterInit({
    loading,
    data,
    availableDates,
    models,
    viewType,
    selectedDates,
    selectedModels,
    setSelectedDates,
    setSelectedModels,
    setActiveDate,
    setViewType
  });

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <Layout location={location} handleStateSelect={handleStateSelect}>
        <div className="flex flex-col h-full">
          {/* Header with controls */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {locationMetadata?.location_name || location} - {currentDataset.fullName}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Respiratory disease forecasts and surveillance data
            </p>
          </div>
          <div className="flex-1 p-4">

          {/* Date selector for forecast views */}
          {currentDataset.hasDateSelector && (
            <div className="mb-4">
              <DateSelector
                selectedDates={selectedDates}
                setSelectedDates={setSelectedDates}
                availableDates={availableDates}
                activeDate={activeDate}
                setActiveDate={setActiveDate}
                loading={loading}
              />
            </div>
          )}

          {/* Main visualization area */}
          <div className="flex-1 min-h-0">
            <DataVisualization
              viewType={viewType}
              location={location}
              data={data}
              loading={loading}
              error={error}
              availableDates={availableDates}
              models={models}
              selectedDates={selectedDates}
              selectedModels={selectedModels}
              setSelectedDates={setSelectedDates}
              setActiveDate={setActiveDate}
              setSelectedModels={setSelectedModels}
              activeDate={activeDate}
              windowSize={windowSize}
              searchParams={searchParams}
            />
          </div>
        </div>
        </div>
      </Layout>
    </ErrorBoundary>
  );
};

export default ForecastViz;