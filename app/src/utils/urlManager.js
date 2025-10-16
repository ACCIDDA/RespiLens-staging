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

    // Update dates if present and dataset supports it
    if (dataset.hasDateSelector && newParams.dates) {
      if (newParams.dates.length > 0) {
        updatedParams.set(`${prefix}_dates`, newParams.dates.join(','));
      } else {
        updatedParams.delete(`${prefix}_dates`);
      }
    }

    // Update models if present and dataset supports it
    if (dataset.hasModelSelector && newParams.models) {
      if (newParams.models.length > 0) {
        updatedParams.set(`${prefix}_models`, newParams.models.join(','));
      } else {
        updatedParams.delete(`${prefix}_models`);
      }
    }

    // Special case for NHSN columns
    if (dataset.shortName === 'nhsn' && newParams.columns) {
      if (newParams.columns.length > 0) {
        updatedParams.set('nhsn_columns', newParams.columns.join(','));
      } else {
        updatedParams.delete('nhsn_columns');
      }
    }

    this.setSearchParams(updatedParams, { replace: true });
  }

  // Handle view type changes
  handleViewChange(oldView, newView) {
    const oldDataset = this.getDatasetFromView(oldView);
    const newDataset = this.getDatasetFromView(newView);

    // If switching between datasets, clear old dataset's parameters
    if (oldDataset?.shortName !== newDataset?.shortName) {
      this.clearDatasetParams(oldDataset);
    }

    // Update view parameter
    const newParams = new URLSearchParams(this.searchParams);
    newParams.set('view', newView);
    this.setSearchParams(newParams, { replace: true });
  }

  // Update location parameter while preserving all other params
  updateLocation(location) {
    const newParams = new URLSearchParams(this.searchParams);
    newParams.set('location', location);
    this.setSearchParams(newParams, { replace: true });
  }

  // Get current location from URL
  getLocation() {
    return this.searchParams.get('location') || 'US';
  }

  // Get current view from URL
  getView() {
    return this.searchParams.get('view') || 'flu_ts';
  }

  // Initialize URL with defaults if missing
  initializeDefaults() {
    const newParams = new URLSearchParams(this.searchParams);
    let updated = false;

    if (!this.searchParams.get('view')) {
      newParams.set('view', 'flu_ts');
      updated = true;
    }

    if (!this.searchParams.get('location')) {
      newParams.set('location', 'US');
      updated = true;
    }

    if (updated) {
      this.setSearchParams(newParams, { replace: true });
    }
  }

}
