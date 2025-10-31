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
  Stack,
  Stepper,
  Switch,
  Text,
  ThemeIcon,
  Title,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconTarget, IconCheck, IconTrophy, IconCopy, IconCheck as IconCheckCircle, IconChartBar, IconRefresh } from '@tabler/icons-react';
import { useForecastleScenario } from '../../hooks/useForecastleScenario';
import { initialiseForecastInputs, convertToIntervals } from '../../utils/forecastleInputs';
import { validateForecastSubmission } from '../../utils/forecastleValidation';
import {
  extractGroundTruthForHorizons,
  scoreUserForecast,
  scoreModels,
  getOfficialModels,
} from '../../utils/forecastleScoring';
import { saveForecastleGame, getForecastleGame } from '../../utils/respilensStorage';
import ForecastleChartCanvas from './ForecastleChartCanvas';
import ForecastleInputControls from './ForecastleInputControls';
import ForecastleStatsModal from './ForecastleStatsModal';

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

  // Unlimited mode (hidden, for testing storage)
  const [unlimitedMode, setUnlimitedMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('unlimited') === 'true';
  });

  useEffect(() => {
    if (queryString.length > 0) {
      setSearchParams({}, { replace: true });
    }
  }, [queryString, setSearchParams]);

  // Keyboard shortcut to toggle unlimited mode (Ctrl+Shift+U)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'U') {
        event.preventDefault();
        setUnlimitedMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { scenarios, loading, error } = useForecastleScenario();
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState(new Set()); // Track which challenges are completed

  const scenario = scenarios[currentChallengeIndex] || null;
  const isCurrentChallengeCompleted = completedChallenges.has(currentChallengeIndex);
  const allChallengesCompleted = scenarios.length > 0 && completedChallenges.size === scenarios.length;

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
  const [visibleRankings, setVisibleRankings] = useState(0); // For animated reveal
  const [copied, setCopied] = useState(false); // For copy button feedback
  const [statsModalOpened, setStatsModalOpened] = useState(false); // For stats modal
  const [saveError, setSaveError] = useState(null); // For storage save errors

  // Check which challenges are already completed
  useEffect(() => {
    if (!scenarios || scenarios.length === 0) return;

    const completed = new Set();
    scenarios.forEach((s, index) => {
      const id = `${s.challengeDate}_${s.dataset.key}_${s.location.abbreviation}_${s.dataset.targetKey}`;
      const existingGame = getForecastleGame(id);
      if (existingGame) {
        completed.add(index);
      }
    });
    setCompletedChallenges(completed);
  }, [scenarios]);

  useEffect(() => {
    setForecastEntries(initialiseForecastInputs(scenario?.horizons || [], latestObservationValue));
    setSubmissionErrors({});
    setSubmittedPayload(null);
    setScores(null);
    setInputMode('median');
    setVisibleRankings(0);

    // If this challenge is already completed, load the saved data and show scoring
    if (isCurrentChallengeCompleted && scenario && !unlimitedMode) {
      const id = `${scenario.challengeDate}_${scenario.dataset.key}_${scenario.location.abbreviation}_${scenario.dataset.targetKey}`;
      const savedGame = getForecastleGame(id);

      if (savedGame && scenario.fullGroundTruthSeries) {
        // Restore the saved forecasts
        setForecastEntries(savedGame.userForecasts);

        // Recalculate scores
        const horizonDates = scenario.horizons.map((horizon) =>
          addWeeksToDate(scenario.forecastDate, horizon)
        );
        const groundTruthValues = extractGroundTruthForHorizons(
          scenario.fullGroundTruthSeries,
          horizonDates
        );

        const userScore = scoreUserForecast(savedGame.userForecasts, groundTruthValues);

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

        // Show scoring immediately
        setInputMode('scoring');
      }
    }
  }, [scenario?.horizons, latestObservationValue, isCurrentChallengeCompleted, scenario, unlimitedMode]);

  // Animated reveal of leaderboard when entering scoring mode
  useEffect(() => {
    if (inputMode === 'scoring' && scores) {
      setVisibleRankings(0);
      const totalEntries = scores.models.length + 1; // models + user
      const interval = setInterval(() => {
        setVisibleRankings(prev => {
          if (prev >= totalEntries) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 150); // Reveal one every 150ms
      return () => clearInterval(interval);
    }
  }, [inputMode, scores]);

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
      const userScore = scoreUserForecast(forecastEntries, groundTruthValues);

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

      // Calculate ranking information
      const { ensemble: ensembleKey, baseline: baselineKey } = getOfficialModels(scenario.dataset.key);

      // Find ensemble and baseline in the model scores
      const ensembleScore = modelScores.find(m => m.modelName === ensembleKey);
      const baselineScore = modelScores.find(m => m.modelName === baselineKey);

      // Create unified ranking list
      const allRanked = [
        { name: 'user', wis: userScore.wis, isUser: true },
        ...modelScores.map(m => ({ name: m.modelName, wis: m.wis, isUser: false }))
      ].sort((a, b) => a.wis - b.wis);

      const userRank = allRanked.findIndex(e => e.isUser) + 1;
      const ensembleRank = ensembleScore ? allRanked.findIndex(e => e.name === ensembleKey) + 1 : null;
      const baselineRank = baselineScore ? allRanked.findIndex(e => e.name === baselineKey) + 1 : null;
      const totalModels = modelScores.length;

      // Save game to storage
      try {
        saveForecastleGame({
          challengeDate: scenario.challengeDate,
          dataset: scenario.dataset.key,
          location: scenario.location.abbreviation,
          target: scenario.dataset.targetKey,
          userForecasts: forecastEntries,
          groundTruth: groundTruthValues,
          horizonDates,
          // Ranking information
          userRank,
          totalModels,
          ensembleRank,
          baselineRank,
          // Ensemble scores
          ensembleWIS: ensembleScore?.wis || null,
          ensembleDispersion: ensembleScore?.dispersion || null,
          ensembleUnderprediction: ensembleScore?.underprediction || null,
          ensembleOverprediction: ensembleScore?.overprediction || null,
          // Baseline scores
          baselineWIS: baselineScore?.wis || null,
          baselineDispersion: baselineScore?.dispersion || null,
          baselineUnderprediction: baselineScore?.underprediction || null,
          baselineOverprediction: baselineScore?.overprediction || null,
        });
        setSaveError(null);
        // Mark this challenge as completed
        setCompletedChallenges(prev => new Set([...prev, currentChallengeIndex]));
      } catch (error) {
        console.error('Failed to save game:', error);
        setSaveError(error.message || 'Failed to save game to storage');
      }
    }
  };

  const handleNextChallenge = () => {
    if (currentChallengeIndex < scenarios.length - 1) {
      setCurrentChallengeIndex(prev => prev + 1);
      setInputMode('median');
      setSubmittedPayload(null);
      setScores(null);
      setSubmissionErrors({});
      setSaveError(null);
      setCopied(false);
      setVisibleRankings(0);
    }
  };

  const handleResetMedians = () => {
    setForecastEntries(initialiseForecastInputs(scenario?.horizons || [], latestObservationValue));
    setSubmissionErrors({});
  };

  const handleResetIntervals = () => {
    const resetEntries = forecastEntries.map(entry => {
      const median = entry.median;
      // Reset to default symmetric intervals
      return {
        ...entry,
        lower95: Math.max(0, median - median * 0.2),
        upper95: median + median * 0.2,
        lower50: Math.max(0, median - median * 0.1),
        upper50: median + median * 0.1,
        width95: median * 0.2,
        width50: median * 0.1,
      };
    });
    setForecastEntries(resetEntries);
    setSubmissionErrors({});
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

    // const latestObservation =
      // scenario.groundTruthSeries[scenario.groundTruthSeries.length - 1] ?? null; // remove unused var!!
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

          const nextEntry = { ...entry };

          if (field === 'median') {
            const oldMedian = entry.median;
            const newMedian = Math.max(0, value);
            const medianShift = newMedian - oldMedian;

            nextEntry.median = newMedian;

            // Shift intervals to maintain their widths relative to new median
            if (entry.lower95 !== undefined && entry.upper95 !== undefined) {
              nextEntry.lower95 = Math.max(0, entry.lower95 + medianShift);
              nextEntry.upper95 = entry.upper95 + medianShift;
            }
            if (entry.lower50 !== undefined && entry.upper50 !== undefined) {
              nextEntry.lower50 = Math.max(0, entry.lower50 + medianShift);
              nextEntry.upper50 = entry.upper50 + medianShift;
            }
          } else if (field === 'interval95') {
            // Handle two-point interval adjustment
            const [lower, upper] = value;
            nextEntry.lower95 = Math.max(0, lower);
            nextEntry.upper95 = Math.max(lower, upper);
            // Ensure 50% interval stays within 95% bounds
            if (nextEntry.lower50 < nextEntry.lower95) nextEntry.lower50 = nextEntry.lower95;
            if (nextEntry.upper50 > nextEntry.upper95) nextEntry.upper50 = nextEntry.upper95;
            // Update widths for backward compatibility
            nextEntry.width95 = Math.max(nextEntry.upper95 - entry.median, entry.median - nextEntry.lower95);
          } else if (field === 'interval50') {
            // Handle two-point interval adjustment
            const [lower, upper] = value;
            nextEntry.lower50 = Math.max(nextEntry.lower95 || 0, lower);
            nextEntry.upper50 = Math.min(nextEntry.upper95 || 99999, Math.max(lower, upper));
            // Update widths for backward compatibility
            nextEntry.width50 = Math.max(nextEntry.upper50 - entry.median, entry.median - nextEntry.lower50);
          } else {
            // Legacy field support
            nextEntry[field] = Math.max(0, value);
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
            <Group justify="space-between" wrap="wrap" align="center">
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
              <Group gap="sm">
                {/* Challenge Progress Indicators - moved here */}
                {scenarios.length > 1 && (
                  <Group gap="xs">
                    {scenarios.map((_, index) => (
                      <Tooltip
                        key={index}
                        label={`Challenge ${index + 1}${completedChallenges.has(index) ? ' (Completed)' : ''}`}
                      >
                        <ThemeIcon
                          size={32}
                          radius="xl"
                          variant={completedChallenges.has(index) ? "filled" : index === currentChallengeIndex ? "light" : "outline"}
                          color={completedChallenges.has(index) ? "green" : index === currentChallengeIndex ? "cyan" : "gray"}
                          style={{
                            cursor: 'pointer',
                            border: index === currentChallengeIndex && !completedChallenges.has(index) ? '2px solid' : undefined,
                          }}
                          onClick={() => {
                            setCurrentChallengeIndex(index);
                            setInputMode('median');
                            setSubmittedPayload(null);
                            setScores(null);
                            setSubmissionErrors({});
                            setSaveError(null);
                            setCopied(false);
                            setVisibleRankings(0);
                          }}
                        >
                          {completedChallenges.has(index) ? (
                            <IconCheck size={16} />
                          ) : (
                            <Text size="xs" fw={700}>{index + 1}</Text>
                          )}
                        </ThemeIcon>
                      </Tooltip>
                    ))}
                  </Group>
                )}
                <Tooltip label="View your statistics">
                  <Button
                    leftSection={<IconChartBar size={16} />}
                    variant="light"
                    size="sm"
                    onClick={() => setStatsModalOpened(true)}
                  >
                    Stats
                  </Button>
                </Tooltip>
              </Group>
            </Group>

            {unlimitedMode && (
              <Alert color="blue" variant="light" title="Unlimited Mode Active">
                <Text size="xs">
                  Unlimited mode is active. Press Ctrl+Shift+U to toggle off.
                </Text>
              </Alert>
            )}

            {/* All Challenges Complete Message */}
            {allChallengesCompleted && !unlimitedMode && (
              <Alert color="green" variant="light" title="All Challenges Complete! 🎉">
                <Text size="sm">
                  You've completed all {scenarios.length} challenges for today. Come back tomorrow for new challenges!
                </Text>
              </Alert>
            )}

            {/* Instructional Text */}
            {scenarios.length > 0 && !(allChallengesCompleted && !unlimitedMode) && (
              <Box>
                <Text size="sm" c="dimmed" mb="xs">
                  Make predictions on one to three challenges everyday. Each challenge statistic and aggregate are stored.
                </Text>
                <Group gap="xs" wrap="wrap">
                  <Text size="sm" fw={500}>
                    Problem {currentChallengeIndex + 1}/{scenarios.length}:
                  </Text>
                  <Text size="sm" fw={400}>
                    Predict
                  </Text>
                  <Badge size="md" variant="filled" color="blue" radius="sm">
                    {scenario?.dataset?.label || 'hospitalization'}
                  </Badge>
                  <Text size="sm" fw={400}>
                    in
                  </Text>
                  <Badge size="md" variant="filled" color="grape" radius="sm">
                    {scenario?.location?.name} ({scenario?.location?.abbreviation})
                  </Badge>
                  <Text size="sm" fw={400}>
                    at
                  </Text>
                  <Badge size="md" variant="filled" color="teal" radius="sm">
                    {scenario?.forecastDate}
                  </Badge>
                </Group>
              </Box>
            )}

            <Divider />

            <Group justify="space-between" align="center" wrap="wrap">
              <Stepper
                active={inputMode === 'median' ? 0 : inputMode === 'intervals' ? 1 : 2}
                onStepClick={(step) => {
                  if (step === 0) setInputMode('median');
                  else if (step === 1) setInputMode('intervals');
                  else if (step === 2 && scores) setInputMode('scoring');
                }}
                allowNextStepsSelect={false}
                size="sm"
                style={{ flex: 1 }}
              >
                <Stepper.Step
                  label="Median"
                  description="Point forecasts"
                  completedIcon={<IconCheck size={16} />}
                />
                <Stepper.Step
                  label="Intervals"
                  description="Uncertainty"
                  completedIcon={<IconCheck size={16} />}
                />
                <Stepper.Step
                  label="Scores"
                  description="Results"
                  completedIcon={<IconTrophy size={16} />}
                />
              </Stepper>

            </Group>

            {inputMode === 'scoring' && scores ? (
              <Stack gap="lg">
                {saveError && (
                  <Alert icon={<IconAlertTriangle size={16} />} color="yellow" onClose={() => setSaveError(null)} withCloseButton>
                    {saveError}
                  </Alert>
                )}
                {scores.user.wis !== null ? (
                  <>
                    <Text size="sm" c="dimmed">
                      Based on {scores.user.validCount} of {scores.user.totalHorizons} horizons with available ground truth
                    </Text>

                    <Grid gutter="lg">
                      {/* Left Panel - Leaderboard */}
                      <Grid.Col span={{ base: 12, lg: 5 }}>
                        <Stack gap="md">
                          <Title order={4}>Leaderboard</Title>

                          <Stack gap="xs">
                            {(() => {
                              // Get official ensemble model for this dataset
                              const { ensemble: ensembleKey } = getOfficialModels(scenario.dataset.key);

                              // Create unified leaderboard with user and models
                              const allEntries = [
                                {
                                  name: 'You',
                                  wis: scores.user.wis,
                                  isUser: true,
                                },
                                ...scores.models.map(m => ({
                                  name: m.modelName,
                                  wis: m.wis,
                                  isUser: false,
                                  isHub: m.modelName === ensembleKey,
                                }))
                              ].sort((a, b) => a.wis - b.wis);

                              const userRank = allEntries.findIndex(e => e.isUser) + 1;
                              const totalEntries = allEntries.length;

                              return (
                                <>
                                  {allEntries.slice(0, 15).map((entry, idx) => {
                                    if (idx >= visibleRankings) return null;

                                    return (
                                      <Paper
                                        key={entry.name}
                                        p="md"
                                        withBorder
                                        style={{
                                          backgroundColor: entry.isUser
                                            ? '#ffe0e6'
                                            : entry.isHub
                                            ? '#e8f5e9'
                                            : undefined,
                                          borderColor: entry.isUser
                                            ? '#dc143c'
                                            : entry.isHub
                                            ? '#228b22'
                                            : undefined,
                                          borderWidth: entry.isUser || entry.isHub ? 2 : 1,
                                          transform: `translateY(${visibleRankings > idx ? 0 : 20}px)`,
                                          opacity: visibleRankings > idx ? 1 : 0,
                                          transition: 'all 0.3s ease-out',
                                        }}
                                      >
                                        <Group justify="space-between" align="center">
                                          <Group gap="md">
                                            <Text size="xl" fw={700} c={idx === 0 ? 'yellow.7' : idx === 1 ? 'gray.5' : idx === 2 ? 'orange.7' : undefined}>
                                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                            </Text>
                                            <div>
                                              <Text size="sm" fw={entry.isUser || entry.isHub ? 700 : 500}>
                                                {entry.name}
                                                {entry.isUser && ' 👤'}
                                                {entry.isHub && ' 🏆'}
                                              </Text>
                                              {entry.isUser && (
                                                <Text size="xs" c="dimmed">
                                                  Rank {userRank} of {totalEntries}
                                                </Text>
                                              )}
                                            </div>
                                          </Group>
                                          <Badge
                                            size="lg"
                                            color={entry.isUser ? 'red' : entry.isHub ? 'green' : 'gray'}
                                            variant={entry.isUser || entry.isHub ? 'filled' : 'light'}
                                          >
                                            WIS: {entry.wis.toFixed(2)}
                                          </Badge>
                                        </Group>
                                      </Paper>
                                    );
                                  })}
                                  {allEntries.length > 15 && (
                                    <Text size="sm" c="dimmed" ta="center">
                                      Showing top 15 of {allEntries.length} entries
                                    </Text>
                                  )}
                                </>
                              );
                            })()}
                          </Stack>
                        </Stack>
                      </Grid.Col>

                      {/* Right Panel - Visualization Chart */}
                      <Grid.Col span={{ base: 12, lg: 7 }}>
                        <Stack gap="md">
                          <Group justify="space-between">
                            <Title order={4}>Results Comparison</Title>
                            <Switch
                              label="Show Full History"
                              checked={!zoomedView}
                              onChange={(event) => setZoomedView(!event.currentTarget.checked)}
                              color="red"
                              size="md"
                            />
                          </Group>

                          {/* Shareable Ranking Summary Card */}
                          {(() => {
                            // Get official ensemble model for this dataset
                            const { ensemble: ensembleKey } = getOfficialModels(scenario.dataset.key);

                            const allEntries = [
                              { name: 'You', wis: scores.user.wis, isUser: true },
                              ...scores.models.map(m => ({
                                name: m.modelName,
                                wis: m.wis,
                                isUser: false,
                                isHub: m.modelName === ensembleKey,
                              }))
                            ].sort((a, b) => a.wis - b.wis);

                            const userRank = allEntries.findIndex(e => e.isUser) + 1;
                            const totalModels = scores.models.length;
                            const hubEntry = allEntries.find(e => e.isHub);
                            const hubRank = hubEntry ? allEntries.findIndex(e => e.isHub) + 1 : null;

                            let comparisonText = '';
                            let emojiIndicator = '';
                            if (hubRank !== null) {
                              const spotsDiff = Math.abs(userRank - hubRank);
                              if (userRank < hubRank) {
                                comparisonText = `${spotsDiff} spot${spotsDiff !== 1 ? 's' : ''} above the ensemble`;
                                emojiIndicator = '🟢';
                              } else if (userRank > hubRank) {
                                comparisonText = `${spotsDiff} spot${spotsDiff !== 1 ? 's' : ''} below the ensemble`;
                                emojiIndicator = '🔴';
                              } else {
                                comparisonText = 'tied with the ensemble';
                                emojiIndicator = '🟡';
                              }
                            }

                            // Generate wordle-style emoji summary
                            const generateEmojiSummary = () => {
                              const topN = 15;
                              const displayEntries = allEntries.slice(0, topN);
                              const emojis = displayEntries.map(entry => {
                                if (entry.isUser) return '🟩'; // User in green
                                if (entry.isHub) return '🟦'; // Hub in blue
                                return '⬜'; // Other models in gray
                              });

                              // Simplify dataset label for copy
                              let datasetLabel = scenario.dataset.label;
                              if (datasetLabel.includes('(') && datasetLabel.includes(')')) {
                                // Extract text within parentheses
                                const match = datasetLabel.match(/\(([^)]+)\)/);
                                if (match) {
                                  datasetLabel = match[1];
                                }
                              }

                              return `Forecastle ${scenario.challengeDate}\n${emojis.join('')}\nRank #${userRank}/${totalModels} • WIS: ${scores.user.wis.toFixed(2)}\n${comparisonText}\n${datasetLabel} • ${scenario.location.abbreviation}`;
                            };

                            const handleCopy = async () => {
                              const textToCopy = generateEmojiSummary();
                              try {
                                await navigator.clipboard.writeText(textToCopy);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              } catch (err) {
                                console.error('Failed to copy:', err);
                              }
                            };

                            return (
                              <Paper
                                p="md"
                                withBorder
                                shadow="md"
                                style={{
                                  background: 'linear-gradient(135deg, #f9d77e 0%, #f5c842 25%, #e6b800 50%, #f5c842 75%, #f9d77e 100%)',
                                  borderWidth: 2,
                                  borderColor: '#d4af37',
                                  position: 'relative',
                                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                                  backdropFilter: 'blur(10px)',
                                }}
                              >
                                <Stack gap="xs">
                                  <Group justify="space-between" align="flex-start">
                                    <div style={{ flex: 1 }}>
                                      <Text
                                        size="lg"
                                        fw={700}
                                        ta="center"
                                        style={{
                                          color: '#1a1a1a',
                                          textShadow: '0 1px 2px rgba(255, 255, 255, 0.8), 0 -1px 1px rgba(0, 0, 0, 0.3)',
                                        }}
                                      >
                                        {emojiIndicator} You ranked #{userRank} across {totalModels} models
                                      </Text>
                                    </div>
                                    <Tooltip label={copied ? "Copied!" : "Copy results"} position="left">
                                      <ActionIcon
                                        variant="filled"
                                        color={copied ? "teal" : "yellow"}
                                        size="lg"
                                        onClick={handleCopy}
                                        style={{ flexShrink: 0 }}
                                      >
                                        {copied ? <IconCheckCircle size={18} /> : <IconCopy size={18} />}
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                  {comparisonText && (
                                    <Text
                                      size="md"
                                      fw={600}
                                      ta="center"
                                      style={{
                                        color: '#2d2d2d',
                                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.7), 0 -1px 1px rgba(0, 0, 0, 0.2)',
                                      }}
                                    >
                                      {comparisonText}
                                    </Text>
                                  )}
                                  <Text
                                    size="xs"
                                    fw={600}
                                    ta="center"
                                    style={{
                                      color: '#3d3d3d',
                                      textShadow: '0 1px 1px rgba(255, 255, 255, 0.6)',
                                    }}
                                  >
                                    WIS: {scores.user.wis.toFixed(2)} • {scenario.dataset.label} • {scenario.location.abbreviation}
                                  </Text>
                                </Stack>
                              </Paper>
                            );
                          })()}

                          <Box style={{ width: '100%', height: 500 }}>
                            <ForecastleChartCanvas
                              groundTruthSeries={scenario.groundTruthSeries}
                              horizonDates={horizonDates}
                              entries={forecastEntries}
                              maxValue={yAxisMax}
                              onAdjust={() => {}} // Read-only
                              height={500}
                              showIntervals={false}
                              zoomedView={zoomedView}
                              scores={scores}
                              showScoring={true}
                              fullGroundTruthSeries={scenario.fullGroundTruthSeries}
                              modelForecasts={scenario.modelForecasts || {}}
                              horizons={scenario.horizons}
                            />
                          </Box>
                        </Stack>
                      </Grid.Col>
                    </Grid>
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
                  {currentChallengeIndex < scenarios.length - 1 && (
                    <Button
                      onClick={handleNextChallenge}
                      variant="filled"
                      rightSection="→"
                      color="green"
                    >
                      Continue {currentChallengeIndex + 1}/{scenarios.length}
                    </Button>
                  )}
                  {currentChallengeIndex === scenarios.length - 1 && (
                    <Badge size="xl" variant="filled" color="green">
                      All Challenges Complete! 🎉
                    </Badge>
                  )}
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
                        onAdjust={isCurrentChallengeCompleted && !unlimitedMode ? () => {} : handleMedianAdjust}
                        height={380}
                        showIntervals={inputMode === 'intervals'}
                        zoomedView={zoomedView}
                      />
                    </Box>
                    {!isCurrentChallengeCompleted && (
                      <Text size="sm" c="dimmed">
                        {inputMode === 'median'
                          ? 'Drag the crimson handles to set your median forecast for each week ahead.'
                          : 'Drag the crimson handles to adjust interval bounds, or use the sliders for precise control.'}
                      </Text>
                    )}
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
                      disabled={isCurrentChallengeCompleted && !unlimitedMode}
                    />
                    <Box mt="auto">
                      {isCurrentChallengeCompleted && !unlimitedMode ? (
                        // Show navigation for completed challenges
                        <Stack gap="sm">
                          {currentChallengeIndex < scenarios.length - 1 ? (
                            <Button
                              onClick={handleNextChallenge}
                              size="md"
                              fullWidth
                              rightSection="→"
                              color="green"
                            >
                              Next Challenge ({currentChallengeIndex + 2}/{scenarios.length})
                            </Button>
                          ) : (
                            <Badge size="xl" variant="filled" color="green" style={{ width: '100%', padding: '12px' }}>
                              All Challenges Complete! 🎉
                            </Badge>
                          )}
                        </Stack>
                      ) : inputMode === 'median' ? (
                        <Stack gap="sm">
                          <Button
                            onClick={handleResetMedians}
                            variant="light"
                            size="sm"
                            fullWidth
                            color="gray"
                            leftSection={<IconRefresh size={16} />}
                          >
                            Reset to Default
                          </Button>
                          <Button
                            onClick={() => setInputMode('intervals')}
                            size="md"
                            fullWidth
                            rightSection="→"
                          >
                            Next: Set Uncertainty Intervals
                          </Button>
                        </Stack>
                      ) : (
                        <Stack gap="sm">
                          <Button
                            onClick={handleResetIntervals}
                            variant="light"
                            size="sm"
                            fullWidth
                            color="gray"
                            leftSection={<IconRefresh size={16} />}
                          >
                            Reset to Default
                          </Button>
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
      <ForecastleStatsModal
        opened={statsModalOpened}
        onClose={() => setStatsModalOpened(false)}
      />
    </Container>
  );
};

export default ForecastleGame;
