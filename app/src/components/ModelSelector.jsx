import { useState } from 'react';
import { Stack, Group, Button, Text, Tooltip, Badge, Divider, Switch, Card, SimpleGrid, PillsInput, Pill, Combobox, useCombobox } from '@mantine/core';
import { IconCircleCheck, IconCircle, IconEye, IconEyeOff } from '@tabler/icons-react';
import { MODEL_COLORS } from '../config/datasets';

const ModelSelector = ({ 
  models = [],
  selectedModels = [], 
  setSelectedModels,
  allowMultiple = true,
  disabled = false
}) => {
  const [showAllAvailable, setShowAllAvailable] = useState(false);
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active', 0),
  });

  const handleSelectAll = () => {
    setSelectedModels(models);
  };

  const handleSelectNone = () => {
    setSelectedModels([]);
  };

  const getModelColorByIndex = (model) => {
    // Use the same color logic as graphs: index-based from MODEL_COLORS
    const index = selectedModels.indexOf(model);
    return index >= 0 ? MODEL_COLORS[index % MODEL_COLORS.length] : MODEL_COLORS[models.indexOf(model) % MODEL_COLORS.length];
  };

  const modelsToShow = showAllAvailable ? models : selectedModels;

  const handleValueSelect = (val) => {
    if (selectedModels.includes(val)) {
      setSelectedModels(selectedModels.filter(v => v !== val));
    } else if (allowMultiple) {
      setSelectedModels([...selectedModels, val]);
    } else {
      setSelectedModels([val]);
    }
  };

  const handleValueRemove = (val) => {
    setSelectedModels(selectedModels.filter(v => v !== val));
  };

  const filteredModels = models.filter(model =>
    model.toLowerCase().includes(search.toLowerCase().trim())
  );

  if (!models.length) {
    return (
      <Text c="dimmed" fs="italic" size="sm">
        No models available
      </Text>
    );
  }

  return (
    <Stack gap="md" mt="md">
      <Divider />
      
      {/* Header with Toggle */}
      <Group justify="space-between" align="center">
        <Text size="sm" fw={500} c="dimmed">
          Models ({selectedModels.length}/{models.length})
        </Text>
        <Switch
          label="Show all available models"
          checked={showAllAvailable}
          onChange={(event) => setShowAllAvailable(event.currentTarget.checked)}
          size="sm"
          disabled={disabled}
          thumbIcon={
            showAllAvailable ? (
              <IconEye size={12} stroke={2.5} />
            ) : (
              <IconEyeOff size={12} stroke={2.5} />
            )
          }
        />
      </Group>

      {/* Bulk Actions */}
      {allowMultiple && (
        <Group gap="xs" wrap="wrap" justify="space-between">
          <Group gap="xs" wrap="wrap">
            <Tooltip label="Select all available models">
              <Button
                variant="subtle"
                size="xs"
                onClick={handleSelectAll}
                disabled={disabled || selectedModels.length === models.length}
              >
                Select All
              </Button>
            </Tooltip>
            <Tooltip label="Clear all selected models">
              <Button
                variant="subtle"
                size="xs"
                onClick={handleSelectNone}
                disabled={disabled || selectedModels.length === 0}
              >
                Clear All
              </Button>
            </Tooltip>
          </Group>
          <Text size="xs" c="dimmed" hiddenFrom="xs">
            {selectedModels.length > 0 && `${selectedModels.length} selected`}
          </Text>
        </Group>
      )}

      {/* Model Grid Display */}
      {modelsToShow.length > 0 && (
        <SimpleGrid 
          cols={{ base: 1, xs: 2, sm: 3, md: 4 }}
          spacing="xs"
          verticalSpacing="xs"
        >
          {modelsToShow.map((model) => {
            const isSelected = selectedModels.includes(model);
            const modelColor = getModelColorByIndex(model);
            
            return (
              <Card
                key={model}
                p="xs"
                radius="md"
                withBorder={!isSelected}
                variant={isSelected ? 'filled' : 'default'}
                style={{
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isSelected ? modelColor : undefined,
                  borderColor: isSelected ? modelColor : undefined
                }}
                opacity={disabled ? 0.5 : 1}
                onClick={() => {
                  if (disabled) return;
                  
                  if (isSelected) {
                    setSelectedModels(selectedModels.filter(m => m !== model));
                  } else {
                    if (allowMultiple) {
                      setSelectedModels([...selectedModels, model]);
                    } else {
                      setSelectedModels([model]);
                    }
                  }
                }}
              >
                <Group gap="xs" justify="space-between" align="center">
                  <Group gap="xs" align="center" flex={1}>
                    {isSelected ? (
                      <IconCircleCheck size={16} color="white" />
                    ) : (
                      <IconCircle size={16} color={modelColor} />
                    )}
                    <Text 
                      size="xs" 
                      fw={isSelected ? 600 : 400}
                      c={isSelected ? 'white' : 'inherit'}
                      style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}
                      title={model}
                    >
                      {model}
                    </Text>
                  </Group>
                  <Badge 
                    size="xs" 
                    variant="filled"
                    color={isSelected ? 'gray.0' : undefined}
                    style={!isSelected ? { backgroundColor: modelColor } : undefined}
                  >
                    •
                  </Badge>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Custom MultiSelect with Colored Pills */}
      <Combobox
        store={combobox}
        onOptionSubmit={handleValueSelect}
        withinPortal
      >
        <Combobox.DropdownTarget>
          <PillsInput
            onClick={() => combobox.openDropdown()}
            size="sm"
          >
            <Pill.Group>
              {selectedModels.map((model) => {
                const modelColor = getModelColorByIndex(model);
                return (
                  <Pill
                    key={model}
                    withRemoveButton
                    onRemove={() => handleValueRemove(model)}
                    style={{
                      backgroundColor: modelColor,
                      color: 'white'
                    }}
                  >
                    {model}
                  </Pill>
                );
              })}

              <Combobox.EventsTarget>
                <PillsInput.Field
                  onFocus={() => combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  value={search}
                  placeholder="Quick search and select models..."
                  onChange={(event) => {
                    combobox.updateSelectedOptionIndex();
                    setSearch(event.currentTarget.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && search.length === 0) {
                      event.preventDefault();
                      handleValueRemove(selectedModels[selectedModels.length - 1]);
                    }
                  }}
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options>
            {filteredModels.map((model) => {
              const modelColor = getModelColorByIndex(model);
              const isSelected = selectedModels.includes(model);
              return (
                <Combobox.Option value={model} key={model}>
                  <Group gap="sm">
                    {isSelected ? (
                      <IconCircleCheck size={16} style={{ color: modelColor }} />
                    ) : (
                      <IconCircle size={16} style={{ color: modelColor, opacity: 0.5 }} />
                    )}
                    <span style={{ 
                      color: isSelected ? modelColor : 'inherit',
                      fontWeight: isSelected ? 600 : 400
                    }}>
                      {model}
                    </span>
                    <Badge 
                      size="xs" 
                      variant="filled"
                      style={{ backgroundColor: modelColor }}
                      ml="auto"
                    >
                      •
                    </Badge>
                  </Group>
                </Combobox.Option>
              );
            })}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
};

export default ModelSelector;
