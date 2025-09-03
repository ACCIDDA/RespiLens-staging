// src/contexts/ViewContext.jsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom'; // 1. Import useLocation
import { URLParameterManager } from '../utils/urlManager';
import { useForecastData } from '../hooks/useForecastData';
import { DATASETS } from '../config/datasets';

const ViewContext = createContext(null);

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation(); // 2. Get the current location object
  const urlManager = new URLParameterManager(searchParams, setSearchParams);

  // --- State remains centralized ---
  const [viewType, setViewType] = useState(() => urlManager.getView());
  const [selectedLocation, setSelectedLocation] = useState(() => urlManager.getLocation());
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);

  // --- Data fetching remains centralized ---
  const { data, loading, error, availableDates, models } = useForecastData(selectedLocation, viewType);

  // This effect now ONLY runs its logic when we are on the forecast page ('/')
  useEffect(() => {
    // 3. Add condition to only manage the URL on the main forecast page
    if (location.pathname === '/') {
      const currentParams = new URLSearchParams(searchParams);
      let needsUpdate = false;

      if (!currentParams.has('location')) {
        currentParams.set('location', 'US');
        needsUpdate = true;
      }
      const view = currentParams.get('view') || 'fludetailed';
      if (!currentParams.has('view')) {
        currentParams.set('view', view);
        needsUpdate = true;
      }
      const initialDataset = Object.values(DATASETS).find(d => 
        d.views.some(v => v.value === view)
      );
      if (initialDataset?.defaultModel && !currentParams.has(`${initialDataset.prefix}_models`)) {
        currentParams.set(`${initialDataset.prefix}_models`, initialDataset.defaultModel);
        needsUpdate = true;
      }
      if (needsUpdate) {
        setSearchParams(currentParams, { replace: true });
      }
    }
  }, [location.pathname]); // 4. Run this effect whenever the pathname changes

  // (The rest of the file is the same as the one you provided in the last turn)
  
  useEffect(() => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (!currentDataset) return;
    const params = urlManager.getDatasetParams(currentDataset);
    if (params.models?.length > 0) {
      setSelectedModels(params.models);
    }
  }, [searchParams, viewType]);


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