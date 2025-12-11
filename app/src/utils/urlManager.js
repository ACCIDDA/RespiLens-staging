// src/utils/urlManager.js

import { DATASETS, APP_CONFIG } from '../config';

/**
 * URLParameterManager
 *
 * Manages query parameters for dataset-specific filters (dates, models, targets).
 * Note: View and location are now managed via path params in the URL, not query params.
 *
 * Example URLs:
 *   /forecasts/flu/california?dates=2024-01-01&models=FluSight-ensemble
 *   /forecasts/covid/texas?dates=2024-02-15&target=wk%20inc%20covid%20hosp
 */
export class URLParameterManager {
  constructor(searchParams, setSearchParams) {
    this.searchParams = searchParams;
    this.setSearchParams = setSearchParams;
  }

  // Get dataset from view type
  getDatasetFromView(viewType) {
    for (const dataset of Object.values(DATASETS)) {
      const hasMatchingView = dataset.views.some(view => view.value === viewType);
      if (hasMatchingView) {
        return dataset;
      }
    }
    return null;
  }

  // Get all parameters for a specific dataset
  // Note: currentView must be passed in since view is now in the path, not query params
  getDatasetParams(dataset, currentView) {
    if (!dataset) return {}; // Return empty object if dataset is null

    const prefix = dataset.prefix;
    const params = {};

    if (dataset.hasDateSelector) {
      const dates = this.searchParams.get(`${prefix}_dates`);
      params.dates = dates ? dates.split(',') : [];
    }

    if (dataset.hasModelSelector) {
      const models = this.searchParams.get(`${prefix}_models`);
      params.models = models ? models.split(',') : [];
    }

    // Read prefixed target
    // Check if the current view (derived from viewType) supports targets
    // Assuming NHSN ('nhsnall') is the only view without targets for now
    if (currentView !== 'nhsnall') {
        const target = this.searchParams.get(`${prefix}_target`);
        // Assign if found, otherwise it remains undefined in params object
        if (target) {
            params.target = target;
        }
    }

    // Special case for NHSN
    if (dataset.shortName === 'nhsn') {
      params.columns = this.searchParams.get('nhsn_columns')?.split(',') || [];
    }

    return params;
  }

  // Clear parameters for a specific dataset
  clearDatasetParams(dataset) {
    if (!dataset) {
      return;
    }
    const newParams = new URLSearchParams(this.searchParams);
    const prefix = dataset.prefix;

    if (dataset.hasDateSelector) {
      newParams.delete(`${prefix}_dates`);
    }
    if (dataset.hasModelSelector) {
      newParams.delete(`${prefix}_models`);
    }
    
    // --- ADDED: Clear prefixed target ---
    // Always attempt to delete the target parameter for this dataset prefix
    newParams.delete(`${prefix}_target`);
    // --- END ADDED LINE ---

    if (dataset.shortName === 'nhsn') {
      newParams.delete('nhsn_columns');
    }

    this.setSearchParams(newParams, { replace: true });
  }

  // Update parameters for a dataset
  // Note: currentView must be passed in since view is now in the path, not query params
  updateDatasetParams(dataset, currentView, newParams) {
    if (!dataset) {
      return;
    }
    const updatedParams = new URLSearchParams(this.searchParams);
    const prefix = dataset.prefix;

    // Update dates if present and dataset supports it
    // Check if 'dates' key exists in newParams before accessing it
    if (dataset.hasDateSelector && Object.prototype.hasOwnProperty.call(newParams, 'dates')) {
      if (newParams.dates && newParams.dates.length > 0) {
        updatedParams.set(`${prefix}_dates`, newParams.dates.join(','));
      } else {
        updatedParams.delete(`${prefix}_dates`); // Delete if empty array or null/undefined
      }
    }

    // Update models if present and dataset supports it
    // Check if 'models' key exists in newParams before accessing it
    if (dataset.hasModelSelector && Object.prototype.hasOwnProperty.call(newParams, 'models')) {
      if (newParams.models && newParams.models.length > 0) {
        updatedParams.set(`${prefix}_models`, newParams.models.join(','));
      } else {
        updatedParams.delete(`${prefix}_models`); // Delete if empty array or null/undefined
      }
    }

    // Update prefixed target
    // Update target if present (and not NHSN view)
    // Check if 'target' key exists in newParams before accessing it
    if (currentView !== 'nhsnall' && Object.prototype.hasOwnProperty.call(newParams, 'target')) {
        if (newParams.target) { // Check if target is truthy (not null, '', etc.)
            updatedParams.set(`${prefix}_target`, newParams.target);
        } else {
            // Delete the parameter if target is explicitly set to null/undefined/''
            updatedParams.delete(`${prefix}_target`);
        }
    }

    // Special case for NHSN columns
    // Check if 'columns' key exists in newParams before accessing it
    if (dataset.shortName === 'nhsn' && Object.prototype.hasOwnProperty.call(newParams, 'columns')) {
      if (newParams.columns && newParams.columns.length > 0) {
        updatedParams.set('nhsn_columns', newParams.columns.join(','));
      } else {
        updatedParams.delete('nhsn_columns'); // Delete if empty array or null/undefined
      }
    }

    // Only call setSearchParams if the parameters actually changed
    if (updatedParams.toString() !== this.searchParams.toString()) {
        this.setSearchParams(updatedParams, { replace: true });
    }
  }
}