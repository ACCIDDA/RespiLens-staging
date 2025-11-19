import { useMemo, useState, useCallback } from 'react';
import {
  scoreModelsWithTimeWindow,
  getModelRankings,
  getTopNModels,
} from '../utils/modelRankingScoring';

/**
 * Hook for managing model scoring and ranking
 * @param {Object} data - Forecast data object with forecasts and ground_truth
 * @param {Array} availableDates - All available forecast dates
 * @param {string} target - Target variable to score
 * @param {Array} availableModels - All available models for this target
 * @returns {Object} Scoring state and controls
 */
const useModelScoring = (data, availableDates, target, availableModels = []) => {
  const [timeWindow, setTimeWindow] = useState('all'); // 'all', '1week', '2weeks', '4weeks', '8weeks'
  const [topN, setTopN] = useState(3); // Number of top models to highlight
  const [horizons, setHorizons] = useState([1, 2, 3]); // Forecast horizons to evaluate

  // Convert time window to weeks
  const weeksBack = useMemo(() => {
    switch (timeWindow) {
      case '1week':
        return 1;
      case '2weeks':
        return 2;
      case '4weeks':
        return 4;
      case '8weeks':
        return 8;
      case 'all':
      default:
        return null;
    }
  }, [timeWindow]);

  // Calculate model scores
  const modelScores = useMemo(() => {
    if (!data || !data.forecasts || !data.ground_truth || !target || !availableDates) {
      return [];
    }

    return scoreModelsWithTimeWindow(
      data.forecasts,
      data.ground_truth,
      availableDates,
      target,
      {
        weeksBack,
        horizons,
        modelsToScore: null, // Score all available models
      }
    );
  }, [data, availableDates, target, weeksBack, horizons]);

  // Get ranked models with labels
  const rankedModels = useMemo(() => {
    return getModelRankings(modelScores, topN);
  }, [modelScores, topN]);

  // Get just the top N model names
  const topNModelNames = useMemo(() => {
    return getTopNModels(modelScores, topN);
  }, [modelScores, topN]);

  // Callback to apply top N models to selection
  const selectTopNModels = useCallback(() => {
    return topNModelNames;
  }, [topNModelNames]);

  // Get time window label for display
  const timeWindowLabel = useMemo(() => {
    switch (timeWindow) {
      case '1week':
        return 'Past Week';
      case '2weeks':
        return 'Past 2 Weeks';
      case '4weeks':
        return 'Past 4 Weeks';
      case '8weeks':
        return 'Past 8 Weeks';
      case 'all':
      default:
        return 'All Available Dates';
    }
  }, [timeWindow]);

  // Get number of dates evaluated
  const datesEvaluated = useMemo(() => {
    if (!modelScores || modelScores.length === 0) {
      return 0;
    }
    // All models should have the same dateCount, so use the first one
    return modelScores[0]?.dateCount || 0;
  }, [modelScores]);

  return {
    // Scoring results
    modelScores,
    rankedModels,
    topNModelNames,

    // Controls
    timeWindow,
    setTimeWindow,
    topN,
    setTopN,
    horizons,
    setHorizons,

    // Helper functions
    selectTopNModels,

    // Display information
    timeWindowLabel,
    datesEvaluated,

    // State flags
    hasScores: modelScores.length > 0,
  };
};

export default useModelScoring;
