import { DATASETS, APP_CONFIG } from '../config';

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

  getDatasetParams(dataset) {
    if (!dataset) return {}; 

    const prefix = dataset.prefix;
    const params = {};
    const currentView = this.getView(); 

    if (dataset.hasDateSelector) {
      const dates = this.searchParams.get(`${prefix}_dates`);
      params.dates = dates ? dates.split(',') : [];
    }

    if (dataset.hasModelSelector) {
      const models = this.searchParams.get(`${prefix}_models`);
      params.models = models ? models.split(',') : [];
    }

    if (currentView !== 'nhsnall') {
        const target = this.searchParams.get(`${prefix}_target`);
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

    newParams.delete(`${prefix}_target`);

    if (dataset.shortName === 'nhsn') {
      newParams.delete('nhsn_columns');
    }

    this.setSearchParams(newParams, { replace: true });
  }

  updateDatasetParams(dataset, newParams) {
    if (!dataset) {
      return;
    }
    const updatedParams = new URLSearchParams(this.searchParams);
    const prefix = dataset.prefix;
    const currentView = this.getView(); 


    if (dataset.hasDateSelector && Object.prototype.hasOwnProperty.call(newParams, 'dates')) {
      if (newParams.dates && newParams.dates.length > 0) {
        updatedParams.set(`${prefix}_dates`, newParams.dates.join(','));
      } else {
        updatedParams.delete(`${prefix}_dates`); 
      }
    }

    if (dataset.hasModelSelector && Object.prototype.hasOwnProperty.call(newParams, 'models')) {
      if (newParams.models && newParams.models.length > 0) {
        updatedParams.set(`${prefix}_models`, newParams.models.join(','));
      } else {
        updatedParams.delete(`${prefix}_models`); 
      }
    }

 
    if (currentView !== 'nhsnall' && Object.prototype.hasOwnProperty.call(newParams, 'target')) {
        if (newParams.target) {
            updatedParams.set(`${prefix}_target`, newParams.target);
        } else {
            updatedParams.delete(`${prefix}_target`);
        }
    }

    if (dataset.shortName === 'nhsn' && Object.prototype.hasOwnProperty.call(newParams, 'columns')) {
      if (newParams.columns && newParams.columns.length > 0) {
        updatedParams.set('nhsn_columns', newParams.columns.join(','));
      } else {
        updatedParams.delete('nhsn_columns');
      }
    }

    // Only call setSearchParams if the parameters actually changed
    if (updatedParams.toString() !== this.searchParams.toString()) {
        this.setSearchParams(updatedParams, { replace: true });
    }
  }


  updateLocation(location, effectiveDefault = APP_CONFIG.defaultLocation) {
    const newParams = new URLSearchParams(this.searchParams);
    
    // If the location matches the specific default for this view, remove it from URL
    if (location && location !== effectiveDefault) {
        newParams.set('location', location);
    } else {
        newParams.delete('location'); 
    }
    
    if (newParams.toString() !== this.searchParams.toString()) {
      this.setSearchParams(newParams, { replace: true });
    }
  }

  // Get current location from URL
  getLocation() {
    return this.searchParams.get('location') || APP_CONFIG.defaultLocation;
  }

  // Get current view from URL
  getView() {
    const viewParam = this.searchParams.get('view');
    const allViews = Object.values(DATASETS).flatMap(ds => ds.views.map(v => v.value));
    if (viewParam) {
      if (viewParam === APP_CONFIG.defaultView) {
        return viewParam;
      }
      if (allViews.includes(viewParam)) {
        return viewParam;
      }
    }
    if (APP_CONFIG.defaultView) {
      return APP_CONFIG.defaultView;
    }
    const defaultDatasetKey = APP_CONFIG.defaultDataset;
    return DATASETS[defaultDatasetKey]?.defaultView;
  }
  initializeDefaults() {
  }
}
