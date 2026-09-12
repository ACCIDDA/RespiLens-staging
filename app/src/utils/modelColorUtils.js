import { MODEL_COLORS } from "../config/datasets";

export const extendStableModelOrder = (
  previousOrder = [],
  selectedModels = [],
) => {
  const nextOrder = [...previousOrder];

  selectedModels.forEach((model) => {
    if (!nextOrder.includes(model)) {
      nextOrder.push(model);
    }
  });

  return nextOrder;
};

export const getStablePaletteColor = (model, modelOrder = []) => {
  const index = modelOrder.indexOf(model);
  return index >= 0 ? MODEL_COLORS[index % MODEL_COLORS.length] : undefined;
};
