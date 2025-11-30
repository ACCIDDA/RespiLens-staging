import { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Badge, Stack, Group, Modal, Alert, Loader } from '@mantine/core';
import { IconCheck, IconLock, IconEdit, IconAlertCircle } from '@tabler/icons-react';
import { useForecastData } from '../../hooks/useForecastData';
import { ForecastChart } from '../../lib/forecast-components';
import { validateForecastIntervals } from '../../lib/forecast-components/scoring';
import { submitForecast, getParticipant } from '../../utils/tournamentAPI';
import { TOURNAMENT_CONFIG } from '../../config';

const TournamentChallengeCard = ({ challenge, participantId, isCompleted, onSubmissionComplete }) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1 = median, 2 = intervals
  const [existingSubmission, setExistingSubmission] = useState(null);

  // Forecast state (single horizon for simplicity)
  const [forecast, setForecast] = useState({
    median: 1000,
    lower50: 800,
    upper50: 1200,
    lower95: 600,
    upper95: 1400,
  });

  // Map dataset to viewType
  const getViewType = (dataset) => {
    const map = {
      'flu': 'flu_projs',
      'covid': 'covid_projs',
      'rsv': 'rsv_projs',
    };
    return map[dataset] || 'flu_projs';
  };

  // Load forecast data for the challenge
  const { data, loading: dataLoading } = useForecastData(challenge.location, getViewType(challenge.dataset));

  // Load existing submission if challenge is completed
  useEffect(() => {
    const loadExistingSubmission = async () => {
      if (isCompleted && participantId) {
        try {
          const participantData = await getParticipant(participantId);
          const submission = participantData.submissions.find(
            sub => sub.challengeNum === challenge.number
          );
          if (submission) {
            setExistingSubmission(submission);
            // Pre-fill forecast with existing submission
            setForecast({
              median: submission.median,
              lower50: submission.q25,
              upper50: submission.q75,
              lower95: submission.q025,
              upper95: submission.q975,
            });
          }
        } catch (err) {
          console.error('Failed to load existing submission:', err);
        }
      }
    };

    loadExistingSubmission();
  }, [isCompleted, participantId, challenge.number]);

  // Get ground truth data for the chart
  const groundTruthSeries = data?.ground_truth?.dates && data?.ground_truth?.[challenge.target]
    ? data.ground_truth.dates.map((date, idx) => ({
        date,
        value: data.ground_truth[challenge.target][idx],
      })).filter(entry => entry.value !== null).slice(-20) // Last 20 points
    : [];

  // Horizon dates (single week ahead)
  const getNextWeekDate = () => {
    const lastDate = groundTruthSeries.length > 0
      ? new Date(groundTruthSeries[groundTruthSeries.length - 1].date)
      : new Date();
    lastDate.setDate(lastDate.getDate() + (7 * challenge.horizon));
    return lastDate.toISOString().split('T')[0];
  };

  const horizonDates = [getNextWeekDate()];

  // Chart entries
  const entries = [{
    median: forecast.median,
    lower50: forecast.lower50,
    upper50: forecast.upper50,
    lower95: forecast.lower95,
    upper95: forecast.upper95,
  }];

  // Handle forecast adjustments
  const handleAdjust = (index, type, value) => {
    if (type === 'median') {
      setForecast(prev => ({ ...prev, median: value }));
    } else if (type === 'interval50') {
      const [lower, upper] = value;
      setForecast(prev => ({ ...prev, lower50: lower, upper50: upper }));
    } else if (type === 'interval95') {
      const [lower, upper] = value;
      setForecast(prev => ({ ...prev, lower95: lower, upper95: upper }));
    }
  };

  // Calculate max value for chart
  const maxValue = groundTruthSeries.length > 0
    ? Math.max(...groundTruthSeries.map(entry => entry.value))
    : 2000;

  // Handle submission
  const handleSubmit = async () => {
    setError(null);

    // Validate
    const validation = validateForecastIntervals({
      median: forecast.median,
      q25: forecast.lower50,
      q75: forecast.upper50,
      q025: forecast.lower95,
      q975: forecast.upper95,
    });

    if (!validation.valid) {
      setError(validation.errors.join('. '));
      return;
    }

    setSubmitting(true);

    try {
      await submitForecast(participantId, challenge.number, {
        median: forecast.median,
        q25: forecast.lower50,
        q75: forecast.upper50,
        q025: forecast.lower95,
        q975: forecast.upper95,
      });

      setModalOpened(false);
      setStep(1);
      if (onSubmissionComplete) {
        onSubmissionComplete();
      }
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      handleSubmit();
    }
  };

  const getDatasetColor = (dataset) => {
    const colors = {
      'flu': '#4c6ef5',
      'covid': '#f03e3e',
      'rsv': '#f59f00',
    };
    return colors[dataset] || '#868e96';
  };

  return (
    <>
      <Card
        shadow="sm"
        p="lg"
        radius="md"
        withBorder
        style={{
          borderLeft: `4px solid ${getDatasetColor(challenge.dataset)}`,
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onClick={() => setModalOpened(true)}
      >
        <Stack spacing="sm">
          <Group position="apart">
            <Badge color={getDatasetColor(challenge.dataset)} variant="filled">
              Challenge {challenge.number}
            </Badge>
            {isCompleted ? (
              <IconCheck size={24} color="green" />
            ) : (
              <IconLock size={20} color="#adb5bd" />
            )}
          </Group>

          <Title order={4}>{challenge.title}</Title>
          <Text size="sm" color="dimmed">{challenge.description}</Text>

          <Group spacing="xs" mt="xs">
            <Badge size="sm" variant="outline">
              {challenge.dataset.toUpperCase()}
            </Badge>
            <Badge size="sm" variant="outline">
              {challenge.location}
            </Badge>
            <Badge size="sm" variant="outline">
              {challenge.horizon} week ahead
            </Badge>
          </Group>

          {isCompleted && existingSubmission && (
            <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
              Submitted: Median = {existingSubmission.median?.toLocaleString()}
            </Alert>
          )}

          <Button
            variant={isCompleted ? 'light' : 'filled'}
            leftSection={isCompleted ? <IconEdit size={16} /> : null}
            onClick={() => setModalOpened(true)}
            fullWidth
          >
            {isCompleted ? 'Update Forecast' : 'Start Challenge'}
          </Button>
        </Stack>
      </Card>

      {/* Challenge Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setStep(1);
          setError(null);
        }}
        title={<Title order={3}>{challenge.title}</Title>}
        size="xl"
      >
        <Stack spacing="md">
          <Text color="dimmed">{challenge.description}</Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
              {error}
            </Alert>
          )}

          {/* Step indicator */}
          <Group position="center" spacing="xl">
            <div style={{ textAlign: 'center' }}>
              <Badge
                size="lg"
                variant={step === 1 ? 'filled' : 'outline'}
                color={step > 1 ? 'green' : 'blue'}
              >
                {step > 1 ? '✓' : '1'}
              </Badge>
              <Text size="xs" mt="xs">Set Median</Text>
            </div>
            <div style={{ width: 40, height: 2, backgroundColor: step > 1 ? 'green' : '#e9ecef' }} />
            <div style={{ textAlign: 'center' }}>
              <Badge
                size="lg"
                variant={step === 2 ? 'filled' : 'outline'}
                color="blue"
              >
                2
              </Badge>
              <Text size="xs" mt="xs">Set Intervals</Text>
            </div>
          </Group>

          {dataLoading ? (
            <Stack align="center" py="xl">
              <Loader />
              <Text>Loading data...</Text>
            </Stack>
          ) : (
            <ForecastChart
              groundTruthSeries={groundTruthSeries}
              horizonDates={horizonDates}
              entries={entries}
              maxValue={maxValue}
              onAdjust={handleAdjust}
              height={400}
              showIntervals={step === 2}
              interactive={true}
            />
          )}

          <div style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            <Text size="sm" weight={500}>Current Forecast:</Text>
            <Text size="sm">Median: <strong>{forecast.median}</strong></Text>
            {step === 2 && (
              <>
                <Text size="sm">50% Interval: <strong>{forecast.lower50} – {forecast.upper50}</strong></Text>
                <Text size="sm">95% Interval: <strong>{forecast.lower95} – {forecast.upper95}</strong></Text>
              </>
            )}
          </div>

          <Group position="apart">
            {step === 2 && (
              <Button variant="subtle" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <Button
                onClick={handleNext}
                loading={submitting}
              >
                {step === 1 ? 'Next: Set Intervals' : 'Submit Forecast'}
              </Button>
            </div>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default TournamentChallengeCard;
