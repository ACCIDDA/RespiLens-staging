import { Select, Stack } from '@mantine/core';
import { useView } from '../hooks/useView';
import { targetDisplayNameMap } from '../utils/mapUtils';

const TargetSelector = () => {
  // Get the target-related state and functions from our central context
  const { availableTargets, selectedTarget, handleTargetSelect } = useView();

  // Disable the selector if there's only one (or zero) options
  const isDisabled = !availableTargets || availableTargets.length < 1;

  // Format the targets for the Select component's `data` prop
  const selectData = availableTargets.map(target => ({
    value: target,
    label: targetDisplayNameMap[target] || target
  }));

  return (
    <Stack gap="xs">
      <Select
        label="Select target metric"
        placeholder="None"
        data={selectData}
        value={isDisabled ? null : selectedTarget}
        onChange={handleTargetSelect}
        disabled={isDisabled}
        allowDeselect={false}
        aria-label="Select target metric for forecasting data"
      />
    </Stack>
  );
};

export default TargetSelector;