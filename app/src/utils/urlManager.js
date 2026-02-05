import { DATASETS, APP_CONFIG } from '../config';

const DEFAULT_CHART_SCALE = 'linear';
const DEFAULT_INTERVAL_VISIBILITY = {
  median: true,
  ci50: true,
  ci95: true
};
const DEFAULT_SHOW_LEGEND = true;

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

  getAdvancedParams() {
    const scaleParam = this.searchParams.get('scale');
    const intervalsParam = this.searchParams.get('intervals');
    const legendParam = this.searchParams.get('legend');

    const chartScale = scaleParam || DEFAULT_CHART_SCALE;
    let intervalVisibility = { ...DEFAULT_INTERVAL_VISIBILITY };

    if (intervalsParam === 'none') {
      intervalVisibility = {
        median: false,
        ci50: false,
        ci95: false
      };
    } else if (intervalsParam) {
      const enabled = new Set(intervalsParam.split(',').filter(Boolean));
      intervalVisibility = {
        median: enabled.has('median'),
        ci50: enabled.has('ci50'),
        ci95: enabled.has('ci95')
      };
    }

    let showLegend = DEFAULT_SHOW_LEGEND;
    if (legendParam === '0' || legendParam === 'false') {
      showLegend = false;
    } else if (legendParam === '1' || legendParam === 'true') {
      showLegend = true;
    }

    return { chartScale, intervalVisibility, showLegend };
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

  updateAdvancedParams({ chartScale, intervalVisibility, showLegend }) {
    const updatedParams = new URLSearchParams(this.searchParams);

    if (chartScale) {
      if (chartScale !== DEFAULT_CHART_SCALE) {
        updatedParams.set('scale', chartScale);
      } else {
        updatedParams.delete('scale');
      }
    }

    if (intervalVisibility) {
      const enabled = ['median', 'ci50', 'ci95'].filter(key => intervalVisibility[key]);
      if (enabled.length === 0) {
        updatedParams.set('intervals', 'none');
      } else if (enabled.length === 3) {
        updatedParams.delete('intervals');
      } else {
        updatedParams.set('intervals', enabled.join(','));
      }
    }

    if (typeof showLegend === 'boolean') {
      if (showLegend !== DEFAULT_SHOW_LEGEND) {
        updatedParams.set('legend', showLegend ? '1' : '0');
      } else {
        updatedParams.delete('legend');
      }
    }

    if (updatedParams.toString() !== this.searchParams.toString()) {
      this.setSearchParams(updatedParams, { replace: true });
    }
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
