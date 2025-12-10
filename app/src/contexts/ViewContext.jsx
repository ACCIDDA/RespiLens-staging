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

  const { data, metadata, loading, error, availableDates, models, availableTargets, modelsByTarget, peaks, availablePeakDates, availablePeakModels } = useForecastData(selectedLocation, viewType);

  const availableDatesToExpose = useMemo(() => {
    if (viewType === 'flu_peak') {
      return availablePeakDates || [];
    }
    return availableDates || [];
  }, [viewType, availablePeakDates, availableDates]);
  
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

    if (viewType === 'flu_peak') {
      // Use the list calculated in useForecastData.js from the peaks data
      return availablePeakModels || [];
    }

    // For all other views, just use the selectedTarget
    if (selectedTarget && modelsByTarget[selectedTarget]) {
      return modelsByTarget[selectedTarget];
    }
    
    // Default to an empty list (or the original location-based list)
    // Using an empty list is safer to prevent showing models that have no data
    return []; 
  }, [selectedTarget, modelsByTarget, viewType, availablePeakModels]); // Dependency added

  const availableTargetsToExpose = useMemo(() => {
    if (viewType === 'flu_peak') {
      return [];
    }
    
    const peakTargets = ['peak inc flu hosp', 'peak week inc flu hosp'];
    
    return availableTargets.filter(target => !peakTargets.includes(target));
  }, [availableTargets, viewType]);


  useEffect(() => {
    if (!isForecastPage) {
      return;
    }
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (loading || !currentDataset || modelsForView.length === 0 || availableDatesToExpose.length === 0 || availableTargets.length === 0) {
      return;
    }

    const params = urlManager.getDatasetParams(currentDataset);
    let needsModelUrlUpdate = false;

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

    let datesToSet = [];
    const validUrlDates = params.dates?.filter(date => availableDatesToExpose.includes(date)) || [];
    if (validUrlDates.length > 0) {
      datesToSet = validUrlDates;
    } else {
      const latestDate = availableDatesToExpose[availableDatesToExpose.length - 1];
      if (latestDate) {
        datesToSet = [latestDate];
      }
    }

    const urlTarget = params.target;
    let targetToSet = null;
    if (urlTarget && availableTargets.includes(urlTarget)) {
        targetToSet = urlTarget;
    }

    setSelectedModels(current => JSON.stringify(current) !== JSON.stringify(modelsToSet) ? modelsToSet : current);
    setSelectedDates(current => JSON.stringify(current) !== JSON.stringify(datesToSet) ? datesToSet : current);
    setActiveDate(datesToSet.length > 0 ? datesToSet[datesToSet.length - 1] : null);

    if (targetToSet && targetToSet !== selectedTarget) {
      setSelectedTarget(targetToSet);
    }

    if (needsModelUrlUpdate) {
      updateDatasetParams({ models: [] }); 
    }
    // Add availableDatesToExpose to dependency array since we use it in the logic
  }, [isForecastPage, loading, viewType, models, availableTargets, urlManager, updateDatasetParams, selectedTarget, modelsForView, availableDatesToExpose]);

  useEffect(() => {
    const availableModelsSet = new Set(modelsForView);
    const cleanedSelectedModels = selectedModels.filter(model =>
      availableModelsSet.has(model)
    );

    if (cleanedSelectedModels.length !== selectedModels.length) {
      setSelectedModels(cleanedSelectedModels);
    }
  }, [modelsForView, selectedModels]);

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
        if (oldDataset.shortName === 'nhsn') {
          newSearchParams.delete('nhsn_target');
          newSearchParams.delete('nhsn_cols');
        }
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
    data, metadata, loading, error, 
    // ✅ Use the exposed dates in the context value
    availableDates: availableDatesToExpose, 
    models: modelsForView,
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
    
    // CORE CHANGE: Use the coerced target list
    availableTargets: availableTargetsToExpose, 
    
    selectedTarget,
    handleTargetSelect,
    // Include all new peak data in the context
    peaks,
    availablePeakDates, 
    availablePeakModels 
  };

  return (
    <ViewContext.Provider value={contextValue}>
      {children}
    </ViewContext.Provider>
  );
};