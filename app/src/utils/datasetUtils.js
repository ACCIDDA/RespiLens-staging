import { DATASETS } from '../config/datasets';

export const getDatasetNameFromView = (viewType) => {
  if (!viewType) return null;
  for (const dataset of Object.values(DATASETS)) {
    if (dataset.views?.some((view) => view.value === viewType)) {
      return dataset.fullName || null;
    }
  }
  return null;
};
