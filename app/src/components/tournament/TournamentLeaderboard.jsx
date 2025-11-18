import { useState, useEffect } from 'react';
import { Table, Text, Badge, Stack, Title, Alert, Loader } from '@mantine/core';
import { IconTrophy, IconAlertCircle } from '@tabler/icons-react';
import { getLeaderboard } from '../../utils/tournamentAPI';
import { TOURNAMENT_CONFIG } from '../../config';

const TournamentLeaderboard = ({ participantId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load leaderboard on mount and poll for updates
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await getLeaderboard();
        setLeaderboard(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    loadLeaderboard();

    // Poll for updates
    const interval = setInterval(loadLeaderboard, TOURNAMENT_CONFIG.leaderboard.updateFrequency);

    return () => clearInterval(interval);
  }, []);

  const getMedalEmoji = (rank) => {
    return TOURNAMENT_CONFIG.ui.medals[rank] || '';
  };

  if (loading) {
    return (
      <Stack align="center" spacing="md">
        <Loader />
        <Text>Loading leaderboard...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error}
      </Alert>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Stack align="center" spacing="md" py="xl">
        <IconTrophy size={48} color="gray" />
        <Text color="dimmed" size="lg">
          No participants have completed all challenges yet.
        </Text>
        <Text color="dimmed" size="sm">
          Be the first to complete all 5 challenges and claim the top spot!
        </Text>
      </Stack>
    );
  }

  return (
    <Stack spacing="md">
      <Title order={3}>
        <IconTrophy size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Leaderboard
      </Title>

      <Text size="sm" color="dimmed">
        Only showing participants who completed all {TOURNAMENT_CONFIG.numChallenges} challenges
      </Text>

      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th style={{ width: 80 }}>Rank</th>
            <th>Participant</th>
            <th style={{ textAlign: 'right' }}>Avg WIS</th>
            <th style={{ textAlign: 'right' }}>Total WIS</th>
            <th style={{ textAlign: 'center' }}>Challenges</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.participantId === participantId;
            const medal = getMedalEmoji(rank);

            return (
              <tr
                key={entry.participantId}
                style={{
                  backgroundColor: isCurrentUser ? '#e7f5ff' : undefined,
                  fontWeight: isCurrentUser ? 600 : undefined,
                }}
              >
                <td>
                  <Text weight={isCurrentUser ? 700 : 500}>
                    {medal && <span style={{ marginRight: 8 }}>{medal}</span>}
                    {rank}
                  </Text>
                </td>
                <td>
                  <Text weight={isCurrentUser ? 700 : 400}>
                    {entry.firstName} {entry.lastName}
                    {isCurrentUser && (
                      <Badge ml="xs" size="sm" color="blue">
                        You
                      </Badge>
                    )}
                  </Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text>{entry.avgWIS?.toFixed(1) ?? '—'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text>{entry.totalWIS?.toFixed(1) ?? '—'}</Text>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Badge color={entry.completed === TOURNAMENT_CONFIG.numChallenges ? 'green' : 'gray'}>
                    {entry.completed}/{TOURNAMENT_CONFIG.numChallenges}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Text size="xs" color="dimmed" style={{ textAlign: 'center' }}>
        Leaderboard updates every 30 seconds
      </Text>
    </Stack>
  );
};

export default TournamentLeaderboard;
