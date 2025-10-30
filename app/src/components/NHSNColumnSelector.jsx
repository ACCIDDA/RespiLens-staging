import { Stack, Title, Group, Button } from '@mantine/core';
import { MODEL_COLORS } from '../config/datasets';

const NHSNColumnSelector = ({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
}) => {
  const toggleColumn = (column) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  return (
    <Stack gap="md" mt="md">
      <Stack gap="sm">
        <Title order={4}>Data Columns</Title>
        <Group gap="xs">
          {availableColumns.map((column, index) => (
            <Button
              key={column}
              onClick={() => toggleColumn(column)}
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
    </Stack>
  );
};

export default NHSNColumnSelector;