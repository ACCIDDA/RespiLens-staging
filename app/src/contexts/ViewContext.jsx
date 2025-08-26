import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { URLParameterManager } from '../utils/urlManager';
import { DATASETS } from '../config/datasets';

const ViewContext = createContext(null);

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  // Create URL manager instance
  const urlManager = new URLParameterManager(searchParams, setSearchParams);
  
  const [viewType, setViewType] = useState(() => {
    // Initialize URL with defaults if needed
    urlManager.initializeDefaults();
    return urlManager.getView();
  });

  // Add new useEffect at the beginning of ViewProvider
  useEffect(() => {
    // Get current dataset and its parameters
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (!currentDataset) return;

    const params = urlManager.getDatasetParams(currentDataset);

    // Set dates if we have them in URL and none are selected
    if (params.dates?.length > 0 && selectedDates.length === 0) {
      setSelectedDates(params.dates);
      setActiveDate(params.dates[params.dates.length - 1]);
    }

    // Set models if we have them in URL and none are selected
    if (params.models?.length > 0 && selectedModels.length === 0) {
      setSelectedModels(params.models);
    }
  }, [viewType, searchParams]); // Only run when view type or URL params change

  // Handle view type changes
  const handleViewChange = useCallback((newView) => {
    const oldView = viewType;
    if (oldView === newView) {
      return; // No change needed
    }

    const oldDataset = urlManager.getDatasetFromView(oldView);
    const newDataset = urlManager.getDatasetFromView(newView);

    // Create a new URLSearchParams object from the current URL to modify it
    const newSearchParams = new URLSearchParams(searchParams);

    // Always update the view parameter
    newSearchParams.set('view', newView);

    // Check if we're switching between different datasets (e.g., flu to covid)
    if (oldDataset?.shortName !== newDataset?.shortName) {
      // 1. Reset the local React state immediately
      setSelectedDates([]);
      setSelectedModels([]);
      setActiveDate(null);

      // 2. Remove the parameters from the OLD dataset
      if (oldDataset) {
        newSearchParams.delete(`${oldDataset.prefix}_models`);
        newSearchParams.delete(`${oldDataset.prefix}_dates`);
      }

      // 3. Set the default model for the NEW dataset
      if (newDataset?.defaultModel) {
        newSearchParams.set(`${newDataset.prefix}_models`, newDataset.defaultModel);
      }
    }
    
    // 4. Update the component's viewType state and commit the URL change in one go.
    // React will batch these state updates together.
    setViewType(newView);
    setSearchParams(newSearchParams);

  }, [viewType, searchParams, setSearchParams, urlManager]);

  // Update dataset parameters
  const updateDatasetParams = useCallback((params) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (currentDataset) {
      urlManager.updateDatasetParams(currentDataset, params);
    }
  }, [viewType, urlManager]);

  // Reset current view to defaults
  const resetView = useCallback(() => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (!currentDataset) return;

    // Clear parameters
    urlManager.clearDatasetParams(currentDataset);

    // Set defaults based on dataset configuration
    if (currentDataset.hasDateSelector) {
      // Set most recent date
      const latestDate = window.availableDates?.[window.availableDates.length - 1];
      if (latestDate) {
        setSelectedDates([latestDate]);
        setActiveDate(latestDate);
        updateDatasetParams({ dates: [latestDate] });
      }
    }

    if (currentDataset.hasModelSelector && currentDataset.defaultModel) {
      setSelectedModels([currentDataset.defaultModel]);
      updateDatasetParams({ models: [currentDataset.defaultModel] });
    }
  }, [viewType, urlManager, updateDatasetParams]);

  const contextValue = {
    selectedModels,
    setSelectedModels: (models) => {
      setSelectedModels(models);
      updateDatasetParams({ models });
    },
    selectedDates,
    setSelectedDates: (dates) => {
      setSelectedDates(dates);
      updateDatasetParams({ dates });
    },
    activeDate,
    setActiveDate,
    viewType,
    setViewType: handleViewChange,  // Ensure this is present
    resetView,
    currentDataset: urlManager.getDatasetFromView(viewType)
  };

  return (
    <ViewContext.Provider value={contextValue}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};
