import { useMemo } from 'react';
import { Box, Group, NumberInput, Slider, Stack, Text } from '@mantine/core';

const formatHorizonLabel = (horizon) => {
  if (horizon === 1) return '1 week ahead';
  return `${horizon} weeks ahead`;
};

const ForecastleInputControls = ({ entries, onChange, maxValue, mode = 'intervals' }) => {
  const sliderMax = useMemo(() => Math.max(maxValue, 1), [maxValue]);

  const updateEntry = (index, field, value) => {
    const nextEntries = entries.map((entry, idx) => {
      if (idx !== index) return entry;

      const nextEntry = { ...entry };

      if (field === 'median') {
        nextEntry.median = Math.max(0, value);
      } else if (field === 'width95') {
        nextEntry.width95 = Math.max(0, value);
        // If 95% width becomes smaller than 50%, shrink 50% to fit
        if (nextEntry.width50 > nextEntry.width95) {
          nextEntry.width50 = nextEntry.width95;
        }
      } else if (field === 'width50') {
        // Ensure 50% width doesn't exceed 95% width
        nextEntry.width50 = Math.min(Math.max(0, value), entry.width95);
      }

      return nextEntry;
    });

    onChange(nextEntries);
  };

  // In median mode, show only median controls
  if (mode === 'median') {
    return (
      <Group align="flex-start" gap="lg" wrap="wrap">
        {entries.map((entry, index) => (
          <Stack key={entry.horizon} gap="xs" style={{ minWidth: 160 }}>
            <Text size="sm" fw={600} ta="center">
              {formatHorizonLabel(entry.horizon)}
            </Text>

            {/* Median */}
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>Median Forecast</Text>
              <NumberInput
                value={entry.median}
                onChange={(val) => updateEntry(index, 'median', val)}
                min={0}
                max={sliderMax}
                step={10}
                size="sm"
              />
            </Stack>
          </Stack>
        ))}
      </Group>
    );
  }

  // In intervals mode, show width sliders
  return (
    <Group align="flex-start" gap="lg" wrap="wrap">
      {entries.map((entry, index) => (
        <Stack key={entry.horizon} gap="xs" style={{ minWidth: 160 }}>
          <Text size="sm" fw={600} ta="center">
            {formatHorizonLabel(entry.horizon)}
          </Text>

          <Text size="xs" c="dimmed" ta="center">
            Median: <Text component="span" fw={600}>{Math.round(entry.median)}</Text>
          </Text>

          {/* 95% Width */}
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">95% Width</Text>
              <Text size="xs" fw={500}>±{Math.round(entry.width95)}</Text>
            </Group>
            <Slider
              value={entry.width95}
              onChange={(val) => updateEntry(index, 'width95', val)}
              min={0}
              max={sliderMax / 2}
              step={1}
              color="lime"
              size="sm"
              marks={[
                { value: 0, label: '0' },
                { value: Math.round(sliderMax / 4), label: Math.round(sliderMax / 4).toString() },
              ]}
            />
            <Text size="xs" c="dimmed" ta="center">
              [{Math.max(0, Math.round(entry.median - entry.width95))}, {Math.round(entry.median + entry.width95)}]
            </Text>
          </Stack>

          {/* 50% Width */}
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">50% Width</Text>
              <Text size="xs" fw={500}>±{Math.round(entry.width50)}</Text>
            </Group>
            <Slider
              value={entry.width50}
              onChange={(val) => updateEntry(index, 'width50', val)}
              min={0}
              max={entry.width95}
              step={1}
              color="blue"
              size="sm"
            />
            <Text size="xs" c="dimmed" ta="center">
              [{Math.max(0, Math.round(entry.median - entry.width50))}, {Math.round(entry.median + entry.width50)}]
            </Text>
          </Stack>
        </Stack>
      ))}
    </Group>
  );
};

export default ForecastleInputControls;
