import { useState, useEffect } from 'react';
import { Container, Title, Text, Grid, Card, Badge, Group, Stack, Button, Progress } from '@mantine/core';
import { IconTrophy, IconChartLine } from '@tabler/icons-react';
import { TOURNAMENT_CONFIG } from '../../config';
import { getStoredParticipantId, getStoredParticipantName, getParticipant } from '../../utils/tournamentAPI';
import TournamentRegistration from './TournamentRegistration';
import TournamentChallengeCard from './TournamentChallengeCard';
import TournamentLeaderboard from './TournamentLeaderboard';

const TournamentDashboard = () => {
  const [participantId, setParticipantId] = useState(null);
  const [participantName, setParticipantName] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load participant data on mount
  useEffect(() => {
    const loadParticipant = async () => {
      const storedId = getStoredParticipantId();
      const storedName = getStoredParticipantName();

      if (storedId) {
        setParticipantId(storedId);
        setParticipantName(storedName);

        try {
          const data = await getParticipant(storedId);
          setSubmissions(data.submissions || []);
        } catch (error) {
          console.error('Failed to load participant data:', error);
        }
      }

      setLoading(false);
    };

    loadParticipant();
  }, []);

  // Handle successful registration
  const handleRegistration = (id, name) => {
    setParticipantId(id);
    setParticipantName(name);
  };

  // Handle successful submission
  const handleSubmissionComplete = async () => {
    // Reload participant data
    if (participantId) {
      try {
        const data = await getParticipant(participantId);
        setSubmissions(data.submissions || []);
      } catch (error) {
        console.error('Failed to reload submissions:', error);
      }
    }
  };

  // Calculate progress
  const completedChallenges = submissions.length;
  const totalChallenges = TOURNAMENT_CONFIG.numChallenges;
  const progressPercent = (completedChallenges / totalChallenges) * 100;

  // Check if challenge is completed
  const isChallengeCompleted = (challengeNum) => {
    return submissions.some(sub => sub.challengeNum === challengeNum);
  };

  // Show registration if not registered
  if (!participantId && !loading) {
    return <TournamentRegistration onSuccess={handleRegistration} />;
  }

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Stack spacing="lg" mb="xl">
        <Group position="apart">
          <div>
            <Title order={1} mb="xs">
              <IconTrophy size={32} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              {TOURNAMENT_CONFIG.name}
            </Title>
            <Text color="dimmed">{TOURNAMENT_CONFIG.description}</Text>
          </div>
          <Button
            leftIcon={<IconChartLine size={18} />}
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            variant={showLeaderboard ? 'filled' : 'outline'}
          >
            {showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}
          </Button>
        </Group>

        {/* Progress */}
        {participantName && (
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group position="apart" mb="md">
              <div>
                <Text weight={500} size="lg">Welcome, {participantName}!</Text>
                <Text size="sm" color="dimmed">
                  Progress: {completedChallenges}/{totalChallenges} challenges completed
                </Text>
              </div>
              <Group spacing={4}>
                {Array.from({ length: totalChallenges }, (_, i) => i + 1).map((num) => (
                  <div
                    key={num}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: isChallengeCompleted(num) ? '#228be6' : '#e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isChallengeCompleted(num) ? 'white' : '#adb5bd',
                      fontWeight: 500,
                      fontSize: 14,
                    }}
                  >
                    {num}
                  </div>
                ))}
              </Group>
            </Group>
            <Progress value={progressPercent} size="lg" radius="xl" />
          </Card>
        )}
      </Stack>

      {/* Leaderboard (conditionally shown) */}
      {showLeaderboard && (
        <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
          <TournamentLeaderboard participantId={participantId} />
        </Card>
      )}

      {/* Challenges Grid */}
      <Title order={2} mb="md">Challenges</Title>
      <Grid>
        {TOURNAMENT_CONFIG.challenges.map((challenge) => (
          <Grid.Col key={challenge.id} span={12} md={6}>
            <TournamentChallengeCard
              challenge={challenge}
              participantId={participantId}
              isCompleted={isChallengeCompleted(challenge.number)}
              onSubmissionComplete={handleSubmissionComplete}
            />
          </Grid.Col>
        ))}
      </Grid>

      {/* Completion message */}
      {completedChallenges === totalChallenges && (
        <Card shadow="lg" p="xl" radius="md" mt="xl" style={{ backgroundColor: '#e7f5ff', borderColor: '#228be6' }} withBorder>
          <Group position="center">
            <IconTrophy size={48} color="#228be6" />
            <div>
              <Text size="xl" weight={700} color="#228be6">
                Congratulations! You've completed all challenges!
              </Text>
              <Text size="md" color="dimmed">
                Check the leaderboard to see your ranking among all participants.
              </Text>
            </div>
          </Group>
        </Card>
      )}
    </Container>
  );
};

export default TournamentDashboard;
