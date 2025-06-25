import React from 'react';
import {
  Stack,
  Group,
  Button,
  Text,
  MultiSelect,
  Tooltip,
  Badge,
  Divider
} from '@mantine/core';
import {
  IconCircleCheck,
  IconCircle
} from '@tabler/icons-react';

const ModelSelector = ({ 
  models = [],
  selectedModels = [], 
  setSelectedModels,
  getModelColor,
  allowMultiple = true,
  disabled = false
}) => {

  const handleSelectAll = () => {
    setSelectedModels(models);
  };

  const handleSelectNone = () => {
    setSelectedModels([]);
  };

  const getColorForModel = (model) => {
    // Always use our fallback color generation to ensure unique colors
    const colors = [
      '#51cf66', // green  
      '#ff6b6b', // red
      '#ffd43b', // yellow
      '#9775fa', // purple
      '#f06595', // pink
      '#20c997', // teal
      '#74c0fc', // light blue
      '#ff8787', // light red
      '#69db7c', // light green
      '#da77f2', // light purple
      '#ffa94d', // orange
      '#339af0', // blue (moved to end)
    ];
    
    // Use model name for consistent color assignment
    let hash = 0;
    for (let i = 0; i < model.length; i++) {
      hash = model.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

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
      
      {/* Header */}
      <Group justify="space-between" align="center">
        <Text size="sm" fw={500} c="dimmed">
          Models ({selectedModels.length}/{models.length})
        </Text>
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

      {/* Selected Models Display */}
      {selectedModels.length > 0 && (
        <Group gap="xs" mb="sm" wrap="wrap">
          {selectedModels.map((model) => (
            <div
              key={model}
              style={{
                backgroundColor: getColorForModel(model),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                maxWidth: '160px' 
              }}>
                {model}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => setSelectedModels(selectedModels.filter(m => m !== model))}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0',
                    marginLeft: '4px',
                    fontSize: '14px',
                    lineHeight: '1',
                    opacity: '0.8',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </Group>
      )}

      {/* MultiSelect Dropdown */}
      <MultiSelect
        data={models}
        value={selectedModels}
        onChange={setSelectedModels}
        placeholder="Select models..."
        searchable
        clearable
        disabled={disabled}
        maxDropdownHeight={300}
        comboboxProps={{ withinPortal: true }}
        hidePills
        renderOption={({ option, checked }) => (
          <Group gap="sm">
            {checked ? (
              <IconCircleCheck size={16} style={{ color: getColorForModel(option.value) }} />
            ) : (
              <IconCircle size={16} />
            )}
            <span style={{ 
              color: checked ? getColorForModel(option.value) : 'inherit',
              fontWeight: checked ? 600 : 400
            }}>
              {option.value}
            </span>
            <Badge 
              size="xs" 
              variant="filled"
              style={{ backgroundColor: getColorForModel(option.value) }}
              ml="auto"
            >
              •
            </Badge>
          </Group>
        )}
      />
    </Stack>
  );
};

export default ModelSelector;
