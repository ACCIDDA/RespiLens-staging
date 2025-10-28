// src/utils/urlManager.js

import { DATASETS } from '../config/datasets';

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
  getDatasetParams(dataset) {
    if (!dataset) return {}; // Return empty object if dataset is null

    const prefix = dataset.prefix;
    const params = {};
    const currentView = this.getView(); // Get the current view type

    if (dataset.hasDateSelector) {
      const dates = this.searchParams.get(`${prefix}_dates`);
      params.dates = dates ? dates.split(',') : [];
    }

    if (dataset.hasModelSelector) {
      const models = this.searchParams.get(`${prefix}_models`);
      params.models = models ? models.split(',') : [];
    }

    // --- ADDED: Read prefixed target ---
    // Check if the current view (derived from viewType) supports targets
    // Assuming NHSN ('nhsnall') is the only view without targets for now
    if (currentView !== 'nhsnall') {
        const target = this.searchParams.get(`${prefix}_target`);
        // Assign if found, otherwise it remains undefined in params object
        if (target) {
            params.target = target;
        }
    }
    // --- END ADDED BLOCK ---

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
  updateDatasetParams(dataset, newParams) {
    if (!dataset) {
      return;
    }
    const updatedParams = new URLSearchParams(this.searchParams);
    const prefix = dataset.prefix;
    const currentView = this.getView(); // Get the current view type

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

    // --- ADDED: Update prefixed target ---
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
    // --- END ADDED BLOCK ---


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


  // Update location parameter while preserving all other params
  updateLocation(location) {
    const newParams = new URLSearchParams(this.searchParams);
    if (location && location !== 'US') {
        newParams.set('location', location);
    } else {
        newParams.delete('location'); // Remove if 'US' or falsy
    }
    if (newParams.toString() !== this.searchParams.toString()) {
      this.setSearchParams(newParams, { replace: true });
    }
  }

  // Get current location from URL
  getLocation() {
    return this.searchParams.get('location') || 'US';
  }

  // Get current view from URL
  getView() {
    // Use DATASETS config to find the default view if not in URL
    const viewParam = this.searchParams.get('view');
    const allViews = Object.values(DATASETS).flatMap(ds => ds.views.map(v => v.value));
    if (viewParam && allViews.includes(viewParam)) {
        return viewParam;
    }
    // Find the default view of the default dataset (e.g., flu)
    const defaultDatasetKey = Object.keys(DATASETS)[0]; // Assuming first dataset is overall default
    return DATASETS[defaultDatasetKey]?.defaultView || 'flu_projs'; // Fallback needed
  }

  // Initialize URL with defaults if missing (Less critical now with context handling)
  initializeDefaults() {
    // This might interfere with context logic, consider removing or simplifying
    // If kept, ensure it doesn't overwrite params set by context useEffects
    console.warn("urlManager.initializeDefaults might be redundant or conflict with ViewContext.");
    // const newParams = new URLSearchParams(this.searchParams);
    // let updated = false;
    //
    // if (!this.searchParams.get('view')) {
    //   newParams.set('view', this.getView()); // Use the getter which has default logic
    //   updated = true;
    // }
    //
    // if (!this.searchParams.get('location')) {
    //   newParams.set('location', 'US');
    //   updated = true;
    // }
    //
    // if (updated) {
    //   this.setSearchParams(newParams, { replace: true });
    // }
  }
}