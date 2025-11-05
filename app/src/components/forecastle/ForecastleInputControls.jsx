import { useMemo, useState } from 'react';
import { Accordion, Group, NumberInput, RangeSlider, Stack, Text, Slider } from '@mantine/core';

const formatHorizonLabel = (horizon) => {
  if (horizon === 1) return '1 week ahead';
  return `${horizon} weeks ahead`;
};

const ForecastleInputControls = ({ entries, onChange, maxValue, mode = 'intervals', disabled = false }) => {
  const sliderMax = useMemo(() => Math.max(maxValue, 1), [maxValue]);

  const updateEntry = (index, field, value) => {
    const nextEntries = entries.map((entry, idx) => {
      if (idx !== index) return entry;

      const nextEntry = { ...entry };

      if (field === 'median') {
        nextEntry.median = Math.max(0, value);
      } else if (field === 'interval95') {
        // Two-point slider for 95% interval
        const [lower, upper] = value;
        nextEntry.lower95 = Math.max(0, lower);
        nextEntry.upper95 = Math.max(lower, upper);
        // Ensure 50% interval stays within 95% bounds
        if (nextEntry.lower50 < nextEntry.lower95) nextEntry.lower50 = nextEntry.lower95;
        if (nextEntry.upper50 > nextEntry.upper95) nextEntry.upper50 = nextEntry.upper95;
        // Update widths for backward compatibility
        nextEntry.width95 = Math.max(nextEntry.upper95 - entry.median, entry.median - nextEntry.lower95);
      } else if (field === 'interval50') {
        // Two-point slider for 50% interval
        const [lower, upper] = value;
        nextEntry.lower50 = Math.max(nextEntry.lower95 || 0, lower);
        nextEntry.upper50 = Math.min(nextEntry.upper95 || sliderMax, Math.max(lower, upper));
        // Update widths for backward compatibility
        nextEntry.width50 = Math.max(nextEntry.upper50 - entry.median, entry.median - nextEntry.lower50);
      } else if (field === 'width95') {
        // Legacy symmetric width support
        nextEntry.width95 = Math.max(0, value);
        nextEntry.lower95 = Math.max(0, entry.median - value);
        nextEntry.upper95 = entry.median + value;
        if (nextEntry.width50 > nextEntry.width95) {
          nextEntry.width50 = nextEntry.width95;
          nextEntry.lower50 = Math.max(0, entry.median - nextEntry.width50);
          nextEntry.upper50 = entry.median + nextEntry.width50;
        }
      } else if (field === 'width50') {
        // Legacy symmetric width support
        nextEntry.width50 = Math.min(Math.max(0, value), entry.width95);
        nextEntry.lower50 = Math.max(0, entry.median - nextEntry.width50);
        nextEntry.upper50 = entry.median + nextEntry.width50;
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
                disabled={disabled}
              />
            </Stack>
          </Stack>
        ))}
      </Group>
    );
  }

  // Calculate initial auto interval values from current entries
  const calculateAutoIntervalParams = () => {
    if (entries.length === 0) return { initialWidth95: 0, growthRate95: 0, initialWidth50: 0, growthRate50: 0 };

    // For first horizon
    const firstEntry = entries[0];
    const initialWidth95 = (firstEntry.upper95 - firstEntry.lower95) / 2;
    const initialWidth50 = (firstEntry.upper50 - firstEntry.lower50) / 2;

    // Calculate growth rate from first to last horizon
    if (entries.length > 1) {
      const lastEntry = entries[entries.length - 1];
      const lastWidth95 = (lastEntry.upper95 - lastEntry.lower95) / 2;
      const lastWidth50 = (lastEntry.upper50 - lastEntry.lower50) / 2;
      const horizonDiff = lastEntry.horizon - firstEntry.horizon;

      const growthRate95 = horizonDiff > 0 ? (lastWidth95 - initialWidth95) / horizonDiff : 0;
      const growthRate50 = horizonDiff > 0 ? (lastWidth50 - initialWidth50) / horizonDiff : 0;

      return { initialWidth95, growthRate95, initialWidth50, growthRate50 };
    }

    return { initialWidth95, growthRate95: 0, initialWidth50, growthRate50: 0 };
  };

  const autoParams = useMemo(calculateAutoIntervalParams, [entries]);
  const [initialWidth95, setInitialWidth95] = useState(autoParams.initialWidth95);
  const [growthRate95, setGrowthRate95] = useState(autoParams.growthRate95);
  const [initialWidth50, setInitialWidth50] = useState(autoParams.initialWidth50);
  const [growthRate50, setGrowthRate50] = useState(autoParams.growthRate50);

  // Apply auto interval to all horizons
  const applyAutoInterval = (initWidth95, growth95, initWidth50, growth50) => {
    const nextEntries = entries.map((entry, idx) => {
      const horizonIndex = entry.horizon - (entries[0]?.horizon || 1);
      const width95 = Math.max(0, initWidth95 + (growth95 * horizonIndex));
      const width50 = Math.max(0, Math.min(width95, initWidth50 + (growth50 * horizonIndex)));

      return {
        ...entry,
        lower95: Math.max(0, entry.median - width95),
        upper95: entry.median + width95,
        lower50: Math.max(0, entry.median - width50),
        upper50: entry.median + width50,
        width95,
        width50,
      };
    });

    onChange(nextEntries);
  };

  // In intervals mode, show auto interval controls + advanced section
  return (
    <Stack gap="lg">
      {/* Auto Interval Controls */}
      <Stack gap="md">
        <Text size="sm" fw={600}>Auto Interval</Text>

        {/* 95% Interval Auto Controls */}
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">95% Confidence Interval</Text>
          <Group grow>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Initial Width</Text>
              <NumberInput
                value={Math.round(initialWidth95)}
                onChange={(val) => {
                  const newVal = Math.max(0, val || 0);
                  setInitialWidth95(newVal);
                  applyAutoInterval(newVal, growthRate95, initialWidth50, growthRate50);
                }}
                min={0}
                max={sliderMax / 2}
                step={10}
                size="sm"
                disabled={disabled}
              />
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Growth per Week</Text>
              <NumberInput
                value={Math.round(growthRate95 * 10) / 10}
                onChange={(val) => {
                  const newVal = val || 0;
                  setGrowthRate95(newVal);
                  applyAutoInterval(initialWidth95, newVal, initialWidth50, growthRate50);
                }}
                step={5}
                size="sm"
                disabled={disabled}
              />
            </Stack>
          </Group>
        </Stack>

        {/* 50% Interval Auto Controls */}
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">50% Confidence Interval</Text>
          <Group grow>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Initial Width</Text>
              <NumberInput
                value={Math.round(initialWidth50)}
                onChange={(val) => {
                  const newVal = Math.max(0, val || 0);
                  setInitialWidth50(newVal);
                  applyAutoInterval(initialWidth95, growthRate95, newVal, growthRate50);
                }}
                min={0}
                max={initialWidth95}
                step={5}
                size="sm"
                disabled={disabled}
              />
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Growth per Week</Text>
              <NumberInput
                value={Math.round(growthRate50 * 10) / 10}
                onChange={(val) => {
                  const newVal = val || 0;
                  setGrowthRate50(newVal);
                  applyAutoInterval(initialWidth95, growthRate95, initialWidth50, newVal);
                }}
                step={2}
                size="sm"
                disabled={disabled}
              />
            </Stack>
          </Group>
        </Stack>

        {/* Preview of applied intervals */}
        <Group gap="xs" wrap="wrap">
          {entries.map((entry) => (
            <Stack key={entry.horizon} gap={2} style={{ minWidth: 90 }}>
              <Text size="xs" c="dimmed" ta="center">
                {formatHorizonLabel(entry.horizon)}
              </Text>
              <Text size="xs" fw={500} ta="center" c="red.7">
                [{Math.round(entry.lower95)}, {Math.round(entry.upper95)}]
              </Text>
              <Text size="xs" fw={500} ta="center" c="pink.7">
                [{Math.round(entry.lower50)}, {Math.round(entry.upper50)}]
              </Text>
            </Stack>
          ))}
        </Group>
      </Stack>

      {/* Advanced - Detailed Sliders */}
      <Accordion variant="contained">
        <Accordion.Item value="advanced">
          <Accordion.Control>
            <Text size="sm" fw={600}>Advanced Controls</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Group align="flex-start" gap="lg" wrap="wrap">
              {entries.map((entry, index) => (
                <Stack key={entry.horizon} gap="xs" style={{ minWidth: 200 }}>
                  <Text size="sm" fw={600} ta="center">
                    {formatHorizonLabel(entry.horizon)}
                  </Text>

                  <Text size="xs" c="dimmed" ta="center">
                    Median: <Text component="span" fw={600}>{Math.round(entry.median)}</Text>
                  </Text>

                  {/* 95% Interval - Two-point range slider */}
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">95% Interval</Text>
                      <Text size="xs" fw={500}>
                        [{Math.round(entry.lower95)}, {Math.round(entry.upper95)}]
                      </Text>
                    </Group>
                    <RangeSlider
                      value={[entry.lower95, entry.upper95]}
                      onChange={(val) => updateEntry(index, 'interval95', val)}
                      min={0}
                      max={sliderMax}
                      step={1}
                      color="red"
                      size="sm"
                      minRange={0}
                      disabled={disabled}
                      marks={[
                        { value: 0, label: '0' },
                        { value: entry.median, label: `${Math.round(entry.median)}` },
                        { value: sliderMax, label: `${Math.round(sliderMax)}` },
                      ]}
                    />
                    <Text size="xs" c="dimmed" ta="center">
                      Range: {Math.round(entry.upper95 - entry.lower95)}
                    </Text>
                  </Stack>

                  {/* 50% Interval - Two-point range slider */}
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">50% Interval</Text>
                      <Text size="xs" fw={500}>
                        [{Math.round(entry.lower50)}, {Math.round(entry.upper50)}]
                      </Text>
                    </Group>
                    <RangeSlider
                      value={[entry.lower50, entry.upper50]}
                      onChange={(val) => updateEntry(index, 'interval50', val)}
                      min={entry.lower95}
                      max={entry.upper95}
                      step={1}
                      color="pink"
                      size="sm"
                      minRange={0}
                      disabled={disabled}
                    />
                    <Text size="xs" c="dimmed" ta="center">
                      Range: {Math.round(entry.upper50 - entry.lower50)}
                    </Text>
                  </Stack>
                </Stack>
              ))}
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};

export default ForecastleInputControls;
