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
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconTarget } from '@tabler/icons-react';
import { useForecastleScenario } from '../../hooks/useForecastleScenario';
import { initialiseForecastInputs } from '../../utils/forecastleInputs';
import { validateForecastSubmission } from '../../utils/forecastleValidation';
import ForecastleChartCanvas from './ForecastleChartCanvas';

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

  useEffect(() => {
    setForecastEntries(initialiseForecastInputs(scenario?.horizons || [], latestObservationValue));
    setSubmissionErrors({});
    setSubmittedPayload(null);
  }, [scenario?.horizons, latestObservationValue]);

  const handleSubmit = () => {
    const { valid, errors } = validateForecastSubmission(forecastEntries);
    setSubmissionErrors(errors);
    if (!valid) {
      setSubmittedPayload(null);
      return;
    }
    const payload = forecastEntries.map(({ horizon, interval50, interval95 }) => ({
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
      ...forecastEntries.flatMap((entry) => [entry.interval50.upper, entry.interval95.upper]),
      0,
    );
    const yAxisMax = Math.max(baseMax, userMaxCandidate * 1.1 || 0, latestObservationValue, 1);

    const horizonDates = scenario.horizons.map((horizon) => addWeeksToDate(scenario.forecastDate, horizon));

    const handleIntervalAdjust = (index, band, edge, rawValue) => {
      const clampedValue = Math.max(Math.round(rawValue), 0);
      setForecastEntries((prevEntries) =>
        prevEntries.map((entry, idx) => {
          if (idx !== index) return entry;
          const nextEntry = {
            ...entry,
            interval50: { ...entry.interval50 },
            interval95: { ...entry.interval95 },
          };

          if (band === 'interval95') {
            if (edge === 'lower') {
              const nextLower = Math.min(clampedValue, nextEntry.interval95.upper);
              nextEntry.interval95.lower = nextLower;
              if (nextEntry.interval50.lower < nextLower) {
                nextEntry.interval50.lower = nextLower;
              }
              if (nextEntry.interval50.upper < nextLower) {
                nextEntry.interval50.upper = nextLower;
              }
            } else {
              const nextUpper = Math.max(clampedValue, nextEntry.interval95.lower);
              nextEntry.interval95.upper = nextUpper;
              if (nextEntry.interval50.upper > nextUpper) {
                nextEntry.interval50.upper = nextUpper;
              }
              if (nextEntry.interval50.lower > nextUpper) {
                nextEntry.interval50.lower = nextUpper;
              }
            }
          } else if (band === 'interval50') {
            if (edge === 'lower') {
              const lowerBound = nextEntry.interval95.lower;
              const nextLower = Math.min(Math.max(clampedValue, lowerBound), nextEntry.interval50.upper);
              nextEntry.interval50.lower = nextLower;
            } else {
              const upperBound = nextEntry.interval95.upper;
              const nextUpper = Math.min(Math.max(clampedValue, nextEntry.interval50.lower), upperBound);
              nextEntry.interval50.upper = nextUpper;
            }
          }

          if (nextEntry.interval95.lower > nextEntry.interval95.upper) {
            const midpoint = (nextEntry.interval95.lower + nextEntry.interval95.upper) / 2;
            nextEntry.interval95.lower = midpoint;
            nextEntry.interval95.upper = midpoint;
          }

          if (nextEntry.interval50.lower < nextEntry.interval95.lower) {
            nextEntry.interval50.lower = nextEntry.interval95.lower;
          }
          if (nextEntry.interval50.upper > nextEntry.interval95.upper) {
            nextEntry.interval50.upper = nextEntry.interval95.upper;
          }

          if (nextEntry.interval50.lower > nextEntry.interval50.upper) {
            const center = (nextEntry.interval95.lower + nextEntry.interval95.upper) / 2;
            nextEntry.interval50.lower = center;
            nextEntry.interval50.upper = center;
          }

          return nextEntry;
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
              Drag the circle handles on the chart to set your 50% (inner) and 95% (outer) prediction intervals for each horizon.
            </Text>

            {latestObservation && (
              <Text size="sm" c="dimmed">
                {`Latest observation (${latestObservation.date}): ${latestObservation.value.toLocaleString('en-US')} hospitalizations`}
              </Text>
            )}
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={4}>Interactive forecast canvas</Title>
            <Box style={{ width: '100%', height: 380 }}>
              <ForecastleChartCanvas
                groundTruthSeries={scenario.groundTruthSeries}
                horizonDates={horizonDates}
                entries={forecastEntries}
                maxValue={yAxisMax}
                onAdjust={handleIntervalAdjust}
                height={380}
              />
            </Box>
            <Stack gap={4}>
              {forecastEntries.map((entry) => (
                <Text key={entry.horizon} size="sm" c="dimmed">
                  {`${entry.horizon}w ahead → 50% [${entry.interval50.lower}, ${entry.interval50.upper}] · 95% [${entry.interval95.lower}, ${entry.interval95.upper}]`}
                </Text>
              ))}
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
