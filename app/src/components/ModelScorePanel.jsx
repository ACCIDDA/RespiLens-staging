import { Stack, Group, Button, Text, Card, Select, Badge, Table, Tooltip, Divider } from '@mantine/core';
import { IconTrophy, IconArrowUp, IconInfoCircle } from '@tabler/icons-react';
import useModelScoring from '../hooks/useModelScoring';
import { formatWIS } from '../utils/modelRankingScoring';
import { MODEL_COLORS } from '../config/datasets';

/**
 * Panel component for displaying model performance scores and rankings
 */
const ModelScorePanel = ({
  data,
  availableDates,
  target,
  availableModels = [],
  selectedModels = [],
  setSelectedModels,
  showCompact = false,
}) => {
  const {
    rankedModels,
    topNModelNames,
    timeWindow,
    setTimeWindow,
    topN,
    setTopN,
    selectTopNModels,
    timeWindowLabel,
    datesEvaluated,
    hasScores,
  } = useModelScoring(data, availableDates, target, availableModels);

  const handleSelectTopModels = () => {
    const topModels = selectTopNModels();
    setSelectedModels(topModels);
  };

  if (!hasScores) {
    return (
      <Card withBorder p="md" radius="md">
        <Text c="dimmed" fs="italic" size="sm">
          Model scoring unavailable - insufficient data
        </Text>
      </Card>
    );
  }

  // Compact view for space-constrained layouts
  if (showCompact) {
    return (
      <Card withBorder p="sm" radius="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Group gap="xs">
              <IconTrophy size={16} />
              <Text size="sm" fw={500}>
                Top {topN} Models
              </Text>
            </Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconArrowUp size={14} />}
              onClick={handleSelectTopModels}
            >
              Select Top {topN}
            </Button>
          </Group>
          <Group gap="xs">
            {topNModelNames.map((modelName, idx) => {
              const modelColor = MODEL_COLORS[idx % MODEL_COLORS.length];
              return (
                <Badge
                  key={modelName}
                  size="sm"
                  variant="filled"
                  style={{ backgroundColor: modelColor }}
                >
                  {modelName}
                </Badge>
              );
            })}
          </Group>
        </Stack>
      </Card>
    );
  }

  // Full view with detailed table
  return (
    <Card withBorder p="md" radius="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <IconTrophy size={20} />
            <Text size="md" fw={600}>
              Model Performance Rankings
            </Text>
            <Tooltip label="Models ranked by Weighted Interval Score (WIS). Lower WIS = better performance.">
              <IconInfoCircle size={16} style={{ cursor: 'help' }} />
            </Tooltip>
          </Group>
        </Group>

        <Divider />

        {/* Controls */}
        <Group grow>
          <Select
            label="Time Window"
            value={timeWindow}
            onChange={setTimeWindow}
            data={[
              { value: 'all', label: 'All Available Dates' },
              { value: '1week', label: 'Past Week' },
              { value: '2weeks', label: 'Past 2 Weeks' },
              { value: '4weeks', label: 'Past 4 Weeks' },
              { value: '8weeks', label: 'Past 8 Weeks' },
            ]}
            size="xs"
          />
          <Select
            label="Show Top"
            value={String(topN)}
            onChange={(val) => setTopN(Number(val))}
            data={[
              { value: '3', label: 'Top 3 Models' },
              { value: '5', label: 'Top 5 Models' },
              { value: '10', label: 'Top 10 Models' },
            ]}
            size="xs"
          />
        </Group>

        <Text size="xs" c="dimmed">
          {timeWindowLabel} • {datesEvaluated} forecast date{datesEvaluated !== 1 ? 's' : ''} evaluated
        </Text>

        {/* Quick Select Button */}
        <Button
          variant="light"
          leftSection={<IconArrowUp size={16} />}
          onClick={handleSelectTopModels}
          fullWidth
        >
          Select Top {topN} Models
        </Button>

        <Divider />

        {/* Rankings Table */}
        <div style={{ overflowX: 'auto' }}>
          <Table highlightOnHover fontSize="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Rank</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>
                  <Tooltip label="Weighted Interval Score - lower is better">
                    <span style={{ cursor: 'help' }}>WIS ↓</span>
                  </Tooltip>
                </Table.Th>
                <Table.Th>
                  <Tooltip label="Number of valid forecasts evaluated">
                    <span style={{ cursor: 'help' }}>Count</span>
                  </Tooltip>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rankedModels.slice(0, topN).map((model) => {
                const isSelected = selectedModels.includes(model.modelName);
                const modelIndex = selectedModels.indexOf(model.modelName);
                const modelColor = isSelected
                  ? MODEL_COLORS[modelIndex % MODEL_COLORS.length]
                  : undefined;

                return (
                  <Table.Tr
                    key={model.modelName}
                    style={{
                      backgroundColor: isSelected ? `${modelColor}15` : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedModels(selectedModels.filter(m => m !== model.modelName));
                      } else {
                        setSelectedModels([...selectedModels, model.modelName]);
                      }
                    }}
                  >
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant={model.rank <= 3 ? 'filled' : 'light'}
                        color={model.rank === 1 ? 'yellow' : model.rank === 2 ? 'gray' : model.rank === 3 ? 'orange' : 'blue'}
                      >
                        #{model.rank}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {isSelected && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: modelColor,
                            }}
                          />
                        )}
                        <Text size="xs" fw={isSelected ? 600 : 400}>
                          {model.modelName}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" ff="monospace">
                        {formatWIS(model.wis, 2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {model.validCount}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </div>

        {/* Additional models indicator */}
        {rankedModels.length > topN && (
          <Text size="xs" c="dimmed" ta="center">
            + {rankedModels.length - topN} more model{rankedModels.length - topN !== 1 ? 's' : ''} ranked
          </Text>
        )}
      </Stack>
    </Card>
  );
};

export default ModelScorePanel;
