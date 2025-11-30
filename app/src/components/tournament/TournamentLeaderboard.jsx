import { useState, useEffect } from 'react';
import { Table, Text, Badge, Stack, Title, Alert, Loader } from '@mantine/core';
import { IconTrophy, IconAlertCircle } from '@tabler/icons-react';
import { getLeaderboard } from '../../utils/tournamentAPI';
import { TOURNAMENT_CONFIG } from '../../config';
import { scoreUserForecast } from '../../utils/forecastleScoring';

const addWeeksToDate = (dateString, weeks) => {
  const base = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return dateString;
  }
  base.setUTCDate(base.getUTCDate() + weeks * 7);
  return base.toISOString().slice(0, 10);
};

const TournamentLeaderboard = ({ participantId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groundTruthData, setGroundTruthData] = useState({});

  // Load ground truth data for all challenges
  useEffect(() => {
    const loadGroundTruth = async () => {
      const gtData = {};

      for (const challenge of TOURNAMENT_CONFIG.challenges) {
        try {
          const filePath = `/processed_data/${challenge.dataPath}/${challenge.location}_${challenge.fileSuffix}`;
          const response = await fetch(filePath);
          if (!response.ok) continue;

          const locationData = await response.json();
          const groundTruthDates = locationData.ground_truth?.dates || [];
          const groundTruthValues = locationData.ground_truth?.[challenge.target] || [];

          // Extract ground truth for each horizon
          const horizonDates = challenge.horizons.map((horizon) =>
            addWeeksToDate(challenge.forecastDate, horizon)
          );

          const groundTruthForHorizons = horizonDates.map((horizonDate) => {
            const index = groundTruthDates.indexOf(horizonDate);
            if (index >= 0 && Number.isFinite(groundTruthValues[index])) {
              return groundTruthValues[index];
            }
            return null;
          });

          gtData[challenge.number] = groundTruthForHorizons;
        } catch (error) {
          console.error(`Failed to load ground truth for challenge ${challenge.number}:`, error);
        }
      }

      setGroundTruthData(gtData);
    };

    loadGroundTruth();
  }, []);

  // Load leaderboard and calculate scores
  useEffect(() => {
    const loadAndScoreLeaderboard = async () => {
      try {
        const data = await getLeaderboard();

        // Calculate WIS for each participant
        const scoredLeaderboard = data.map(participant => {
          const challengeScores = {};
          let totalWIS = 0;
          let validChallenges = 0;

          // Score each challenge
          Object.entries(participant.submissions || {}).forEach(([challengeNum, forecasts]) => {
            const challengeNumber = parseInt(challengeNum);
            const groundTruth = groundTruthData[challengeNumber];

            if (!groundTruth || forecasts.length === 0) return;

            // Convert forecasts to the format expected by scoreUserForecast
            const forecastEntries = forecasts.map(f => ({
              horizon: f.horizon,
              median: f.median,
              lower50: f.q25,
              upper50: f.q75,
              lower95: f.q025,
              upper95: f.q975,
            }));

            // Calculate WIS
            const scoreResult = scoreUserForecast(forecastEntries, groundTruth);
            if (scoreResult.wis !== null) {
              challengeScores[challengeNumber] = scoreResult.wis;
              totalWIS += scoreResult.wis;
              validChallenges++;
            }
          });

          const avgWIS = validChallenges > 0 ? totalWIS / validChallenges : null;

          return {
            ...participant,
            totalWIS,
            avgWIS,
            validChallenges,
            challengeScores,
          };
        });

        // Filter to only show participants who completed all challenges
        const completed = scoredLeaderboard.filter(p => p.completed === TOURNAMENT_CONFIG.numChallenges);

        // Sort by avgWIS (lower is better)
        completed.sort((a, b) => {
          if (a.avgWIS === null) return 1;
          if (b.avgWIS === null) return -1;
          return a.avgWIS - b.avgWIS;
        });

        setLeaderboard(completed);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    // Only load leaderboard after ground truth is loaded
    if (Object.keys(groundTruthData).length > 0) {
      loadAndScoreLeaderboard();

      // Poll for updates
      const interval = setInterval(loadAndScoreLeaderboard, TOURNAMENT_CONFIG.leaderboard.updateFrequency);
      return () => clearInterval(interval);
    }
  }, [groundTruthData]);

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
          Be the first to complete all {TOURNAMENT_CONFIG.numChallenges} challenges and claim the top spot!
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
        <br />
        Ranked by average WIS (lower is better)
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
                    {entry.name}
                    {isCurrentUser && (
                      <Badge ml="xs" size="sm" color="blue">
                        You
                      </Badge>
                    )}
                  </Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text>{entry.avgWIS !== null ? entry.avgWIS.toFixed(1) : '—'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text>{entry.totalWIS !== null ? entry.totalWIS.toFixed(1) : '—'}</Text>
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
        Updates every 30 seconds
      </Text>
    </Stack>
  );
};

export default TournamentLeaderboard;
