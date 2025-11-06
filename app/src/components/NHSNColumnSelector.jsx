import { Stack, Title, Group, Button, Text, Divider } from '@mantine/core';
import { MODEL_COLORS } from '../config/datasets';

// Function to intelligently group columns
const organizeColumns = (columns) => {
  const groups = {
    totals: [],
    adult: [],
    adultByAge: [],
    pediatric: [],
    pediatricByAge: [],
    icu: [],
    beds: [],
    percentages: [],
    other: []
  };

  columns.forEach(col => {
    const colLower = col.toLowerCase();

    // Bed capacity metrics
    if (colLower.includes('bed') && !colLower.includes('occupied by')) {
      groups.beds.push(col);
    }
    // ICU patients (but not ICU beds)
    else if (colLower.includes('icu patients')) {
      groups.icu.push(col);
    }
    // Percentages (excluding bed percentages)
    else if (colLower.startsWith('percent ') && !colLower.includes('bed')) {
      groups.percentages.push(col);
    }
    // Pediatric with age ranges
    else if (colLower.includes('pediatric') && (colLower.includes('0-4') || colLower.includes('5-17'))) {
      groups.pediatricByAge.push(col);
    }
    // Adult with age ranges
    else if (colLower.includes('adult') && (colLower.includes('18-49') || colLower.includes('50-64') || colLower.includes('65-74') || colLower.includes('75+'))) {
      groups.adultByAge.push(col);
    }
    // Total columns (aggregate data)
    else if (colLower.startsWith('total ')) {
      groups.totals.push(col);
    }
    // Adult columns (general)
    else if (colLower.includes('adult')) {
      groups.adult.push(col);
    }
    // Pediatric columns (general)
    else if (colLower.includes('pediatric') || colLower.includes('pedatric')) {
      groups.pediatric.push(col);
    }
    // Everything else
    else {
      groups.other.push(col);
    }
  });

  // Sort columns within each group for consistency
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => {
      // Custom sort: COVID-19 first, then Influenza, then RSV
      const order = ['covid', 'influenza', 'rsv'];
      const aDisease = order.findIndex(d => a.toLowerCase().includes(d));
      const bDisease = order.findIndex(d => b.toLowerCase().includes(d));

      if (aDisease !== bDisease && aDisease !== -1 && bDisease !== -1) {
        return aDisease - bDisease;
      }

      // Then sort by age ranges
      const ageRanges = ['0-4', '5-17', '18-49', '50-64', '65-74', '75+'];
      const aAge = ageRanges.findIndex(age => a.includes(age));
      const bAge = ageRanges.findIndex(age => b.includes(age));

      if (aAge !== -1 && bAge !== -1) {
        return aAge - bAge;
      }

      return a.localeCompare(b);
    });
  });

  return groups;
};

const NHSNColumnSelector = ({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  nameMap
}) => {
  const toggleColumn = (column) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const groups = organizeColumns(availableColumns);

  const groupConfig = [
    { key: 'totals', label: 'Total Admissions' },
    { key: 'adult', label: 'Adult Admissions' },
    { key: 'adultByAge', label: 'Adult Admissions by Age' },
    { key: 'pediatric', label: 'Pediatric Admissions' },
    { key: 'pediatricByAge', label: 'Pediatric Admissions by Age' },
    { key: 'icu', label: 'ICU Patients' },
    { key: 'beds', label: 'Bed Capacity' },
    { key: 'percentages', label: 'Percentages' },
    { key: 'other', label: 'Other' }
  ];

  return (
    <Stack gap="md" mt="md">
      <Title order={4}>Data Columns</Title>
      {groupConfig.map(({ key, label }) => {
        if (groups[key].length === 0) return null;

        return (
          <Stack key={key} gap="xs">
            <Text size="sm" fw={600} c="dimmed">{label}</Text>
            <Group gap="xs">
              {groups[key].map((column) => {
                const columnIndex = availableColumns.indexOf(column);
                return (
                  <Button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    variant={selectedColumns.includes(column) ? 'filled' : 'outline'}
                    size="xs"
                    style={
                      selectedColumns.includes(column)
                        ? { backgroundColor: MODEL_COLORS[columnIndex % MODEL_COLORS.length], color: 'white' }
                        : undefined
                    }
                  >
                    {nameMap[column] || column}
                  </Button>
                );
              })}
            </Group>
          </Stack>
        );
      })}
    </Stack>
  );
};

export default NHSNColumnSelector;