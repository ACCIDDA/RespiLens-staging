// src/components/TargetSelector.jsx
import { Select, Stack } from '@mantine/core';
import { useView } from '../hooks/useView';

const formatTargetNameForDisplay = (name) => {
  if (!name) return '';
  // This will format a string like "wk inc covid hosp" into "Wk Inc Covid Hosp"
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const TargetSelector = () => {
  // Get the target-related state and functions from our central context
  const { availableTargets, selectedTarget, handleTargetSelect } = useView();

  // Disable the selector if there's only one (or zero) options
  const isDisabled = !availableTargets || availableTargets.length <= 1;

  // Format the targets for the Select component's `data` prop
  const selectData = availableTargets.map(target => ({
    value: target,
    label: formatTargetNameForDisplay(target)
  }));

  return (
    <Stack gap="xs">
      <Select
        placeholder="Select a target"
        data={selectData}
        value={selectedTarget}
        onChange={handleTargetSelect}
        disabled={isDisabled}
        allowDeselect={false}
      />
    </Stack>
  );
};

export default TargetSelector;