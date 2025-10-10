import { useMemo } from 'react';
import { Box, Group, RangeSlider, Stack, Text } from '@mantine/core';

const formatHorizonLabel = (horizon) => {
  if (horizon === 1) return '1 week ahead';
  return `${horizon} weeks ahead`;
};

const ForecastleInputControls = ({ entries, onChange, maxValue }) => {
  const sliderMax = useMemo(() => Math.max(maxValue, 1), [maxValue]);

  const updateEntry = (index, type, values) => {
    const [lower, upper] = values;
    const clampedLower = Math.max(0, lower);
    const clampedUpper = Math.max(clampedLower, upper);

    const nextEntries = entries.map((entry, idx) => {
      if (idx !== index) return entry;

      const nextEntry = {
        ...entry,
        interval50: { ...entry.interval50 },
        interval95: { ...entry.interval95 },
      };

      nextEntry[type] = {
        lower: clampedLower,
        upper: clampedUpper,
      };

      if (type === 'interval95') {
        nextEntry.interval50 = {
          lower: Math.min(Math.max(nextEntry.interval50.lower, clampedLower), clampedUpper),
          upper: Math.min(Math.max(nextEntry.interval50.upper, clampedLower), clampedUpper),
        };
      } else if (type === 'interval50') {
        nextEntry.interval95 = {
          lower: Math.min(nextEntry.interval95.lower, clampedLower),
          upper: Math.max(nextEntry.interval95.upper, clampedUpper),
        };
      }

      return nextEntry;
    });

    onChange(nextEntries);
  };

  return (
    <Group align="flex-end" gap="lg" wrap="wrap">
      {entries.map((entry, index) => (
        <Stack key={entry.horizon} gap="xs" align="center" style={{ minWidth: 140 }}>
          <Text size="sm" fw={600} ta="center">
            {formatHorizonLabel(entry.horizon)}
          </Text>
          <Group align="flex-end" gap="xs">
            <Stack gap={2} align="center">
              <Text size="xs" c="dimmed">
                95%
              </Text>
              <Box h={200} px={4} style={{ display: 'flex', alignItems: 'center' }}>
                <RangeSlider
                  min={0}
                  max={sliderMax}
                  step={1}
                  value={[entry.interval95.lower, entry.interval95.upper]}
                  onChange={(values) => updateEntry(index, 'interval95', values)}
                  color="teal"
                  label={(val) => Math.round(val)}
                  styles={{
                    root: {
                      width: 180,
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                    },
                    track: { height: 10 },
                    thumb: { width: 18, height: 18 },
                  }}
                  labelPosition="left"
                />
              </Box>
              <Text size="xs" c="dimmed">
                {`${Math.round(entry.interval95.lower)}–${Math.round(entry.interval95.upper)}`}
              </Text>
            </Stack>
            <Stack gap={2} align="center">
              <Text size="xs" c="dimmed">
                50%
              </Text>
              <Box h={200} px={4} style={{ display: 'flex', alignItems: 'center' }}>
                <RangeSlider
                  min={0}
                  max={sliderMax}
                  step={1}
                  value={[entry.interval50.lower, entry.interval50.upper]}
                  onChange={(values) => updateEntry(index, 'interval50', values)}
                  color="blue"
                  label={(val) => Math.round(val)}
                  styles={{
                    root: {
                      width: 180,
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                    },
                    track: { height: 10 },
                    thumb: { width: 18, height: 18 },
                  }}
                  labelPosition="left"
                />
              </Box>
              <Text size="xs" c="dimmed">
                {`${Math.round(entry.interval50.lower)}–${Math.round(entry.interval50.upper)}`}
              </Text>
            </Stack>
          </Group>
        </Stack>
      ))}
    </Group>
  );
};

export default ForecastleInputControls;
