import { Stack, Text, SegmentedControl, Checkbox, Group, Switch } from '@mantine/core';

const INTERVAL_OPTIONS = [
  { value: 'median', label: 'Median' },
  { value: 'ci50', label: '50% interval' },
  { value: 'ci95', label: '95% interval' }
];

const SCALE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'log', label: 'Log' },
  { value: 'sqrt', label: 'Sqrt' }
];

const ForecastChartControls = ({
  chartScale,
  setChartScale,
  intervalVisibility,
  setIntervalVisibility,
  showLegend,
  setShowLegend,
  showIntervals = true
}) => {
  const selectedIntervals = INTERVAL_OPTIONS
    .filter((option) => intervalVisibility?.[option.value])
    .map((option) => option.value);

  const handleIntervalChange = (values) => {
    setIntervalVisibility({
      median: values.includes('median'),
      ci50: values.includes('ci50'),
      ci95: values.includes('ci95')
    });
  };

  return (
    <Stack gap="xs">
      <Group align="center" gap="md">
        <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>Y-scale</Text>
        <SegmentedControl
          data={SCALE_OPTIONS}
          value={chartScale}
          onChange={setChartScale}
          size="xs"
        />
      </Group>
      {showIntervals && (
        <Group align="center" gap="md">
          <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>Intervals</Text>
          <Checkbox.Group value={selectedIntervals} onChange={handleIntervalChange}>
            <Group gap="sm">
              {INTERVAL_OPTIONS.map((option) => (
                <Checkbox key={option.value} value={option.value} label={option.label} size="xs" />
              ))}
            </Group>
          </Checkbox.Group>
        </Group>
      )}
      <Group align="center" gap="md">
        <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>Legend</Text>
        <Switch
          checked={showLegend}
          onChange={(event) => setShowLegend(event.currentTarget.checked)}
          size="sm"
          onLabel="On"
          offLabel="Off"
        />
      </Group>
    </Stack>
  );
};

export default ForecastChartControls;
