import { Select, Stack, Badge, Group } from '@mantine/core';
import { useView } from '../hooks/useView';
import { DATASETS } from '../config/datasets';

const ViewSelector = () => {
  const { viewType, setViewType } = useView();

  // Generate all possible view options with better organization
  const viewOptions = Object.values(DATASETS).flatMap(dataset =>
    dataset.views.map(view => ({
      value: view.value,
      label: view.label,
      group: dataset.fullName,
      dataset: dataset.shortName
    }))
  );

  // Group options by dataset for better UX
  const groupedOptions = viewOptions.reduce((acc, option) => {
    if (!acc[option.group]) {
      acc[option.group] = [];
    }
    acc[option.group].push(option);
    return acc;
  }, {});

  const selectData = Object.entries(groupedOptions).map(([group, options]) => ({
    group,
    items: options.map(option => ({
      value: option.value,
      label: option.label
    }))
  }));

  const currentOption = viewOptions.find(opt => opt.value === viewType);

  return (
    <Stack gap="xs">
      {currentOption && (
        <Group gap="xs">
          <Badge size="sm" variant="light" color="blue">
            {currentOption.dataset.toUpperCase()}
          </Badge>
        </Group>
      )}
      
      <Select
        data={selectData}
        value={viewType}
        onChange={setViewType}
        placeholder="Select a view"
        searchable={false}
        clearable={false}
        size="sm"
        allowDeselect={false}
        comboboxProps={{
          withinPortal: true,
        }}
        styles={{
          dropdown: {
            maxHeight: '215px',
            overflowY: 'auto',
          }
        }}
      />
    </Stack>
  );
};

export default ViewSelector;
