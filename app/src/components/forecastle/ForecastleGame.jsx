import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Stepper,
  Switch,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconTarget, IconCheck } from '@tabler/icons-react';
import { useForecastleScenario } from '../../hooks/useForecastleScenario';
import { initialiseForecastInputs, convertToIntervals } from '../../utils/forecastleInputs';
import { validateForecastSubmission } from '../../utils/forecastleValidation';
import ForecastleChartCanvas from './ForecastleChartCanvas';
import ForecastleInputControls from './ForecastleInputControls';

const addWeeksToDate = (dateString, weeks) => {
  const base = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return dateString;
  }
  base.setUTCDate(base.getUTCDate() + weeks * 7);
  return base.toISOString().slice(0, 10);
};

const ForecastleGame = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();

  useEffect(() => {
    if (queryString.length > 0) {
      setSearchParams({}, { replace: true });
    }
  }, [queryString, setSearchParams]);

  const { scenario, loading, error } = useForecastleScenario();

  const latestObservationValue = useMemo(() => {
    const series = scenario?.groundTruthSeries;
    if (!series || series.length === 0) return 0;
    const lastValue = series[series.length - 1]?.value;
    return Number.isFinite(lastValue) ? lastValue : 0;
  }, [scenario?.groundTruthSeries]);

  const initialInputs = useMemo(
    () => initialiseForecastInputs(scenario?.horizons || [], latestObservationValue),
    [scenario?.horizons, latestObservationValue],
  );
  const [forecastEntries, setForecastEntries] = useState(initialInputs);
  const [submissionErrors, setSubmissionErrors] = useState({});
  const [submittedPayload, setSubmittedPayload] = useState(null);
  const [inputMode, setInputMode] = useState('median'); // 'median' or 'intervals'
  const [zoomedView, setZoomedView] = useState(true); // Start with zoomed view for easier input

  useEffect(() => {
    setForecastEntries(initialiseForecastInputs(scenario?.horizons || [], latestObservationValue));
    setSubmissionErrors({});
    setSubmittedPayload(null);
  }, [scenario?.horizons, latestObservationValue]);

  const handleSubmit = () => {
    // Convert to intervals for validation
    const intervalsForValidation = convertToIntervals(forecastEntries);
    const { valid, errors } = validateForecastSubmission(intervalsForValidation);
    setSubmissionErrors(errors);
    if (!valid) {
      setSubmittedPayload(null);
      return;
    }
    const payload = intervalsForValidation.map(({ horizon, interval50, interval95 }) => ({
      horizon,
      interval50: [interval50.lower, interval50.upper],
      interval95: [interval95.lower, interval95.upper],
    }));
    setSubmittedPayload({ submittedAt: new Date().toISOString(), payload });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Center style={{ minHeight: '60vh' }}>
          <Loader size="lg" />
        </Center>
      );
    }

    if (error) {
      return (
        <Alert icon={<IconAlertTriangle size={16} />} title="Unable to load Forecastle" color="red">
          {error.message}
        </Alert>
      );
    }

    if (!scenario) {
      return (
        <Alert icon={<IconAlertTriangle size={16} />} title="No challenge available" color="yellow">
          Please check back later for the next Forecastle challenge.
        </Alert>
      );
    }

    const latestObservation =
      scenario.groundTruthSeries[scenario.groundTruthSeries.length - 1] ?? null;
    const latestValue = Number.isFinite(latestObservationValue) ? latestObservationValue : 0;
    const baseMax = latestValue > 0 ? latestValue * 5 : 1;
    const userMaxCandidate = Math.max(
      ...forecastEntries.map((entry) => (entry.median ?? 0) + (entry.width95 ?? 0)),
      0,
    );
    const yAxisMax = Math.max(baseMax, userMaxCandidate * 1.1 || 0, latestObservationValue, 1);

    const horizonDates = scenario.horizons.map((horizon) => addWeeksToDate(scenario.forecastDate, horizon));

    const handleMedianAdjust = (index, field, value) => {
      setForecastEntries((prevEntries) =>
        prevEntries.map((entry, idx) => {
          if (idx !== index) return entry;
          return {
            ...entry,
            [field]: Math.max(0, value),
          };
        }),
      );
      setSubmissionErrors({});
      if (submittedPayload) {
        setSubmittedPayload(null);
      }
    };

    return (
      <Stack gap="lg">
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconTarget size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>Forecastle Daily Challenge</Title>
                <Text size="sm" c="dimmed">
                  {`Generated for ${scenario.challengeDate} (Eastern)`}
                </Text>
              </div>
            </Group>

            <Group gap="xs">
              <Badge variant="light" color="blue">
                {scenario.dataset.label}
              </Badge>
              <Badge variant="light" color="grape">
                {`${scenario.location.name} (${scenario.location.abbreviation})`}
              </Badge>
              <Badge variant="light" color="teal">
                {`Forecast date ${scenario.forecastDate}`}
              </Badge>
            </Group>

            <Text size="sm">
              {inputMode === 'median'
                ? 'Step 1: Set your median forecast for each horizon by dragging the handles or using the controls below.'
                : 'Step 2: Adjust the uncertainty intervals (50% and 95% widths) for each forecast.'}
            </Text>

            {latestObservation && (
              <Text size="sm" c="dimmed">
                {`Latest observation (${latestObservation.date}): ${latestObservation.value.toLocaleString('en-US')} hospitalizations`}
              </Text>
            )}
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Stepper
              active={inputMode === 'median' ? 0 : 1}
              onStepClick={(step) => setInputMode(step === 0 ? 'median' : 'intervals')}
              allowNextStepsSelect={false}
            >
              <Stepper.Step
                label="Set Median"
                description="Point forecasts"
                completedIcon={<IconCheck size={18} />}
              />
              <Stepper.Step
                label="Set Intervals"
                description="Uncertainty bands"
                completedIcon={<IconCheck size={18} />}
              />
            </Stepper>

            <Grid gutter="lg">
              {/* Left Panel - Chart */}
              <Grid.Col span={{ base: 12, lg: 7 }}>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={5}>Interactive Chart</Title>
                    <Switch
                      label="Show Full History"
                      checked={!zoomedView}
                      onChange={(event) => setZoomedView(!event.currentTarget.checked)}
                      color="red"
                      size="md"
                    />
                  </Group>
                  <Box style={{ width: '100%', height: 380 }}>
                    <ForecastleChartCanvas
                      groundTruthSeries={scenario.groundTruthSeries}
                      horizonDates={horizonDates}
                      entries={forecastEntries}
                      maxValue={yAxisMax}
                      onAdjust={handleMedianAdjust}
                      height={380}
                      showIntervals={inputMode === 'intervals'}
                      zoomedView={zoomedView}
                    />
                  </Box>
                  <Text size="sm" c="dimmed">
                    {inputMode === 'median'
                      ? 'Drag the yellow handles to set your median forecast for each week ahead.'
                      : 'The filled areas show your 95% (outer) and 50% (inner) prediction intervals.'}
                  </Text>
                </Stack>
              </Grid.Col>

              {/* Right Panel - Controls */}
              <Grid.Col span={{ base: 12, lg: 5 }}>
                <Stack gap="md" h="100%">
                  <Title order={5}>
                    {inputMode === 'median' ? 'Median Forecasts' : 'Uncertainty Intervals'}
                  </Title>
                  <ForecastleInputControls
                    entries={forecastEntries}
                    onChange={setForecastEntries}
                    maxValue={yAxisMax}
                    mode={inputMode}
                  />
                  <Box mt="auto">
                    {inputMode === 'median' ? (
                      <Button
                        onClick={() => setInputMode('intervals')}
                        size="md"
                        fullWidth
                        rightSection="→"
                      >
                        Next: Set Uncertainty Intervals
                      </Button>
                    ) : (
                      <Group>
                        <Button
                          onClick={() => setInputMode('median')}
                          variant="default"
                          leftSection="←"
                        >
                          Back
                        </Button>
                      </Group>
                    )}
                  </Box>
                </Stack>
              </Grid.Col>
            </Grid>

            <Divider my="xs" />
            <Stack gap={4}>
              <Text size="sm" fw={500}>Current Forecast Summary:</Text>
              {forecastEntries.map((entry) => {
                const interval50Lower = Math.max(0, entry.median - entry.width50);
                const interval50Upper = entry.median + entry.width50;
                const interval95Lower = Math.max(0, entry.median - entry.width95);
                const interval95Upper = entry.median + entry.width95;
                return (
                  <Text key={entry.horizon} size="sm" c="dimmed">
                    {`${entry.horizon}w ahead → Median: ${Math.round(entry.median)} · 50% [${Math.round(interval50Lower)}, ${Math.round(interval50Upper)}] · 95% [${Math.round(interval95Lower)}, ${Math.round(interval95Upper)}]`}
                  </Text>
                );
              })}
            </Stack>
            {Object.keys(submissionErrors).length > 0 && (
              <Alert color="red" variant="light" title="Please adjust your intervals">
                <Stack gap={4}>
                  {Object.entries(submissionErrors).map(([horizon, messages]) => (
                    <Text key={horizon} size="sm">
                      {`Horizon ${horizon}: ${messages.join(', ')}`}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={4}>Submit your forecast</Title>
            <Text size="sm">
              When you’re happy with the intervals, submit to store today’s guess locally. Weighted Interval Score (WIS) feedback is coming soon.
            </Text>
            <Group justify="flex-end">
              <Button onClick={handleSubmit}>Submit forecast</Button>
            </Group>
            {submittedPayload && (
              <Alert title="Submission recorded" color="green" variant="light">
                <Text size="sm">
                  We stored your intervals locally. WIS scoring against ensemble models is coming soon.
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Payload: {JSON.stringify(submittedPayload.payload)}
                </Text>
              </Alert>
            )}
            <Divider my="xs" />
            <Text size="xs" c="dimmed">
              Challenge seed: {scenario.challengeDate} · Dataset file: {scenario.dataFilePath}
            </Text>
          </Stack>
        </Paper>
      </Stack>
    );
  };

  return (
    <Container size="xl" py="xl" style={{ maxWidth: '1100px' }}>
      {renderContent()}
    </Container>
  );
};

export default ForecastleGame;
