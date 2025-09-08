import React from 'react';
import { MultiSelect, SimpleGrid } from '@mantine/core';
import { MODEL_COLORS } from '../config/datasets';

const NHSNColumnSelector = ({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
}) => {
  // 2. Create a map of column names to colors. This is the crucial step.
  // It ensures the colors in the selector will perfectly match the colors on the graph.
  const allColumns = [
    ...(availableColumns?.official || []),
    ...(availableColumns?.preliminary || []),
  ];
  const colorMap = new Map();
  allColumns.forEach((column, index) => {
    colorMap.set(column, MODEL_COLORS[index % MODEL_COLORS.length]);
  });

  // 3. Define a function that returns a custom, colored Pill component.
  const renderTag = ({ value, onRemove }) => (
    <Pill
      withRemoveButton
      onRemove={onRemove}
      style={{ backgroundColor: colorMap.get(value), color: 'white' }}
    >
      {value}
    </Pill>
  );
  // Prepare the data for each dropdown (this part is correct)
  const officialOptions = (availableColumns?.official || []).map(column => ({
    value: column,
    label: column,
  }));

  const preliminaryOptions = (availableColumns?.preliminary || []).map(column => ({
    value: column,
    label: column,
  }));

  // Filter the main selectedColumns array for each dropdown's value (this is also correct)
  const selectedOfficial = selectedColumns.filter(
    col => (availableColumns?.official || []).includes(col)
  );
  const selectedPreliminary = selectedColumns.filter(
    col => (availableColumns?.preliminary || []).includes(col)
  );

  // When the "Official" dropdown changes...
  const handleOfficialChange = (newlySelectedOfficial) => {
    // 1. Find all currently selected columns that are *not* official (i.e., keep the preliminary ones)
    const otherSelections = selectedColumns.filter(
      col => !(availableColumns?.official || []).includes(col)
    );
    // 2. Combine the other selections with the new official selections
    setSelectedColumns([...otherSelections, ...newlySelectedOfficial]);
  };

  // When the "Preliminary" dropdown changes...
  const handlePreliminaryChange = (newlySelectedPreliminary) => {
    // 1. Find all currently selected columns that are *not* preliminary (i.e., keep the official ones)
    const otherSelections = selectedColumns.filter(
      col => !(availableColumns?.preliminary || []).includes(col)
    );
    // 2. Combine the other selections with the new preliminary selections
    setSelectedColumns([...otherSelections, ...newlySelectedPreliminary]);
  };

  return (
    <SimpleGrid 
      cols={{ base: 1, sm: 2 }} 
      spacing="md" 
      style={{ maxWidth: 800, margin: 'auto', marginTop: '1rem' }}
    >
      <MultiSelect
        label="Official Data Columns"
        placeholder="Select official columns..."
        data={officialOptions}
        value={selectedOfficial}
        onChange={handleOfficialChange}
        searchable
        clearable
        hidePickedOptions
        renderTag={renderTag}
        size="md"
        styles={{
          label: {
            fontSize: '1.5rem',
          }
        }}
      />
      <MultiSelect
        label="Preliminary Data Columns"
        placeholder="Select preliminary columns..."
        data={preliminaryOptions}
        value={selectedPreliminary}
        onChange={handlePreliminaryChange}
        searchable
        clearable
        hidePickedOptions
        renderTag={renderTag}
        size="md"
        styles={{
          label: {
            fontSize: '1.5rem',
          }
        }}
      />
    </SimpleGrid>
  );
};

export default NHSNColumnSelector;