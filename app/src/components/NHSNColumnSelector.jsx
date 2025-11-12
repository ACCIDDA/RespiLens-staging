import { Stack, Group, Button, Text, SimpleGrid, Select } from '@mantine/core';
import { MODEL_COLORS } from '../config/datasets';

// Function to organize columns by disease first, then by subcategory
const organizeByDisease = (columns) => {
  const diseases = {
    covid: { total: [], icu: [], byAge: [], adult: [], pediatric: [], percent: [] },
    influenza: { total: [], icu: [], byAge: [], adult: [], pediatric: [], percent: [] },
    rsv: { total: [], icu: [], byAge: [], adult: [], pediatric: [], percent: [] }
  };

  const other = { beds: [], bedPercent: [], other: [] };

  const sortByAge = (a, b) => {
    const ageRanges = ['0-4', '5-17', '18-49', '50-64', '65-74', '75+'];
    const aAge = ageRanges.findIndex(age => a.includes(age));
    const bAge = ageRanges.findIndex(age => b.includes(age));
    if (aAge !== -1 && bAge !== -1) return aAge - bAge;
    return a.localeCompare(b);
  };

  columns.forEach(col => {
    const colLower = col.toLowerCase();

    // Bed capacity columns - prioritize these over disease classification
    if (colLower.includes('bed')) {
      if (colLower.startsWith('percent ')) {
        other.bedPercent.push(col);
      } else {
        other.beds.push(col);
      }
      return; // Don't process further
    }

    // Determine disease
    let disease = null;
    if (colLower.includes('covid')) disease = 'covid';
    else if (colLower.includes('influenza') || colLower.includes('flu')) disease = 'influenza';
    else if (colLower.includes('rsv')) disease = 'rsv';

    // Disease-specific columns
    if (disease) {
      const group = diseases[disease];

      if (colLower.startsWith('percent ')) {
        group.percent.push(col);
      } else if (colLower.includes('icu patients')) {
        group.icu.push(col);
      } else if (colLower.includes('unknown age')) {
        // Put unknown age in the by age section
        group.byAge.push(col);
      } else if (colLower.includes('pediatric') && (colLower.includes('0-4') || colLower.includes('5-17'))) {
        group.byAge.push(col);
      } else if (colLower.includes('adult') && (colLower.includes('18-49') || colLower.includes('50-64') || colLower.includes('65-74') || colLower.includes('75+'))) {
        group.byAge.push(col);
      } else if (colLower.includes('pediatric') || colLower.includes('pedatric')) {
        // Pediatric without age ranges
        group.pediatric.push(col);
      } else if (colLower.includes('adult')) {
        // Adult without age ranges
        group.adult.push(col);
      } else if (colLower.startsWith('total ')) {
        group.total.push(col);
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
  nameMap,
  selectedTarget,
  availableTargets,
  onTargetChange,
  loading
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

  const renderDiseaseSection = (diseaseName, diseaseData, colorScheme) => {
    const subcategories = [
      { key: 'total', label: 'Total' },
      { key: 'icu', label: 'ICU' },
      { key: 'byAge', label: 'By Age' },
      { key: 'adult', label: 'Adult' },
      { key: 'pediatric', label: 'Pediatric' },
      { key: 'percent', label: 'Percent' }
    ];

    const hasData = Object.values(diseaseData).some(arr => arr.length > 0);
    if (!hasData) return null;

    return (
      <Stack key={diseaseName} gap="xs">
        <Text size="sm" fw={700} c={colorScheme}>{diseaseName}</Text>
        {subcategories.map(({ key, label }) => {
          if (diseaseData[key].length === 0) return null;
          return (
            <Group key={key} gap="xs" wrap="nowrap" align="flex-start">
              <Text size="xs" fw={600} c="dimmed" style={{ minWidth: '70px', flexShrink: 0 }}>{label}:</Text>
              <Group gap="xs" wrap="wrap" style={{ flex: 1 }}>
                {diseaseData[key].map(renderButton)}
              </Group>
            </Group>
          );
        })}
      </Stack>
    );
  };

  const hasDiseaseData = Object.values(diseases).some(disease =>
    Object.values(disease).some(arr => arr.length > 0)
  );

  const hasOtherData = other.beds.length > 0 || other.bedPercent.length > 0 || other.other.length > 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Group gap="sm" align="center">
          <Text size="sm" fw={500}>Column unit:</Text>
          <Select
            placeholder="Choose a column unit"
            data={availableTargets || []}
            value={selectedTarget}
            onChange={onTargetChange}
            disabled={loading}
            allowDeselect={false}
            style={{ width: 300 }}
          />
        </Group>
      </Group>

      {/* Disease-specific columns in 3-column layout */}
      {hasDiseaseData && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {renderDiseaseSection('COVID-19', diseases.covid, 'black')}
          {renderDiseaseSection('Influenza', diseases.influenza, 'black')}
          {renderDiseaseSection('RSV', diseases.rsv, 'black')}
        </SimpleGrid>
      )}

      {/* Non-disease specific columns */}
      {hasOtherData && (
        <Stack gap="xs">
          {(other.beds.length > 0 || other.bedPercent.length > 0) && (
            <>
              <Text size="sm" fw={700} c="gray">Bed Capacity</Text>
              {other.beds.length > 0 && (
                <Group gap="xs" wrap="wrap" align="flex-start">
                  {other.beds.map(renderButton)}
                </Group>
              )}
              {other.bedPercent.length > 0 && (
                <Group gap="xs" wrap="wrap" align="flex-start">
                  {other.bedPercent.map(renderButton)}
                </Group>
              )}
            </>
          )}
          {other.other.length > 0 && (
            <>
              <Text size="sm" fw={700} c="gray">Other</Text>
              <Group gap="xs" wrap="wrap" align="flex-start">
                {other.other.map(renderButton)}
              </Group>
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default NHSNColumnSelector;