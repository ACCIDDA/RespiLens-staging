// src/contexts/ViewContext.jsx

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { URLParameterManager } from '../utils/urlManager';
import { useForecastData } from '../hooks/useForecastData';
import { ViewContext } from './ViewContextObject';
import { APP_CONFIG } from '../config';

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isForecastPage = location.pathname === '/';

  const urlManager = useMemo(() => new URLParameterManager(searchParams, setSearchParams), [searchParams, setSearchParams]);

  const [viewType, setViewType] = useState(() => urlManager.getView());
  const [selectedLocation, setSelectedLocation] = useState(() => urlManager.getLocation());
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const { data, metadata, loading, error, availableDates, models, availableTargets, modelsByTarget } = useForecastData(selectedLocation, viewType);

  const updateDatasetParams = useCallback((params) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (currentDataset) urlManager.updateDatasetParams(currentDataset, params);
  }, [viewType, urlManager]);

  const modelsForView = useMemo(() => {
    // Handle the special 'fludetailed' view, which has two hardcoded targets
    if (viewType === 'fludetailed') {
      const target1Models = new Set(modelsByTarget['wk inc flu hosp'] || []);
      const target2Models = new Set(modelsByTarget['wk flu hosp rate change'] || []);
      // Combine models from both targets
      return Array.from(new Set([...target1Models, ...target2Models])).sort();
    }

    // For all other views, just use the selectedTarget
    if (selectedTarget && modelsByTarget[selectedTarget]) {
      return modelsByTarget[selectedTarget];
    }
    
    // Default to an empty list (or the original location-based list)
    // Using an empty list is safer to prevent showing models that have no data
    return []; 
  }, [selectedTarget, modelsByTarget, viewType]);

  // --- Main useEffect to sync URL params TO state ---
  useEffect(() => {
    if (!isForecastPage) {
      return;
    }
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (loading || !currentDataset || modelsForView.length === 0 || availableDates.length === 0 || availableTargets.length === 0) {
      return;
    }

    const params = urlManager.getDatasetParams(currentDataset);
    let needsModelUrlUpdate = false;

    // --- Model Logic ---
    let modelsToSet = [];
    const validUrlModels = params.models?.filter(m => modelsForView.includes(m)) || []; 
    if (validUrlModels.length > 0) {
        modelsToSet = validUrlModels;
    } else if (currentDataset.defaultModel && modelsForView.includes(currentDataset.defaultModel)) {
        modelsToSet = [currentDataset.defaultModel];
        needsModelUrlUpdate = true; 
    } else if (modelsForView.length > 0) {
        modelsToSet = [modelsForView[0]]; 
        needsModelUrlUpdate = true; 
    }

    // --- Date Logic ---
    let datesToSet = [];
    const validUrlDates = params.dates?.filter(date => availableDates.includes(date)) || [];
    if (validUrlDates.length > 0) {
      datesToSet = validUrlDates;
    } else {
      const latestDate = availableDates[availableDates.length - 1];
      if (latestDate) {
        datesToSet = [latestDate];
      }
    }

    // --- Target Logic ---
    const urlTarget = params.target;
    let targetToSet = null;
    if (urlTarget && availableTargets.includes(urlTarget)) {
        targetToSet = urlTarget;
    }

    // --- Apply State Updates ---
    setSelectedModels(current => JSON.stringify(current) !== JSON.stringify(modelsToSet) ? modelsToSet : current);
    setSelectedDates(current => JSON.stringify(current) !== JSON.stringify(datesToSet) ? datesToSet : current);
    setActiveDate(datesToSet.length > 0 ? datesToSet[datesToSet.length - 1] : null);

    if (targetToSet && targetToSet !== selectedTarget) {
      setSelectedTarget(targetToSet);
    }

    // --- Update URL if needed ---
    if (needsModelUrlUpdate) {
      updateDatasetParams({ models: [] }); 
    }
  }, [isForecastPage, loading, viewType, models, availableDates, availableTargets, urlManager, updateDatasetParams, selectedTarget, modelsForView]);

  useEffect(() => {
    const availableModelsSet = new Set(modelsForView);
    const cleanedSelectedModels = selectedModels.filter(model =>
      availableModelsSet.has(model)
    );

    // Only update state if the list has actually changed
    if (cleanedSelectedModels.length !== selectedModels.length) {
      setSelectedModels(cleanedSelectedModels);
    }
    // This runs whenever the final list of available models changes
  }, [modelsForView, selectedModels]);

  // --- useEffect to set DEFAULT target ---
  useEffect(() => {
    if (loading || !availableTargets || availableTargets.length === 0) {
      return;
    }
    const isCurrentTargetValid = selectedTarget && availableTargets.includes(selectedTarget);
    if (!isCurrentTargetValid) {
      setSelectedTarget(availableTargets[0]);
    }
  }, [loading, availableTargets, selectedTarget]);


  const handleLocationSelect = (newLocation) => {
    if (newLocation !== APP_CONFIG.defaultLocation) {
      urlManager.updateLocation(newLocation);
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('location');
      setSearchParams(newParams, { replace: true });
    }
    setSelectedLocation(newLocation);
  };

  const handleTargetSelect = (target) => {
    if (!target) return;
    setSelectedTarget(target);
    updateDatasetParams({ target: target });
  };

  const handleViewChange = useCallback((newView) => {
    const oldView = viewType;
    if (oldView === newView) return;

    const oldDataset = urlManager.getDatasetFromView(oldView);
    const newDataset = urlManager.getDatasetFromView(newView);
    const newSearchParams = new URLSearchParams(searchParams);

    if (newView !== APP_CONFIG.defaultView || newSearchParams.toString().length > 0) {
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
        newSearchParams.delete(`${oldDataset.prefix}_target`);
      }
      // --- ADDED: Clean up NHSN params when leaving ---
        if (oldDataset.shortName === 'nhsn') {
          newSearchParams.delete('nhsn_target');
          newSearchParams.delete('nhsn_cols');
        }
        // --- END ADDITION ---
    } else {
      if (newDataset) {
         newSearchParams.delete(`${newDataset.prefix}_target`);
      }
      setSelectedTarget(null);
    }

    setViewType(newView);
    setSearchParams(newSearchParams, { replace: true });
  }, [viewType, searchParams, setSearchParams, urlManager]);

  const contextValue = {
    selectedLocation, handleLocationSelect,
    data, metadata, loading, error, availableDates, models: modelsForView,
    selectedModels, setSelectedModels: (updater) => {
      const resolveModels = (prevModels) => (
        typeof updater === 'function' ? updater(prevModels) : updater
      );
      const currentDataset = urlManager.getDatasetFromView(viewType);
      setSelectedModels(prevModels => {
        const nextModels = resolveModels(prevModels);
        const defaultModel = currentDataset?.defaultModel ? [currentDataset.defaultModel] : [];
        const isDefault = JSON.stringify(nextModels.slice().sort()) === JSON.stringify(defaultModel.slice().sort());
        updateDatasetParams({ models: isDefault ? [] : nextModels });
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
    handleTargetSelect,
  };

  return (
    <ViewContext.Provider value={contextValue}>
      {children}
    </ViewContext.Provider>
  );
};