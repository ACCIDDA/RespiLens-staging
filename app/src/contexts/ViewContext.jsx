// src/contexts/ViewContext.jsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { URLParameterManager } from '../utils/urlManager';
import { useForecastData } from '../hooks/useForecastData';
import { DATASETS } from '../config/datasets';

const ViewContext = createContext(null);

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlManager = new URLParameterManager(searchParams, setSearchParams);

  // --- State remains centralized ---
  const [viewType, setViewType] = useState(() => urlManager.getView());
  const [selectedLocation, setSelectedLocation] = useState(() => urlManager.getLocation());
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // --- Data fetching remains centralized ---
  const { data, loading, error, availableDates, models } = useForecastData(selectedLocation, viewType);
  
  const updateDatasetParams = useCallback((params) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (currentDataset) urlManager.updateDatasetParams(currentDataset, params);
  }, [viewType, urlManager]);

  // Effect to initialize models and columns from URL, with defaults for a clean URL
  useEffect(() => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (!currentDataset) return;

    const params = urlManager.getDatasetParams(currentDataset);
    
    // Set models: use URL params if they exist, otherwise use the dataset's default model
    if (params.models?.length > 0) {
      setSelectedModels(params.models);
    } else if (currentDataset.defaultModel) {
      setSelectedModels([currentDataset.defaultModel]);
    }

    // Set columns for NHSN view
    if (currentDataset.shortName === 'nhsn') {
      if (params.columns?.length > 0) {
        setSelectedColumns(params.columns);
      } else if (currentDataset.defaultColumn) {
        const defaultCols = [currentDataset.defaultColumn];
        setSelectedColumns(defaultCols);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  const handleViewChange = useCallback((newView) => {
    const oldView = viewType;
    if (oldView === newView) return;

    const oldDataset = urlManager.getDatasetFromView(oldView);
    const newDataset = urlManager.getDatasetFromView(newView);
    const newSearchParams = new URLSearchParams(searchParams);

    // Set the view in the URL, unless it's the default view with no other params
    if (newView !== 'fludetailed' || newSearchParams.toString().length > 0) {
      newSearchParams.set('view', newView);
    } else {
      newSearchParams.delete('view');
    }

    if (oldDataset?.shortName !== newDataset?.shortName) {
      setSelectedDates([]);
      setSelectedModels([]);
      setSelectedColumns([]);
      setActiveDate(null);
      if (oldDataset) {
        newSearchParams.delete(`${oldDataset.prefix}_models`);
        newSearchParams.delete(`${oldDataset.prefix}_dates`);
        if (oldDataset.shortName === 'nhsn') {
          newSearchParams.delete('nhsn_columns');
        }
      }
      // Do not set default model in URL on view change
    }
    setViewType(newView);
    setSearchParams(newSearchParams, { replace: true });
  }, [viewType, searchParams, setSearchParams, urlManager]);

  const contextValue = {
    selectedLocation, handleLocationSelect,
    data, loading, error, availableDates, models,
    selectedModels, setSelectedModels: (models) => { 
      const currentDataset = urlManager.getDatasetFromView(viewType);
      // Only update URL if models are not the default
      if (JSON.stringify(models) !== JSON.stringify([currentDataset?.defaultModel])) {
        updateDatasetParams({ models }); 
      }
      setSelectedModels(models);
    },
    selectedDates, setSelectedDates: (dates) => { setSelectedDates(dates); updateDatasetParams({ dates }); },
    selectedColumns, setSelectedColumns: (columns) => { 
      const currentDataset = urlManager.getDatasetFromView(viewType);
      
      if (currentDataset?.shortName === 'nhsn') {
        const defaultColumn = currentDataset.defaultColumn;
        // Check if the current selection is the default
        const isDefault = columns.length === 1 && columns[0] === defaultColumn;
        
        if (isDefault) {
          // If returning to default, REMOVE the parameter from the URL
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('nhsn_columns');
          setSearchParams(newParams, { replace: true });
        } else {
          // If it's not the default, UPDATE the URL
          updateDatasetParams({ columns });
        }
      }
      // Always update the state itself
      setSelectedColumns(columns);
    },

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