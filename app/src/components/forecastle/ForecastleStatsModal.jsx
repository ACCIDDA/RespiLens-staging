import { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Grid,
  Paper,
  Badge,
  Table,
  Group,
  ThemeIcon,
  Button,
  Alert,
  Divider,
  ScrollArea,
  Tooltip,
} from '@mantine/core';
import {
  IconChartBar,
  IconTarget,
  IconFlame,
  IconTrophy,
  IconDownload,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useRespilensStats } from '../../hooks/useRespilensStats';
import { clearForecastleGames, exportForecastleData } from '../../utils/respilensStorage';

const StatCard = ({ icon, label, value, color = 'blue' }) => (
  <Paper p="md" withBorder>
    <Stack gap="xs">
      <Group gap="xs">
        <ThemeIcon color={color} variant="light" size="lg">
          {icon}
        </ThemeIcon>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text size="xl" fw={700}>
        {value}
      </Text>
    </Stack>
  </Paper>
);

const ForecastleStatsModal = ({ opened, onClose }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const stats = useRespilensStats(refreshKey);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Refresh stats when modal opens
  useEffect(() => {
    if (opened) {
      setRefreshKey(prev => prev + 1);
      setExportError(null);
      setShowClearConfirm(false);
    }
  }, [opened]);

  const handleExport = () => {
    try {
      setExportError(null);
      const data = exportForecastleData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respilens-forecastle-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setExportError('Failed to export data. Please try again.');
    }
  };

  const handleClear = () => {
    clearForecastleGames();
    setRefreshKey(prev => prev + 1);
    setShowClearConfirm(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get dataset label
  const getDatasetLabel = (key) => {
    const labels = {
      flusight: 'Flu',
      rsv: 'RSV',
      covid19: 'COVID-19',
    };
    return labels[key] || key;
  };

  // Sort game history by date (most recent first)
  const sortedHistory = useMemo(() => {
    return [...stats.gameHistory].sort(
      (a, b) => new Date(b.challengeDate) - new Date(a.challengeDate)
    );
  }, [stats.gameHistory]);

  // Calculate coverage percentages with color coding
  const getCoverageColor = (percent, expectedCoverage) => {
    if (percent === null) return 'gray';
    const diff = Math.abs(percent - expectedCoverage);
    if (diff < 5) return 'green'; // Well-calibrated
    if (diff < 15) return 'yellow'; // Somewhat calibrated
    return 'red'; // Poorly calibrated
  };

  const coverage95Color = getCoverageColor(stats.coverage95Percent, 95);
  const coverage50Color = getCoverageColor(stats.coverage50Percent, 50);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconChartBar size={24} />
          <Text size="lg" fw={700}>
            Your Forecastle Statistics
          </Text>
        </Group>
      }
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="lg">
        {stats.gamesPlayed === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            No games played yet. Complete your first Forecastle challenge to see your statistics!
          </Alert>
        ) : (
          <>
            {/* Overview Stats */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  icon={<IconTarget size={20} />}
                  label="Games Played"
                  value={stats.gamesPlayed}
                  color="blue"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  icon={<IconChartBar size={20} />}
                  label="Average RMSE"
                  value={
                    stats.averageRMSE !== null ? stats.averageRMSE.toFixed(2) : 'N/A'
                  }
                  color="cyan"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  icon={<IconTrophy size={20} />}
                  label="Best RMSE"
                  value={stats.bestRMSE !== null ? stats.bestRMSE.toFixed(2) : 'N/A'}
                  color="green"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  icon={<IconFlame size={20} />}
                  label="Current Streak"
                  value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`}
                  color="orange"
                />
              </Grid.Col>
            </Grid>

            {/* Interval Coverage */}
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Text size="sm" fw={600}>
                  Interval Coverage (Forecast Calibration)
                </Text>
                <Text size="xs" c="dimmed">
                  Shows how often the true value fell within your prediction intervals. Well-calibrated forecasts should have ~95% coverage for 95% intervals and ~50% for 50% intervals.
                </Text>
                <Group grow>
                  <Paper p="sm" withBorder bg={coverage95Color === 'green' ? 'green.0' : coverage95Color === 'yellow' ? 'yellow.0' : 'red.0'}>
                    <Stack gap="xs" align="center">
                      <Text size="xs" c="dimmed">
                        95% Interval Coverage
                      </Text>
                      <Group gap="xs">
                        <Text size="xl" fw={700}>
                          {stats.coverage95Percent !== null
                            ? `${stats.coverage95Percent.toFixed(1)}%`
                            : 'N/A'}
                        </Text>
                        <Badge color={coverage95Color} size="xs">
                          {stats.coverage95Percent !== null
                            ? Math.abs(stats.coverage95Percent - 95) < 5
                              ? 'Excellent'
                              : Math.abs(stats.coverage95Percent - 95) < 15
                              ? 'Good'
                              : stats.coverage95Percent < 95
                              ? 'Too narrow'
                              : 'Too wide'
                            : 'N/A'}
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>
                  <Paper p="sm" withBorder bg={coverage50Color === 'green' ? 'green.0' : coverage50Color === 'yellow' ? 'yellow.0' : 'red.0'}>
                    <Stack gap="xs" align="center">
                      <Text size="xs" c="dimmed">
                        50% Interval Coverage
                      </Text>
                      <Group gap="xs">
                        <Text size="xl" fw={700}>
                          {stats.coverage50Percent !== null
                            ? `${stats.coverage50Percent.toFixed(1)}%`
                            : 'N/A'}
                        </Text>
                        <Badge color={coverage50Color} size="xs">
                          {stats.coverage50Percent !== null
                            ? Math.abs(stats.coverage50Percent - 50) < 5
                              ? 'Excellent'
                              : Math.abs(stats.coverage50Percent - 50) < 15
                              ? 'Good'
                              : stats.coverage50Percent < 50
                              ? 'Too narrow'
                              : 'Too wide'
                            : 'N/A'}
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>
                </Group>
              </Stack>
            </Paper>

            {/* Streaks */}
            {stats.maxStreak > 1 && (
              <Paper p="md" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon color="orange" variant="light">
                      <IconFlame size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={600}>
                        Max Streak
                      </Text>
                      <Text size="xs" c="dimmed">
                        Longest consecutive days played
                      </Text>
                    </div>
                  </Group>
                  <Text size="xl" fw={700}>
                    {stats.maxStreak} days
                  </Text>
                </Group>
              </Paper>
            )}

            <Divider />

            {/* Game History */}
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                Game History ({sortedHistory.length} games)
              </Text>
              <ScrollArea h={300}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Dataset</Table.Th>
                      <Table.Th>Location</Table.Th>
                      <Table.Th>RMSE</Table.Th>
                      <Table.Th>
                        <Tooltip label="Number of horizons where true value fell within your 95% interval">
                          <Text size="sm" style={{ cursor: 'help' }}>95% Cov</Text>
                        </Tooltip>
                      </Table.Th>
                      <Table.Th>
                        <Tooltip label="Number of horizons where true value fell within your 50% interval">
                          <Text size="sm" style={{ cursor: 'help' }}>50% Cov</Text>
                        </Tooltip>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sortedHistory.map((game) => (
                      <Table.Tr key={game.id}>
                        <Table.Td>
                          <Text size="sm">{formatDate(game.challengeDate)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light">
                            {getDatasetLabel(game.dataset)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{game.location}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {game.rmse !== null ? game.rmse.toFixed(2) : 'N/A'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {game.validHorizons > 0
                              ? `${game.coverage95}/${game.validHorizons}`
                              : 'N/A'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {game.validHorizons > 0
                              ? `${game.coverage50}/${game.validHorizons}`
                              : 'N/A'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>

            <Divider />

            {/* Export Error */}
            {exportError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setExportError(null)} withCloseButton>
                {exportError}
              </Alert>
            )}

            {/* Actions */}
            <Group justify="space-between">
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                onClick={handleExport}
              >
                Export Data
              </Button>
              {!showClearConfirm ? (
                <Button
                  leftSection={<IconTrash size={16} />}
                  variant="light"
                  color="red"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear History
                </Button>
              ) : (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    Are you sure?
                  </Text>
                  <Button size="xs" color="red" onClick={handleClear}>
                    Yes, Clear All
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </Button>
                </Group>
              )}
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
};

export default ForecastleStatsModal;
