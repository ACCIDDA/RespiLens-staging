import { Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import Plot from 'react-plotly.js';

const OverviewGraphCard = ({
  title,
  meta = null,
  loading,
  loadingLabel = 'Loading data...',
  error,
  errorLabel,
  traces,
  layout,
  emptyLabel = 'No data available.',
  actionLabel,
  actionActive = false,
  onAction,
  actionIcon,
  locationLabel
}) => {
  const hasTraces = Array.isArray(traces) && traces.length > 0;
  const showEmpty = !loading && !error && !hasTraces && emptyLabel;

  return (
    <Card withBorder radius="md" padding="lg" shadow="xs">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={5}>{title}</Title>
          {meta}
        </Group>
        {loading && (
          <Stack align="center" gap="xs" py="lg">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">{loadingLabel}</Text>
          </Stack>
        )}
        {!loading && error && (
          <Text size="sm" c="red">{errorLabel || error}</Text>
        )}
        {!loading && !error && hasTraces && (
          <div style={{ width: '100%', height: 240, minHeight: 200 }}>
            <Plot
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
              data={traces}
              layout={layout}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        )}
        {showEmpty && (
          <Text size="sm" c="dimmed">{emptyLabel}</Text>
        )}
        <Group justify="space-between" align="center">
          <Button
            size="xs"
            variant={actionActive ? 'light' : 'filled'}
            onClick={onAction}
            rightSection={actionIcon}
          >
            {actionLabel}
          </Button>
          <Text size="xs" c="dimmed">{locationLabel}</Text>
        </Group>
      </Stack>
    </Card>
  );
};

export default OverviewGraphCard;
