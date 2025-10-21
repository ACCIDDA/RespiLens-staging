// src/contexts/ViewContext.jsx

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { URLParameterManager } from '../utils/urlManager';
import { useForecastData } from '../hooks/useForecastData';
import { ViewContext } from './ViewContextObject';

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isForecastPage = location.pathname === '/';

  // This ensures urlManager is not recreated on every render.
  const urlManager = useMemo(() => new URLParameterManager(searchParams, setSearchParams), [searchParams, setSearchParams]);

  // --- State remains centralized ---
  const [viewType, setViewType] = useState(() => urlManager.getView());
  const [selectedLocation, setSelectedLocation] = useState(() => urlManager.getLocation());
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // --- Data fetching remains centralized ---
  const { data, metadata, loading, error, availableDates, models, availableTargets } = useForecastData(selectedLocation, viewType);
  
  const updateDatasetParams = useCallback((params) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (currentDataset) urlManager.updateDatasetParams(currentDataset, params);
  }, [viewType, urlManager]);
  

  useEffect(() => {
    if (!isForecastPage) {
      return;
    }
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (loading || !currentDataset || models.length === 0 || availableDates.length === 0) {
      return; // Do nothing until all necessary data is ready.
    }

    const params = urlManager.getDatasetParams(currentDataset);
    let needsUrlUpdate = false;

    let modelsToSet = [];
    if (params.models?.length > 0) {
      // If the URL specifies models, they take precedence.
      modelsToSet = params.models;
    } else if (currentDataset.defaultModel) {
      // Otherwise, fall back to the default model for the current view.
      modelsToSet = [currentDataset.defaultModel];
      needsUrlUpdate = true; // Mark that the URL should be updated to show this default.
    }
    
    let datesToSet = [];
    const validUrlDates = params.dates?.filter(date => availableDates.includes(date)) || [];
    if (validUrlDates.length > 0) {
      // If the URL specifies valid dates, they take precedence.
      datesToSet = validUrlDates;
    } else {
      // Otherwise, fall back to the latest available date from the data.
      const latestDate = availableDates[availableDates.length - 1];
      if (latestDate) {
        datesToSet = [latestDate];
      }
    }

    // 5. Apply all state updates at once.
    setSelectedModels(modelsToSet);
    setSelectedDates(datesToSet);
    setActiveDate(datesToSet[datesToSet.length - 1] || null);
    
    // 6. If we decided to use a default model, update the URL to match the state.
    if (needsUrlUpdate) {
      updateDatasetParams({ models: modelsToSet });
    }
  }, [isForecastPage, loading, viewType, models, availableDates, urlManager, updateDatasetParams]);

  useEffect(() => {
   if (loading || !availableTargets || availableTargets.length === 0) {
     console.log('Target useEffect: Skipping (loading or no targets)'); 
     return;
   }
   const isCurrentTargetValid = selectedTarget && availableTargets.includes(selectedTarget);
   console.log(`Target useEffect: Current target "${selectedTarget}", Valid: ${isCurrentTargetValid}, Available:`, availableTargets); 

   if (!isCurrentTargetValid) {
     console.log('Target useEffect: Setting default target to:', availableTargets[0]); 
     setSelectedTarget(availableTargets[0]);
   } else {
     console.log('Target useEffect: Current target is valid, doing nothing.');
   }
 }, [loading, availableTargets]);

  const handleLocationSelect = (newLocation) => {
    // Only update URL if the location is not the default
    if (newLocation !== 'US') {
      urlManager.updateLocation(newLocation);
    } else {
      // If returning to default, remove it from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('location');
      setSearchParams(newParams, { replace: true });
    }
    setSelectedLocation(newLocation);
  };

  const handleTargetSelect = (target) => {
    console.log('handleTargetSelect called with:', target);
    setSelectedTarget(target);
    // Note: NOT updating the URL with the selected target yet.
    // This can be added later if needed.
  };
  
  const handleViewChange = useCallback((newView) => {
    const oldView = viewType;
    if (oldView === newView) return;

    const oldDataset = urlManager.getDatasetFromView(oldView);
    const newDataset = urlManager.getDatasetFromView(newView);
    const newSearchParams = new URLSearchParams(searchParams);

    // Set the view in the URL, unless it's the default view with no other params
    if (newView !== 'flu_projs' || newSearchParams.toString().length > 0) {
      newSearchParams.set('view', newView);
    } else {
      newSearchParams.delete('view');
    }

    if (oldDataset?.shortName !== newDataset?.shortName) {
      setSelectedDates([]);
      setSelectedModels([]);
      setActiveDate(null);
      setSelectedTarget(null);
      if (oldDataset) {
        newSearchParams.delete(`${oldDataset.prefix}_models`);
        newSearchParams.delete(`${oldDataset.prefix}_dates`);
      }
      // Do not set default model in URL on view change
    }
    setViewType(newView);
    setSearchParams(newSearchParams, { replace: true });
  }, [viewType, searchParams, setSearchParams, urlManager]);

  const contextValue = {
    selectedLocation, handleLocationSelect,
    data, metadata, loading, error, availableDates, models,
    selectedModels, setSelectedModels: (updater) => {
      const resolveModels = (prevModels) => (
        typeof updater === 'function' ? updater(prevModels) : updater
      );

      const currentDataset = urlManager.getDatasetFromView(viewType);
      setSelectedModels(prevModels => {
        const nextModels = resolveModels(prevModels);
        const isDefault = JSON.stringify(nextModels) === JSON.stringify([currentDataset?.defaultModel]);

        if (isDefault) {
          // If the selection is now the default, update the URL by passing
          // an empty array, which tells urlManager to DELETE the parameter.
          updateDatasetParams({ models: [] });
        } else {
          // Otherwise, update the URL with the current selection.
          updateDatasetParams({ models: nextModels });
        }

        return nextModels;
      });
    },
    selectedDates, setSelectedDates: (updater) => {
      setSelectedDates(prevDates => {
        const nextDates = typeof updater === 'function' ? updater(prevDates) : updater;
        updateDatasetParams({ dates: nextDates });
        return nextDates;
      });
    },

    activeDate, setActiveDate,
    viewType, setViewType: handleViewChange,
    currentDataset: urlManager.getDatasetFromView(viewType),
    availableTargets,
    selectedTarget,
    handleTargetSelect,  // Expose handler for the selector component
  };

  console.log('ViewContext rendering with selectedTarget:', selectedTarget);

  return (
    <ViewContext.Provider value={contextValue}>
      {children}
    </ViewContext.Provider>
  );
};
