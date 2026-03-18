import { DATASETS } from "../config/datasets";

export const getDatasetTitleFromView = (viewType) => {
  if (!viewType) return null;
  for (const dataset of Object.values(DATASETS)) {
    if (dataset.views?.some((view) => view.value === viewType)) {
      return dataset.titleName || dataset.fullName || null;
    }
  }
  return null;
};
