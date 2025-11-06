import { Stack, Title, Group, Button, Text, SimpleGrid, Paper } from '@mantine/core';
import { MODEL_COLORS } from '../config/datasets';

// Function to organize columns by disease first, then by subcategory
const organizeByDisease = (columns) => {
  const diseases = {
    covid: { total: [], adult: [], adultByAge: [], pediatric: [], pediatricByAge: [], icu: [], percent: [] },
    influenza: { total: [], adult: [], adultByAge: [], pediatric: [], pediatricByAge: [], icu: [], percent: [] },
    rsv: { total: [], adult: [], adultByAge: [], pediatric: [], pediatricByAge: [], icu: [], percent: [] }
  };

  const other = { beds: [], other: [] };

  const sortByAge = (a, b) => {
    const ageRanges = ['0-4', '5-17', '18-49', '50-64', '65-74', '75+'];
    const aAge = ageRanges.findIndex(age => a.includes(age));
    const bAge = ageRanges.findIndex(age => b.includes(age));
    if (aAge !== -1 && bAge !== -1) return aAge - bAge;
    return a.localeCompare(b);
  };

  columns.forEach(col => {
    const colLower = col.toLowerCase();

    // Determine disease
    let disease = null;
    if (colLower.includes('covid')) disease = 'covid';
    else if (colLower.includes('influenza') || colLower.includes('flu')) disease = 'influenza';
    else if (colLower.includes('rsv')) disease = 'rsv';

    // Bed capacity (non-disease specific)
    if (colLower.includes('bed') && !colLower.includes('occupied by covid') && !colLower.includes('occupied by influenza') && !colLower.includes('occupied by rsv')) {
      other.beds.push(col);
    }
    // Disease-specific columns
    else if (disease) {
      const group = diseases[disease];

      if (colLower.startsWith('percent ')) {
        group.percent.push(col);
      } else if (colLower.includes('icu patients')) {
        group.icu.push(col);
      } else if (colLower.includes('unknown age')) {
        // Put unknown age in the age-specific sections
        if (colLower.includes('pediatric') || colLower.includes('pedatric')) {
          group.pediatricByAge.push(col);
        } else if (colLower.includes('adult')) {
          group.adultByAge.push(col);
        } else {
          // General admissions with unknown age go to adultByAge as it's the main age section
          group.adultByAge.push(col);
        }
      } else if (colLower.includes('pediatric') && (colLower.includes('0-4') || colLower.includes('5-17'))) {
        group.pediatricByAge.push(col);
      } else if (colLower.includes('adult') && (colLower.includes('18-49') || colLower.includes('50-64') || colLower.includes('65-74') || colLower.includes('75+'))) {
        group.adultByAge.push(col);
      } else if (colLower.startsWith('total ')) {
        group.total.push(col);
      } else if (colLower.includes('adult')) {
        group.adult.push(col);
      } else if (colLower.includes('pediatric') || colLower.includes('pedatric')) {
        group.pediatric.push(col);
      } else {
        group.total.push(col);
      }
    } else {
      other.other.push(col);
    }
  });

  // Sort within each subcategory
  Object.values(diseases).forEach(disease => {
    Object.keys(disease).forEach(key => {
      disease[key].sort(sortByAge);
    });
  });

  Object.keys(other).forEach(key => {
    other[key].sort();
  });

  return { diseases, other };
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

  const { diseases, other } = organizeByDisease(availableColumns);

  const renderButton = (column) => {
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
  };

  const renderDiseaseColumn = (diseaseName, diseaseData, colorScheme) => {
    const subcategories = [
      { key: 'total', label: 'Total' },
      { key: 'adult', label: 'Adult' },
      { key: 'adultByAge', label: 'Adult by Age' },
      { key: 'pediatric', label: 'Pediatric' },
      { key: 'pediatricByAge', label: 'Pediatric by Age' },
      { key: 'icu', label: 'ICU Patients' },
      { key: 'percent', label: 'Percentages' }
    ];

    const hasData = Object.values(diseaseData).some(arr => arr.length > 0);
    if (!hasData) return null;

    return (
      <Paper key={diseaseName} p="md" withBorder>
        <Stack gap="md">
          <Title order={5} c={colorScheme}>{diseaseName}</Title>
          {subcategories.map(({ key, label }) => {
            if (diseaseData[key].length === 0) return null;
            return (
              <Stack key={key} gap="xs">
                <Text size="xs" fw={600} c="dimmed">{label}</Text>
                <Group gap="xs">
                  {diseaseData[key].map(renderButton)}
                </Group>
              </Stack>
            );
          })}
        </Stack>
      </Paper>
    );
  };

  return (
    <Stack gap="lg" mt="md">
      <Title order={4}>Data Columns</Title>

      {/* Disease-specific columns in 3-column layout */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {renderDiseaseColumn('COVID-19', diseases.covid, 'blue')}
        {renderDiseaseColumn('Influenza', diseases.influenza, 'green')}
        {renderDiseaseColumn('RSV', diseases.rsv, 'orange')}
      </SimpleGrid>

      {/* Non-disease specific columns */}
      {(other.beds.length > 0 || other.other.length > 0) && (
        <Stack gap="md">
          {other.beds.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={600} c="dimmed">Bed Capacity</Text>
              <Group gap="xs">
                {other.beds.map(renderButton)}
              </Group>
            </Stack>
          )}
          {other.other.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={600} c="dimmed">Other</Text>
              <Group gap="xs">
                {other.other.map(renderButton)}
              </Group>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default NHSNColumnSelector;