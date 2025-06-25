import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Grid,
  ThemeIcon,
  Progress,
  Badge,
  Modal,
  Card,
  Alert,
  NumberInput,
  Select,
  Tooltip,
  ActionIcon,
  Notification
} from '@mantine/core';
import {
  IconTarget,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconQuestionMark,
  IconInfoCircle,
  IconRotateClockwise,
  IconShare,
  IconTrophy,
  IconChartLine
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

const ForecastableGame = () => {
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(6);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [targetValue, setTargetValue] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [showHowTo, { open: openHowTo, close: closeHowTo }] = useDisclosure(false);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Sample game scenario
  const gameScenario = {
    location: 'New York',
    pathogen: 'Influenza',
    metric: 'Weekly Hospitalizations',
    context: 'Based on current trends and 3 weeks of historical data, predict next week\'s hospitalization count.',
    targetDate: '2024-12-28',
    referenceData: [
      { date: '2024-12-07', value: 245, trend: 'stable' },
      { date: '2024-12-14', value: 289, trend: 'increasing' },
      { date: '2024-12-21', value: 356, trend: 'increasing' }
    ],
    targetValue: 445,
    tolerance: {
      perfect: 20,    // Within 20 = perfect
      good: 50,       // Within 50 = good  
      okay: 100,      // Within 100 = okay
      poor: 200       // Within 200 = poor
    },
    hints: [
      'Consider the acceleration pattern in recent weeks',
      'Holiday travel patterns may influence transmission',
      'Check the weekly percentage increases'
    ]
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    setGameData(gameScenario);
    setTargetValue(gameScenario.targetValue);
    setAttempts([]);
    setCurrentGuess('');
    setCurrentRound(1);
    setGameState('playing');
    setFeedback('');
  };

  const calculateScore = (guess, target, tolerance) => {
    const difference = Math.abs(guess - target);
    
    if (difference <= tolerance.perfect) return { score: 100, level: 'perfect', color: 'green' };
    if (difference <= tolerance.good) return { score: 75, level: 'good', color: 'lime' };
    if (difference <= tolerance.okay) return { score: 50, level: 'okay', color: 'yellow' };
    if (difference <= tolerance.poor) return { score: 25, level: 'poor', color: 'orange' };
    return { score: 0, level: 'miss', color: 'red' };
  };

  const submitGuess = () => {
    if (!currentGuess || currentGuess <= 0) {
      notifications.show({
        title: 'Invalid guess',
        message: 'Please enter a positive number',
        color: 'red'
      });
      return;
    }

    const guess = parseInt(currentGuess);
    const result = calculateScore(guess, targetValue, gameData.tolerance);
    const difference = guess - targetValue;
    
    let direction = '';
    if (Math.abs(difference) > gameData.tolerance.perfect) {
      direction = difference > 0 ? 'too high' : 'too low';
    }

    const attempt = {
      round: currentRound,
      guess,
      target: targetValue,
      difference,
      direction,
      ...result
    };

    setAttempts(prev => [...prev, attempt]);
    setScore(prev => prev + result.score);
    
    // Generate feedback
    if (result.level === 'perfect') {
      setFeedback('🎯 Perfect! Excellent forecasting skills!');
      setStreak(prev => prev + 1);
    } else if (result.level === 'good') {
      setFeedback(`🎉 Great job! You were ${Math.abs(difference)} off the actual value.`);
      setStreak(prev => prev + 1);
    } else if (result.level === 'okay') {
      setFeedback(`👍 Not bad! Your guess was ${direction}. Actual value: ${targetValue}`);
    } else {
      setFeedback(`📊 ${direction === 'too high' ? '📈' : '📉'} Your guess was ${direction}. Keep trying!`);
      setStreak(0);
    }

    if (currentRound >= totalRounds) {
      setGameState('won');
    } else {
      setCurrentRound(prev => prev + 1);
      // Generate new scenario for next round (simplified)
      generateNextRound();
    }

    setCurrentGuess('');
  };

  const generateNextRound = () => {
    // Simplified: just modify the target value for demo
    const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier
    const newTarget = Math.round(targetValue * variation);
    setTargetValue(newTarget);
    
    // Update reference data to maintain realism
    const newReferenceData = gameData.referenceData.map((item, index) => ({
      ...item,
      value: Math.round(item.value * variation)
    }));
    
    setGameData(prev => ({
      ...prev,
      referenceData: newReferenceData,
      targetValue: newTarget
    }));
  };

  const getStreakBadge = () => {
    if (streak >= 5) return { color: 'gold', text: '🔥 On Fire!' };
    if (streak >= 3) return { color: 'orange', text: '🌟 Hot Streak!' };
    if (streak >= 2) return { color: 'blue', text: '⚡ Good Run!' };
    return null;
  };

  const shareResults = () => {
    const averageScore = attempts.length > 0 ? Math.round(score / attempts.length) : 0;
    const text = `🎯 Forecastable ${new Date().toLocaleDateString()}\n` +
                 `Score: ${score}/${totalRounds * 100}\n` +
                 `Average: ${averageScore}/100\n` +
                 `Streak: ${streak}\n\n` +
                 attempts.map(a => {
                   const icons = { perfect: '🟢', good: '🟡', okay: '🟠', poor: '🔴', miss: '⚫' };
                   return icons[a.level];
                 }).join('') +
                 '\n\nPlay at RespiLens!';
    
    navigator.clipboard.writeText(text);
    notifications.show({
      title: 'Results copied!',
      message: 'Share your Forecastable results',
      color: 'green'
    });
  };

  const AttemptCard = ({ attempt }) => (
    <Card shadow="xs" p="sm" radius="md" withBorder>
      <Group justify="space-between">
        <Stack gap="xs">
          <Group gap="xs">
            <Text size="sm" fw={500}>Round {attempt.round}</Text>
            <Badge size="sm" color={attempt.color}>{attempt.level}</Badge>
          </Group>
          <Group gap="md">
            <Text size="xs" c="dimmed">Your guess: {attempt.guess}</Text>
            <Text size="xs" c="dimmed">Actual: {attempt.target}</Text>
            <Text size="xs" c="dimmed">Diff: {attempt.difference > 0 ? '+' : ''}{attempt.difference}</Text>
          </Group>
        </Stack>
        <Group gap="xs">
          <ThemeIcon size="sm" color={attempt.color} variant="light">
            {attempt.difference === 0 ? <IconTarget size={16} /> :
             attempt.difference > 0 ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}
          </ThemeIcon>
          <Text size="sm" fw={700}>+{attempt.score}</Text>
        </Group>
      </Group>
    </Card>
  );

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Paper shadow="sm" p="lg" mb="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="md" mb="xs">
              <ThemeIcon size="lg" variant="light">
                <IconTarget size={24} />
              </ThemeIcon>
              <div>
                <Title order={1}>Forecastable</Title>
                <Text c="dimmed">Test your forecasting skills daily</Text>
              </div>
            </Group>
          </div>
          <Group gap="xs">
            <ActionIcon variant="light" onClick={openHowTo}>
              <IconQuestionMark size={16} />
            </ActionIcon>
            <ActionIcon variant="light" onClick={initializeGame}>
              <IconRotateClockwise size={16} />
            </ActionIcon>
            {attempts.length > 0 && (
              <ActionIcon variant="light" onClick={shareResults}>
                <IconShare size={16} />
              </ActionIcon>
            )}
          </Group>
        </Group>

        <Group justify="space-between" mt="md">
          <Group gap="md">
            <Text size="sm">Round {currentRound}/{totalRounds}</Text>
            <Text size="sm">Score: {score}</Text>
            {getStreakBadge() && (
              <Badge color={getStreakBadge().color} variant="light">
                {getStreakBadge().text}
              </Badge>
            )}
          </Group>
          <Progress value={(currentRound / totalRounds) * 100} size="sm" style={{ width: 200 }} />
        </Group>
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Game Area */}
          <Paper shadow="sm" p="lg" mb="md">
            <Stack gap="md">
              <div>
                <Title order={3} mb="xs">
                  {gameData?.location} - {gameData?.pathogen}
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  {gameData?.context}
                </Text>
              </div>

              {/* Reference Data */}
              <Card withBorder p="md">
                <Title order={5} mb="md">Historical Data (Last 3 weeks)</Title>
                <Stack gap="xs">
                  {gameData?.referenceData.map((item, index) => (
                    <Group key={index} justify="space-between">
                      <Text size="sm">Week of {item.date}</Text>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>{item.value} hospitalizations</Text>
                        <ThemeIcon size="xs" color={item.trend === 'increasing' ? 'green' : 'gray'} variant="light">
                          {item.trend === 'increasing' ? <IconTrendingUp size={12} /> : <IconMinus size={12} />}
                        </ThemeIcon>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Card>

              {/* Guess Input */}
              {gameState === 'playing' && (
                <Card withBorder p="md">
                  <Title order={5} mb="md">
                    Your Forecast for Week of {gameData?.targetDate}
                  </Title>
                  <Group>
                    <NumberInput
                      placeholder="Enter your forecast"
                      value={currentGuess}
                      onChange={setCurrentGuess}
                      min={0}
                      style={{ flex: 1 }}
                      rightSection={
                        <Text size="xs" c="dimmed" pr="xs">
                          hospitalizations
                        </Text>
                      }
                    />
                    <Button onClick={submitGuess} disabled={!currentGuess}>
                      Submit Forecast
                    </Button>
                  </Group>
                  
                  {feedback && (
                    <Alert mt="md" color="blue" icon={<IconInfoCircle size={16} />}>
                      {feedback}
                    </Alert>
                  )}
                </Card>
              )}

              {/* Game Over */}
              {gameState === 'won' && (
                <Card withBorder p="md">
                  <Group justify="center">
                    <ThemeIcon size="xl" color="green" variant="light">
                      <IconTrophy size={32} />
                    </ThemeIcon>
                    <div style={{ textAlign: 'center' }}>
                      <Title order={3}>Game Complete!</Title>
                      <Text size="lg" mb="xs">Final Score: {score}/{totalRounds * 100}</Text>
                      <Text size="sm" c="dimmed">
                        Average accuracy: {Math.round(score / totalRounds)}/100
                      </Text>
                      <Group justify="center" mt="md" gap="xs">
                        <Button variant="light" onClick={shareResults}>
                          Share Results
                        </Button>
                        <Button onClick={initializeGame}>
                          Play Again
                        </Button>
                      </Group>
                    </div>
                  </Group>
                </Card>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {/* Attempts History */}
          <Paper shadow="sm" p="md">
            <Title order={4} mb="md">Your Attempts</Title>
            <Stack gap="xs">
              {attempts.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No attempts yet. Make your first forecast!
                </Text>
              ) : (
                attempts.map((attempt, index) => (
                  <AttemptCard key={index} attempt={attempt} />
                ))
              )}
            </Stack>
          </Paper>

          {/* Hints */}
          {gameData?.hints && (
            <Paper shadow="sm" p="md" mt="md">
              <Title order={5} mb="md">💡 Hints</Title>
              <Stack gap="xs">
                {gameData.hints.map((hint, index) => (
                  <Text key={index} size="sm" c="dimmed">
                    • {hint}
                  </Text>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>

      {/* How to Play Modal */}
      <Modal opened={showHowTo} onClose={closeHowTo} title="How to Play Forecastable" size="lg">
        <Stack gap="md">
          <div>
            <Title order={4} mb="xs">🎯 Objective</Title>
            <Text size="sm">
              Use historical surveillance data to forecast future values. Get as close as possible to the actual outcome!
            </Text>
          </div>

          <div>
            <Title order={4} mb="xs">📊 Scoring</Title>
            <Stack gap="xs">
              <Group gap="xs">
                <Badge color="green" size="sm">Perfect (100 pts)</Badge>
                <Text size="sm">Within ±{gameData?.tolerance.perfect}</Text>
              </Group>
              <Group gap="xs">
                <Badge color="lime" size="sm">Good (75 pts)</Badge>
                <Text size="sm">Within ±{gameData?.tolerance.good}</Text>
              </Group>
              <Group gap="xs">
                <Badge color="yellow" size="sm">Okay (50 pts)</Badge>
                <Text size="sm">Within ±{gameData?.tolerance.okay}</Text>
              </Group>
              <Group gap="xs">
                <Badge color="orange" size="sm">Poor (25 pts)</Badge>
                <Text size="sm">Within ±{gameData?.tolerance.poor}</Text>
              </Group>
              <Group gap="xs">
                <Badge color="red" size="sm">Miss (0 pts)</Badge>
                <Text size="sm">More than ±{gameData?.tolerance.poor}</Text>
              </Group>
            </Stack>
          </div>

          <div>
            <Title order={4} mb="xs">🔥 Streaks</Title>
            <Text size="sm">
              Consecutive good/perfect forecasts build your streak and unlock achievement badges!
            </Text>
          </div>

          <Alert color="blue" icon={<IconChartLine size={16} />}>
            New challenges are generated daily based on real surveillance data from multiple respiratory pathogens.
          </Alert>
        </Stack>
      </Modal>
    </Container>
  );
};

export default ForecastableGame;