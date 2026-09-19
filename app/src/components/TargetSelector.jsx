import { useView } from "../hooks/useView";
import { FORECAST_VIEWS } from "../hooks/useKeyboardShortcut";
import { targetDisplayNameMap } from "../utils/mapUtils";
import InlinePicker from "./InlinePicker";

// Renders nothing for views without targets (surveillance); the caller
// falls back to the dataset name.
const TargetSelector = () => {
  const { availableTargets, selectedTarget, handleTargetSelect, viewType } =
    useView();

  if (!availableTargets || availableTargets.length < 1) return null;

  const data = availableTargets.map((target) => ({
    value: target,
    label: targetDisplayNameMap[target] || target,
  }));

  return (
    <InlinePicker
      value={selectedTarget}
      data={data}
      onChange={handleTargetSelect}
      dropdownWidth={360}
      shortcut={FORECAST_VIEWS.has(viewType) ? "t" : null}
      shortcutLabel="Change target"
      aria-label="Select target metric for forecasting data"
    />
  );
};

export default TargetSelector;
