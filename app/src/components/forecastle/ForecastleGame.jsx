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
import { IconAlertTriangle, IconTarget, IconCheck, IconTrophy } from '@tabler/icons-react';
import { useForecastleScenario } from '../../hooks/useForecastleScenario';
import { initialiseForecastInputs, convertToIntervals } from '../../utils/forecastleInputs';
import { validateForecastSubmission } from '../../utils/forecastleValidation';
import {
  extractGroundTruthForHorizons,
  scoreUserForecast,
  scoreModels,
} from '../../utils/forecastleScoring';
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
  const [scores, setScores] = useState(null);
  const [inputMode, setInputMode] = useState('median'); // 'median', 'intervals', or 'scoring'
  const [zoomedView, setZoomedView] = useState(true); // Start with zoomed view for easier input

  useEffect(() => {
    setForecastEntries(initialiseForecastInputs(scenario?.horizons || [], latestObservationValue));
    setSubmissionErrors({});
    setSubmittedPayload(null);
    setScores(null);
    setInputMode('median');
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

    // Calculate scores if ground truth is available
    if (scenario?.fullGroundTruthSeries) {
      const horizonDates = scenario.horizons.map((horizon) =>
        addWeeksToDate(scenario.forecastDate, horizon)
      );
      const groundTruthValues = extractGroundTruthForHorizons(
        scenario.fullGroundTruthSeries,
        horizonDates
      );

      // Score user forecast
      const userMedians = forecastEntries.map((entry) => entry.median);
      const userScore = scoreUserForecast(userMedians, groundTruthValues);

      // Score models
      const modelScores = scoreModels(
        scenario.modelForecasts || {},
        scenario.horizons,
        groundTruthValues
      );

      setScores({
        user: userScore,
        models: modelScores,
        groundTruth: groundTruthValues,
        horizonDates,
      });
    }
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
                : inputMode === 'intervals'
                ? 'Step 2: Adjust the uncertainty intervals (50% and 95% widths) for each forecast.'
                : 'Step 3: View your RMSE score and compare with model forecasts.'}
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
              active={inputMode === 'median' ? 0 : inputMode === 'intervals' ? 1 : 2}
              onStepClick={(step) => {
                if (step === 0) setInputMode('median');
                else if (step === 1) setInputMode('intervals');
                else if (step === 2 && scores) setInputMode('scoring');
              }}
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
              <Stepper.Step
                label="View Scores"
                description="RMSE comparison"
                completedIcon={<IconTrophy size={18} />}
              />
            </Stepper>

            {inputMode === 'scoring' && scores ? (
              <Stack gap="lg">
                {scores.user.rmse !== null ? (
                  <>
                    {/* Hub Ensemble Comparison */}
                    {(() => {
                      const hubEnsemble = scores.models.find(m =>
                        m.modelName.toLowerCase().includes('hub') ||
                        m.modelName.toLowerCase().includes('ensemble')
                      );
                      const userBetterThanHub = hubEnsemble && scores.user.rmse < hubEnsemble.rmse;

                      return hubEnsemble ? (
                        <Paper p="md" withBorder style={{ backgroundColor: userBetterThanHub ? '#d4f4dd' : '#fff3cd' }}>
                          <Stack gap="xs">
                            <Group justify="space-between" align="center">
                              <div>
                                <Text size="lg" fw={700}>
                                  Your RMSE: {scores.user.rmse.toFixed(2)}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  Hub Ensemble: {hubEnsemble.rmse.toFixed(2)}
                                </Text>
                              </div>
                              <Badge
                                size="lg"
                                color={userBetterThanHub ? 'green' : 'yellow'}
                                variant="filled"
                              >
                                {userBetterThanHub
                                  ? `${((1 - scores.user.rmse / hubEnsemble.rmse) * 100).toFixed(1)}% better`
                                  : `${((hubEnsemble.rmse / scores.user.rmse - 1) * 100).toFixed(1)}% worse`}
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed">
                              Based on {scores.user.validCount} of {scores.user.totalHorizons} horizons with available ground truth
                            </Text>
                          </Stack>
                        </Paper>
                      ) : (
                        <Paper p="md" withBorder style={{ backgroundColor: '#f0f9ff' }}>
                          <Stack gap="xs">
                            <Text size="lg" fw={700}>
                              Your RMSE: {scores.user.rmse.toFixed(2)}
                            </Text>
                            <Text size="sm" c="dimmed">
                              Based on {scores.user.validCount} of {scores.user.totalHorizons} horizons with available ground truth
                            </Text>
                          </Stack>
                        </Paper>
                      );
                    })()}

                    {/* Full Model Ranking */}
                    {scores.models.length > 0 && (
                      <>
                        <Divider />
                        <Title order={4}>Full Model Ranking</Title>
                        <Text size="sm" c="dimmed">
                          Your forecast compared to {scores.models.length} models that submitted forecasts for this date
                        </Text>
                        <Stack gap="xs">
                          {scores.models.slice(0, 10).map((model, idx) => {
                            const isUserBetter = scores.user.rmse < model.rmse;
                            const isHubModel = model.modelName.toLowerCase().includes('hub') ||
                                             model.modelName.toLowerCase().includes('ensemble');
                            return (
                              <Paper
                                key={model.modelName}
                                p="sm"
                                withBorder
                                style={{
                                  backgroundColor: isHubModel ? '#f0f9ff' : undefined,
                                  borderColor: isHubModel ? '#1e90ff' : undefined,
                                  borderWidth: isHubModel ? 2 : 1
                                }}
                              >
                                <Group justify="space-between">
                                  <Group gap="xs">
                                    <Text size="sm" fw={500}>
                                      #{idx + 1}
                                    </Text>
                                    <Text size="sm" fw={isHubModel ? 600 : 400}>
                                      {model.modelName}
                                      {isHubModel && ' 🏆'}
                                    </Text>
                                  </Group>
                                  <Badge color={isUserBetter ? 'red' : 'green'} variant="light">
                                    RMSE: {model.rmse.toFixed(2)}
                                  </Badge>
                                </Group>
                              </Paper>
                            );
                          })}
                        </Stack>
                        {scores.models.length > 10 && (
                          <Text size="sm" c="dimmed" ta="center">
                            Showing top 10 of {scores.models.length} models
                          </Text>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <Alert color="yellow">
                    Ground truth data is not yet available for these forecast horizons.
                  </Alert>
                )}

                <Group justify="space-between">
                  <Button
                    onClick={() => setInputMode('intervals')}
                    variant="default"
                    leftSection="←"
                  >
                    Back to Intervals
                  </Button>
                </Group>
              </Stack>
            ) : (
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
                        <Stack gap="sm">
                          <Button
                            onClick={() => {
                              handleSubmit();
                              if (scenario?.fullGroundTruthSeries) {
                                setTimeout(() => setInputMode('scoring'), 100);
                              }
                            }}
                            size="md"
                            fullWidth
                            disabled={inputMode === 'scoring'}
                          >
                            {submittedPayload ? 'Resubmit & View Scores' : 'Submit & View Scores'}
                          </Button>
                          <Button
                            onClick={() => setInputMode('median')}
                            variant="default"
                            size="sm"
                            fullWidth
                            leftSection="←"
                          >
                            Back to Median
                          </Button>
                          {Object.keys(submissionErrors).length > 0 && (
                            <Alert color="red" variant="light" title="Invalid intervals" p="xs">
                              <Text size="xs">Please adjust your intervals to continue.</Text>
                            </Alert>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Grid.Col>
              </Grid>
            )}

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
