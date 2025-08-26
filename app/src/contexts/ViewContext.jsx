// src/contexts/ViewContext.jsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { URLParameterManager } from '../utils/urlManager';
import { useForecastData } from '../hooks/useForecastData';
import { DATASETS } from '../config/datasets';

const ViewContext = createContext(null);

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlManager = new URLParameterManager(searchParams, setSearchParams);

  // --- All state is now centralized here ---
  const [viewType, setViewType] = useState(() => urlManager.getView());
  const [selectedLocation, setSelectedLocation] = useState(() => urlManager.getLocation());
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);

  // --- Data fetching is now driven directly by the context's state ---
  const { data, loading, error, availableDates, models } = useForecastData(selectedLocation, viewType);

  // --- THIS IS THE FINAL, CORRECTED INITIALIZATION LOGIC ---
  useEffect(() => {
    // This effect runs once on mount to set ALL default URL params if they are missing.
    const currentParams = new URLSearchParams(searchParams);
    let needsUpdate = false;

    // 1. Ensure 'location' is set (assuming 'US' is the default)
    if (!currentParams.has('location')) {
      currentParams.set('location', 'US');
      needsUpdate = true;
    }

    // 2. Ensure 'view' is set, defaulting to 'fludetailed'
    const view = currentParams.get('view') || 'fludetailed';
    if (!currentParams.has('view')) {
      currentParams.set('view', view);
      needsUpdate = true;
    }
    
    // 3. Find the dataset for the initial view (e.g., 'flu')
    const initialDataset = Object.values(DATASETS).find(d => 
      d.views.some(v => v.value === view)
    );
    
    // 4. Ensure the default model for that dataset is set in the URL
    if (initialDataset?.defaultModel && !currentParams.has(`${initialDataset.prefix}_models`)) {
      currentParams.set(`${initialDataset.prefix}_models`, initialDataset.defaultModel);
      needsUpdate = true;
    }

    // 5. Only update the URL if a change was actually made
    if (needsUpdate) {
      setSearchParams(currentParams, { replace: true });
    }
  }, []); // The empty array [] ensures this runs only once on initial load

  // This secondary effect syncs the local React state from the URL after initialization
  useEffect(() => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (!currentDataset) return;
    const params = urlManager.getDatasetParams(currentDataset);
    if (params.models?.length > 0) {
      setSelectedModels(params.models);
    }
  }, [searchParams, viewType]);


  // Effect to set default dates after data loads
  useEffect(() => {
    if (!loading && availableDates.length > 0 && selectedDates.length === 0) {
      const latestDate = availableDates[availableDates.length - 1];
      if (latestDate) {
        setSelectedDates([latestDate]);
        setActiveDate(latestDate);
      }
    }
  }, [loading, availableDates]);

  const handleLocationSelect = (newLocation) => {
    setSelectedLocation(newLocation);
    urlManager.updateLocation(newLocation);
  };
  
  const handleViewChange = useCallback((newView) => {
    const oldView = viewType;
    if (oldView === newView) return;

    const oldDataset = urlManager.getDatasetFromView(oldView);
    const newDataset = urlManager.getDatasetFromView(newView);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('view', newView);

    if (oldDataset?.shortName !== newDataset?.shortName) {
      setSelectedDates([]);
      setSelectedModels([]);
      setActiveDate(null);
      if (oldDataset) {
        newSearchParams.delete(`${oldDataset.prefix}_models`);
        newSearchParams.delete(`${oldDataset.prefix}_dates`);
      }
      if (newDataset?.defaultModel) {
        newSearchParams.set(`${newDataset.prefix}_models`, newDataset.defaultModel);
      }
    }
    setViewType(newView);
    setSearchParams(newSearchParams);
  }, [viewType, searchParams, setSearchParams, urlManager]);

  const updateDatasetParams = useCallback((params) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (currentDataset) urlManager.updateDatasetParams(currentDataset, params);
  }, [viewType, urlManager]);

  const contextValue = {
    selectedLocation, handleLocationSelect,
    data, loading, error, availableDates, models,
    selectedModels, setSelectedModels: (models) => { setSelectedModels(models); updateDatasetParams({ models }); },
    selectedDates, setSelectedDates: (dates) => { setSelectedDates(dates); updateDatasetParams({ dates }); },
    activeDate, setActiveDate,
    viewType, setViewType: handleViewChange,
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
  if (!context) throw new Error('useView must be used within a ViewProvider');
  return context;
};