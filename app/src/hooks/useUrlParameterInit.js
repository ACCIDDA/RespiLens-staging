import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllViewValues } from '../config/datasets';
import { DEFAULT_MODELS } from '../constants/chart';

/**
 * Custom hook to initialize component state from URL parameters
 * Handles dates, models, and view type initialization
 */
export const useUrlParameterInit = ({
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
}) => {
  const [searchParams] = useSearchParams();

  // Initialize view type from URL
  useEffect(() => {
    const urlView = searchParams.get('view');
    const validViews = getAllViewValues();
    if (urlView && validViews.includes(urlView)) {
      setViewType(urlView);
    }
  }, [searchParams, setViewType]);

  // Initialize dates and models from URL parameters
  useEffect(() => {
    if (!loading && data && availableDates.length > 0 && models.length > 0 &&
        (selectedDates.length === 0 || selectedModels.length === 0)) {

      const prefix = getDatasetPrefix(viewType);
      const urlDates = searchParams.get(`${prefix}_dates`)?.split(',') || [];
      const urlModels = searchParams.get(`${prefix}_models`)?.split(',') || [];

      // Initialize dates
      if (selectedDates.length === 0) {
        initializeDatesFromUrl(urlDates, availableDates, setSelectedDates, setActiveDate);
      }

      // Initialize models
      if (selectedModels.length === 0) {
        initializeModelsFromUrl(urlModels, models, viewType, setSelectedModels);
      }
    }
  }, [loading, data, availableDates, models, viewType, selectedDates.length, selectedModels.length, searchParams, setSelectedDates, setSelectedModels, setActiveDate]);
};

// Helper function to get dataset prefix from view type
function getDatasetPrefix(viewType) {
  if (viewType === 'rsvdetailed') return 'rsv';
  if (viewType === 'nhsnall') return 'nhsn';
  return 'flu';
}

// Helper function to initialize dates from URL
function initializeDatesFromUrl(urlDates, availableDates, setSelectedDates, setActiveDate) {
  const validDates = urlDates
    .filter(date => availableDates.includes(date))
    .sort();

  if (validDates.length > 0) {
    setSelectedDates(validDates);
    setActiveDate(validDates[validDates.length - 1]);
  } else {
    const latestDate = availableDates[availableDates.length - 1];
    setSelectedDates([latestDate]);
    setActiveDate(latestDate);
  }
}

// Helper function to initialize models from URL
function initializeModelsFromUrl(urlModels, models, viewType, setSelectedModels) {
  const requestedModels = urlModels.filter(Boolean);
  
  if (requestedModels.length > 0) {
    const validModels = requestedModels.filter(model => models.includes(model));
    
    if (validModels.length > 0) {
      setSelectedModels(validModels);
      return;
    }
  }

  // Set default model if no valid models found
  const defaultModel = getDefaultModelForView(viewType, models);
  setSelectedModels([defaultModel]);
}

// Helper function to get default model for a view type
function getDefaultModelForView(viewType, models) {
  if (viewType === 'rsvdetailed') {
    return models.includes(DEFAULT_MODELS.RSV) ? DEFAULT_MODELS.RSV : models[0];
  } else {
    return models.includes(DEFAULT_MODELS.FLU) ? DEFAULT_MODELS.FLU : models[0];
  }
}