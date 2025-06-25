import React from 'react';
import { SimpleGrid, Stack, Title, Group, Button } from '@mantine/core';
import { MODEL_COLORS } from '../config/datasets';

const NHSNColumnSelector = ({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
}) => {
  const toggleColumn = (column, isPreview) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  return (
    <Stack gap="md" mt="md">
      <SimpleGrid cols={2} spacing="md">
        <Stack gap="sm">
          <Title order={4}>Official Data Columns</Title>
          <Group gap="xs">
            {availableColumns.official.map((column, index) => (
              <Button
                key={column}
                onClick={() => toggleColumn(column, false)}
                variant={selectedColumns.includes(column) ? 'filled' : 'outline'}
                size="xs"
                style={
                  selectedColumns.includes(column)
                    ? { backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length], color: 'white' }
                    : undefined
                }
              >
                {column}
              </Button>
            ))}
          </Group>
        </Stack>

        <Stack gap="sm">
          <Title order={4}>Preliminary Data Columns</Title>
          <Group gap="xs">
            {availableColumns.preliminary.map((column, index) => (
              <Button
                key={column}
                onClick={() => toggleColumn(column, true)}
                variant={selectedColumns.includes(column) ? 'filled' : 'outline'}
                size="xs"
                style={
                  selectedColumns.includes(column)
                    ? { backgroundColor: MODEL_COLORS[(availableColumns.official.length + index) % MODEL_COLORS.length], color: 'white' }
                    : undefined
                }
              >
                {column}
              </Button>
            ))}
          </Group>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
};

export default NHSNColumnSelector;
