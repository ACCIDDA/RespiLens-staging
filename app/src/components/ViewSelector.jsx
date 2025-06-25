import React from 'react';
import { Select, Stack, Badge, Group, Text } from '@mantine/core';
import { useView } from '../contexts/ViewContext';
import { DATASETS } from '../config/datasets';

const ViewSelector = () => {
  const { viewType, setViewType, currentDataset } = useView();

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
      <Group gap="xs">
        <Text size="sm" fw={500}>View:</Text>
        {currentOption && (
          <Badge size="sm" variant="light" color="blue">
            {currentOption.dataset.toUpperCase()}
          </Badge>
        )}
      </Group>
      
      <Select
        data={selectData}
        value={viewType}
        onChange={setViewType}
        placeholder="Select a view"
        searchable
        clearable={false}
        comboboxProps={{
          withinPortal: true,
        }}
        styles={{
          dropdown: {
            maxHeight: '300px',
            overflowY: 'auto',
          }
        }}
      />
    </Stack>
  );
};

export default ViewSelector;
