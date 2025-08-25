export const DATASETS = {
  flu: {
    shortName: 'flu',
    fullName: 'FluSight',
    views: [
      { key: 'detailed', label: 'Detailed View', value: 'fludetailed' },
      { key: 'timeseries', label: 'Time Series', value: 'flutimeseries' }
    ],
    defaultView: 'fludetailed',
    defaultModel: 'FluSight-ensemble',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'flu',
    dataPath: 'flusight'
  },
  rsv: {
    shortName: 'rsv',
    fullName: 'RSV Forecast Hub',
    views: [
      { key: 'detailed', label: 'Detailed View', value: 'rsvdetailed' }
    ],
    defaultView: 'rsvdetailed',
    defaultModel: 'hub-ensemble',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'rsv',
    dataPath: 'rsv'
  },
  covid: {
    shortName: 'covid',
    fullName: 'COVID-19 Forecast Hub',
    views: [
      { key: 'detailed', label: 'Detailed View', value: 'coviddetailed' }
    ],
    defaultView: 'coviddetailed',
    defaultModel: 'COVIDHub-ensemble',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'covid',
    dataPath: 'covid19' // TODO 
  },
  nhsn: {
    shortName: 'nhsn',
    fullName: 'NHSN Raw Data',
    views: [
      { key: 'all', label: 'All Data', value: 'nhsnall' }
    ],
    defaultView: 'nhsnall',
    hasDateSelector: false,
    hasModelSelector: false,
    prefix: 'nhsn',
    dataPath: 'nhsn'
  }
};

// Helper function to get all valid view values
export const getAllViewValues = () => {
  return Object.values(DATASETS).flatMap(dataset => 
    dataset.views.map(view => view.value)
  );
};

// Import centralized colors from theme
import { MODEL_COLORS, getModelColor } from '../theme/mantine.js';

// Re-export for backward compatibility
export { MODEL_COLORS, getModelColor };
