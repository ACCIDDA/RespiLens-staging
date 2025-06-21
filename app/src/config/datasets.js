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

export const MODEL_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
];

export const getModelColor = (model, selectedModels) => {
  const index = selectedModels.indexOf(model);
  return index >= 0 ? MODEL_COLORS[index % MODEL_COLORS.length] : null;
};
