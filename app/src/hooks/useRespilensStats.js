import { useMemo } from 'react';
import { getForecastleGames } from '../utils/respilensStorage';
import { calculateRMSE } from '../utils/forecastleScoring';

/**
 * Calculate interval coverage for a single game
 * @param {Array} userForecasts - Array of forecast entries with intervals
 * @param {Array} groundTruth - Array of actual observed values
 * @returns {Object} Coverage counts for 95% and 50% intervals
 */
function calculateIntervalCoverage(userForecasts, groundTruth) {
  let coverage95 = 0;
  let coverage50 = 0;
  let validHorizons = 0;

  userForecasts.forEach((forecast, idx) => {
    const truth = groundTruth[idx];

    // Only count horizons with valid ground truth and intervals
    if (
      Number.isFinite(truth) &&
      Number.isFinite(forecast.lower95) &&
      Number.isFinite(forecast.upper95) &&
      Number.isFinite(forecast.lower50) &&
      Number.isFinite(forecast.upper50)
    ) {
      validHorizons += 1;

      // Check if ground truth falls within intervals
      if (truth >= forecast.lower95 && truth <= forecast.upper95) {
        coverage95 += 1;
      }
      if (truth >= forecast.lower50 && truth <= forecast.upper50) {
        coverage50 += 1;
      }
    }
  });

  return {
    coverage95,
    coverage50,
    validHorizons
  };
}

/**
 * Compute statistics for a single game
 * @param {Object} game - Game object from storage
 * @returns {Object} Computed statistics for the game
 */
function computeGameStats(game) {
  // Extract user medians
  const userMedians = game.userForecasts.map(f => f.median);

  // Calculate RMSE
  const rmse = calculateRMSE(userMedians, game.groundTruth);

  // Calculate interval coverage
  const coverage = calculateIntervalCoverage(game.userForecasts, game.groundTruth);

  return {
    id: game.id,
    playedAt: game.playedAt,
    challengeDate: game.challengeDate,
    dataset: game.dataset,
    location: game.location,
    target: game.target,
    rmse,
    coverage95: coverage.coverage95,
    coverage50: coverage.coverage50,
    validHorizons: coverage.validHorizons,
    totalHorizons: game.userForecasts.length
  };
}

/**
 * Calculate consecutive day streak
 * @param {Array} games - Array of game stats sorted by challengeDate
 * @returns {Object} Current streak and max streak
 */
function calculateStreaks(games) {
  if (games.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Sort by challenge date (most recent first)
  const sorted = [...games].sort((a, b) =>
    new Date(b.challengeDate) - new Date(a.challengeDate)
  );

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 1;
  let lastDate = new Date(sorted[0].challengeDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if most recent game is today or yesterday (current streak alive)
  const daysSinceLastGame = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  if (daysSinceLastGame <= 1) {
    currentStreak = 1;
  }

  // Calculate streaks
  for (let i = 1; i < sorted.length; i += 1) {
    const currentDate = new Date(sorted[i].challengeDate);
    const prevDate = new Date(sorted[i - 1].challengeDate);
    const daysDiff = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      tempStreak += 1;
      if (currentStreak > 0) {
        currentStreak += 1;
      }
    } else {
      // Streak broken
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 1;
      if (currentStreak > 0) {
        currentStreak = 0; // Current streak already broken
      }
    }
  }

  maxStreak = Math.max(maxStreak, tempStreak);

  return { currentStreak, maxStreak };
}

/**
 * React hook to compute RespiLens statistics from stored game data
 * @param {number} [refreshTrigger] - Optional trigger to force recalculation
 * @returns {Object} Computed statistics and game history
 */
export function useRespilensStats(refreshTrigger) {
  const stats = useMemo(() => {
    const games = getForecastleGames();

    if (games.length === 0) {
      return {
        gamesPlayed: 0,
        averageRMSE: null,
        bestRMSE: null,
        worstRMSE: null,
        coverage95Percent: null,
        coverage50Percent: null,
        currentStreak: 0,
        maxStreak: 0,
        gameHistory: []
      };
    }

    // Compute stats for each game
    const gameStats = games.map(computeGameStats);

    // Filter games with valid RMSE
    const validGames = gameStats.filter(g => Number.isFinite(g.rmse));

    // Aggregate statistics
    const totalRMSE = validGames.reduce((sum, g) => sum + g.rmse, 0);
    const averageRMSE = validGames.length > 0 ? totalRMSE / validGames.length : null;
    const bestRMSE = validGames.length > 0 ? Math.min(...validGames.map(g => g.rmse)) : null;
    const worstRMSE = validGames.length > 0 ? Math.max(...validGames.map(g => g.rmse)) : null;

    // Aggregate interval coverage
    const totalCoverage95 = gameStats.reduce((sum, g) => sum + g.coverage95, 0);
    const totalCoverage50 = gameStats.reduce((sum, g) => sum + g.coverage50, 0);
    const totalValidHorizons = gameStats.reduce((sum, g) => sum + g.validHorizons, 0);

    const coverage95Percent = totalValidHorizons > 0
      ? (totalCoverage95 / totalValidHorizons) * 100
      : null;
    const coverage50Percent = totalValidHorizons > 0
      ? (totalCoverage50 / totalValidHorizons) * 100
      : null;

    // Calculate streaks
    const streaks = calculateStreaks(gameStats);

    return {
      gamesPlayed: games.length,
      averageRMSE,
      bestRMSE,
      worstRMSE,
      coverage95Percent,
      coverage50Percent,
      currentStreak: streaks.currentStreak,
      maxStreak: streaks.maxStreak,
      gameHistory: gameStats
    };
  }, [refreshTrigger]); // Recalculates when refreshTrigger changes

  return stats;
}
