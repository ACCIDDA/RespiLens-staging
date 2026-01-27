export const DATASETS = {
  flu: {
    shortName: 'flu',
    fullName: 'Flu Forecasts',
    views: [
      { key: 'detailed', label: 'Detailed View', value: 'fludetailed' },
      { key: 'projections', label: 'Projections', value: 'flu_projs' },
      { key: 'peak', label: "Peak", value: 'flu_peak'}
    ],
    defaultView: 'flu_projs',
    defaultModel: 'FluSight-ensemble',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'flu',
    dataPath: 'flusight',
    targetLineDayOfWeek: 3 // Wednesday (0=Sunday, 3=Wednesday)
  },
  rsv: {
    shortName: 'rsv',
    fullName: 'RSV Forecasts',
    views: [
      { key: 'projections', label: 'Projections', value: 'rsv_projs' }
    ],
    defaultView: 'rsv_projs',
    defaultModel: 'RSVHub-ensemble',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'rsv',
    dataPath: 'rsv',
    targetLineDayOfWeek: 3 // Wednesday (0=Sunday, 3=Wednesday)
  },
  covid: {
    shortName: 'covid',
    fullName: 'COVID-19 Forecasts',
    views: [
      { key: 'projections', label: 'Projections', value: 'covid_projs' }
    ],
    defaultView: 'covid_projs',
    defaultModel: 'CovidHub-ensemble',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'covid',
    dataPath: 'covid19',
    targetLineDayOfWeek: 3 // Wednesday (0=Sunday, 3=Wednesday)
  },
  nhsn: {
    shortName: 'nhsn',
    fullName: 'CDC Respiratory Data',
    views: [
      { key: 'all', label: 'All Data', value: 'nhsnall' }
    ],
    defaultView: 'nhsnall',
    defaultColumn: 'Number of Adult COVID-19 Admissions, 18-49 years',
    hasDateSelector: false,
    hasModelSelector: false,
    prefix: 'nhsn',
    dataPath: 'nhsn'
  },
  metrocast: {
    shortName: 'metrocast',
    fullName: 'Flu MetroCast Forecasts',
    views: [
      { key: 'projections', label: 'Projections', value: 'metrocast_projs' }
    ],
    defaultView: 'metrocast_projs',
    defaultModel: 'epiENGAGE-ensemble_mean', 
    defaultLocation: 'colorado',
    hasDateSelector: true,
    hasModelSelector: true,
    prefix: 'metrocast',
    dataPath: 'flumetrocast', 
    targetLineDayOfWeek: 3
},
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
