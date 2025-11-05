import { useMemo, useState, useEffect } from 'react';
import { Accordion, Group, NumberInput, RangeSlider, Stack, Text, Slider, SegmentedControl } from '@mantine/core';

const formatHorizonLabel = (horizon) => {
  if (horizon === 1) return '1 week ahead';
  return `${horizon} weeks ahead`;
};

const ForecastleInputControls = ({ entries, onChange, maxValue, mode = 'intervals', disabled = false }) => {
  const sliderMax = useMemo(() => Math.max(maxValue, 1), [maxValue]);

  // Calculate initial auto interval values from current entries
  // This must be called before any conditional returns to follow Rules of Hooks
  const calculateAutoIntervalParams = () => {
    if (entries.length === 0) return { width50: 0, growth50: 0, additionalWidth95: 0, additionalGrowth95: 0 };

    // For first horizon
    const firstEntry = entries[0];
    const width50 = (firstEntry.upper50 - firstEntry.lower50) / 2;
    const width95 = (firstEntry.upper95 - firstEntry.lower95) / 2;
    const additionalWidth95 = Math.max(0, width95 - width50);

    // Calculate growth rate from first to last horizon
    if (entries.length > 1) {
      const lastEntry = entries[entries.length - 1];
      const lastWidth50 = (lastEntry.upper50 - lastEntry.lower50) / 2;
      const lastWidth95 = (lastEntry.upper95 - lastEntry.lower95) / 2;
      const lastAdditionalWidth95 = Math.max(0, lastWidth95 - lastWidth50);
      const horizonDiff = lastEntry.horizon - firstEntry.horizon;

      const growth50 = horizonDiff > 0 ? (lastWidth50 - width50) / horizonDiff : 0;
      const additionalGrowth95 = horizonDiff > 0 ? (lastAdditionalWidth95 - additionalWidth95) / horizonDiff : 0;

      return { width50, growth50, additionalWidth95, additionalGrowth95 };
    }

    return { width50, growth50: 0, additionalWidth95, additionalGrowth95: 0 };
  };

  const autoParams = useMemo(calculateAutoIntervalParams, [entries]);
  const [intervalMode, setIntervalMode] = useState('auto'); // 'auto' or 'manual'
  const [width50, setWidth50] = useState(autoParams.width50);
  const [growth50, setGrowth50] = useState(autoParams.growth50);
  const [additionalWidth95, setAdditionalWidth95] = useState(autoParams.additionalWidth95);
  const [additionalGrowth95, setAdditionalGrowth95] = useState(autoParams.additionalGrowth95);
  const [isSliding, setIsSliding] = useState(false); // Track if user is actively sliding

  // Update state when entries change, but only if not currently sliding and in auto mode
  useEffect(() => {
    if (!isSliding && intervalMode === 'auto') {
      const params = calculateAutoIntervalParams();
      setWidth50(params.width50);
      setGrowth50(params.growth50);
      setAdditionalWidth95(params.additionalWidth95);
      setAdditionalGrowth95(params.additionalGrowth95);
    }
  }, [entries, isSliding, intervalMode]);

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

  // Apply auto interval to all horizons
  const applyAutoInterval = (baseWidth50, baseGrowth50, addWidth95, addGrowth95) => {
    const nextEntries = entries.map((entry, idx) => {
      const horizonIndex = entry.horizon - (entries[0]?.horizon || 1);
      const currentWidth50 = Math.max(0, baseWidth50 + (baseGrowth50 * horizonIndex));
      const currentAdditionalWidth95 = Math.max(0, addWidth95 + (addGrowth95 * horizonIndex));
      const currentWidth95 = currentWidth50 + currentAdditionalWidth95;

      return {
        ...entry,
        lower95: Math.max(0, entry.median - currentWidth95),
        upper95: entry.median + currentWidth95,
        lower50: Math.max(0, entry.median - currentWidth50),
        upper50: entry.median + currentWidth50,
        width95: currentWidth95,
        width50: currentWidth50,
      };
    });

    onChange(nextEntries);
  };

  // In intervals mode, show auto interval controls + advanced section
  return (
    <Stack gap="lg">
      {/* Mode Toggle */}
      <SegmentedControl
        value={intervalMode}
        onChange={setIntervalMode}
        data={[
          { label: 'Auto Interval', value: 'auto' },
          { label: 'Manual Controls', value: 'manual' },
        ]}
        fullWidth
        color="blue"
        size="sm"
      />

      {intervalMode === 'auto' ? (
        /* Auto Interval Controls */
        <Stack gap="md">
          <Text size="sm" fw={600}>Auto Interval</Text>

          {/* 50% Interval Auto Controls */}
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" fw={500} c="dimmed">50% Interval Width</Text>
              <Text size="xs" fw={600}>{Math.round(width50)}</Text>
            </Group>
            <Slider
              value={width50}
              onChange={(val) => {
                setWidth50(val);
                applyAutoInterval(val, growth50, additionalWidth95, additionalGrowth95);
              }}
              onChangeEnd={() => setIsSliding(false)}
              onMouseDown={() => setIsSliding(true)}
              onTouchStart={() => setIsSliding(true)}
              min={0}
              max={sliderMax / 2}
              step={1}
              color="pink"
              size="md"
              disabled={disabled}
              marks={[
                { value: 0, label: '0' },
                { value: sliderMax / 4, label: `${Math.round(sliderMax / 4)}` },
                { value: sliderMax / 2, label: `${Math.round(sliderMax / 2)}` },
              ]}
            />
          </Stack>

          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" fw={500} c="dimmed">50% Growth per Week</Text>
              <Text size="xs" fw={600}>{Math.round(growth50 * 10) / 10}</Text>
            </Group>
            <Slider
              value={growth50}
              onChange={(val) => {
                setGrowth50(val);
                applyAutoInterval(width50, val, additionalWidth95, additionalGrowth95);
              }}
              onChangeEnd={() => setIsSliding(false)}
              onMouseDown={() => setIsSliding(true)}
              onTouchStart={() => setIsSliding(true)}
              min={-50}
              max={100}
              step={1}
              color="pink"
              size="md"
              disabled={disabled}
              marks={[
                { value: -50, label: '-50' },
                { value: 0, label: '0' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
          </Stack>

          {/* 95% Additional Width (beyond 50%) */}
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" fw={500} c="dimmed">95% Additional Width (beyond 50%)</Text>
              <Text size="xs" fw={600}>{Math.round(additionalWidth95)}</Text>
            </Group>
            <Slider
              value={additionalWidth95}
              onChange={(val) => {
                setAdditionalWidth95(val);
                applyAutoInterval(width50, growth50, val, additionalGrowth95);
              }}
              onChangeEnd={() => setIsSliding(false)}
              onMouseDown={() => setIsSliding(true)}
              onTouchStart={() => setIsSliding(true)}
              min={0}
              max={sliderMax / 2}
              step={1}
              color="red"
              size="md"
              disabled={disabled}
              marks={[
                { value: 0, label: '0' },
                { value: sliderMax / 4, label: `${Math.round(sliderMax / 4)}` },
                { value: sliderMax / 2, label: `${Math.round(sliderMax / 2)}` },
              ]}
            />
          </Stack>

          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" fw={500} c="dimmed">95% Additional Growth per Week</Text>
              <Text size="xs" fw={600}>{Math.round(additionalGrowth95 * 10) / 10}</Text>
            </Group>
            <Slider
              value={additionalGrowth95}
              onChange={(val) => {
                setAdditionalGrowth95(val);
                applyAutoInterval(width50, growth50, additionalWidth95, val);
              }}
              onChangeEnd={() => setIsSliding(false)}
              onMouseDown={() => setIsSliding(true)}
              onTouchStart={() => setIsSliding(true)}
              min={-50}
              max={100}
              step={1}
              color="red"
              size="md"
              disabled={disabled}
              marks={[
                { value: -50, label: '-50' },
                { value: 0, label: '0' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
          </Stack>

          {/* Preview of applied intervals */}
          <Stack gap="xs" mt="md">
            <Text size="xs" fw={500} c="dimmed">Preview</Text>
            <Group gap="xs" wrap="wrap">
              {entries.map((entry) => (
                <Stack key={entry.horizon} gap={2} style={{ minWidth: 90 }}>
                  <Text size="xs" c="dimmed" ta="center">
                    {formatHorizonLabel(entry.horizon)}
                  </Text>
                  <Text size="xs" fw={500} ta="center" c="pink.7">
                    50%: [{Math.round(entry.lower50)}, {Math.round(entry.upper50)}]
                  </Text>
                  <Text size="xs" fw={500} ta="center" c="red.7">
                    95%: [{Math.round(entry.lower95)}, {Math.round(entry.upper95)}]
                  </Text>
                </Stack>
              ))}
            </Group>
          </Stack>
        </Stack>
      ) : (
        /* Manual - Detailed Sliders */
        <Stack gap="md">
          <Text size="sm" fw={600} mb="xs">Manual Controls</Text>
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
        </Stack>
      )}
    </Stack>
  );
};

export default ForecastleInputControls;
