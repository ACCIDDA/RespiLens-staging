/**
 * Tournament Configuration
 * Settings for the Epidemics 10 Forecasting Tournament
 */

export const TOURNAMENT_CONFIG = {
  // Tournament ID
  id: 'epidemics-10',

  // Tournament metadata
  name: 'Epidemics 10 Forecasting Tournament',
  description: 'Compete in 3 epidemic forecasting challenges and climb the leaderboard',

  // Google Sheets integration
  // IMPORTANT: Replace with your deployed Google Apps Script Web App URL
  apiUrl: import.meta.env.VITE_TOURNAMENT_API_URL || 'https://script.google.com/macros/s/AKfycbwB7LnE8DSk9S7ACLs20j65iB-9ryCXAiih2FlMwpeWDDE4pLZ1zF3RQilfrm6_byLU7w/exec',
  sheetId: '17J5KWUrVuqmqqBcVJg2A-dfVdrL4LjXTvlztCDpS0g0',
  // Challenges are always active (no date restrictions as per requirements)
  challengesAlwaysActive: true,

  // Number of challenges
  numChallenges: 3,

  // Challenge configuration
  // Each challenge shows 1, 2, and 3 week ahead forecasts (like Forecastle)
  // Using historical dates where ground truth is already available
  challenges: [
    {
      id: 'ch-1',
      number: 1,
      title: 'California Influenza Forecast',
      description: 'Predict California flu hospitalizations for 1, 2, and 3 weeks ahead',
      dataset: 'flu',
      datasetKey: 'flusight',
      dataPath: 'flusight',
      fileSuffix: 'flu.json',
      location: 'CA',
      displayName: 'California',
      target: 'wk inc flu hosp',
      horizons: [1, 2, 3],
      forecastDate: '2023-11-11',
    },
    {
      id: 'ch-2',
      number: 2,
      title: 'Texas Influenza Forecast',
      description: 'Predict Texas flu hospitalizations for 1, 2, and 3 weeks ahead',
      dataset: 'flu',
      datasetKey: 'flusight',
      dataPath: 'flusight',
      fileSuffix: 'flu.json',
      location: 'TX',
      displayName: 'Texas',
      target: 'wk inc flu hosp',
      horizons: [1, 2, 3],
      forecastDate: '2025-01-18',
    },
    {
      id: 'ch-3',
      number: 3,
      title: 'North Carolina COVID-19 Forecast',
      description: 'Predict North Carolina COVID hospitalizations for 1, 2, and 3 weeks ahead',
      dataset: 'covid',
      datasetKey: 'covid19',
      dataPath: 'covid19forecasthub',
      fileSuffix: 'covid19.json',
      location: 'NC',
      displayName: 'North Carolina',
      target: 'wk inc covid hosp',
      horizons: [1, 2, 3],
      forecastDate: '2025-09-13',
    },
  ],

  // Scoring configuration
  scoring: {
    method: 'WIS', // Weighted Interval Score
    lowerIsBetter: true, // Lower WIS is better
    intervals: [50, 95], // 50% and 95% prediction intervals
  },

  // Leaderboard settings
  leaderboard: {
    updateFrequency: 30000, // 30 seconds (polling interval)
    showRealNames: true, // Display participant names
    showScoreBreakdown: true, // Show detailed WIS breakdown
    onlyShowCompleted: false, // Show all participants, not just those who completed all challenges
    rankingMethod: 'avgWIS', // Rank by average WIS across all challenges
  },

  // UI settings
  ui: {
    // Chart configuration for challenges
    chartHeight: 380,
    showIntervals: true,
    zoomedView: false,

    // Progress indicators
    showProgress: true,
    progressStyle: 'dots', // 'dots' or 'bar'

    // Medals for top 3
    medals: {
      1: '🥇',
      2: '🥈',
      3: '🥉',
    },
  },

  // Storage keys for localStorage
  storageKeys: {
    participantId: 'tournament_participant_id',
    participantName: 'tournament_participant_name',
    submissions: 'tournament_submissions',
    lastSync: 'tournament_last_sync',
  },

  // Feature flags
  features: {
    allowResubmit: false, // Don't allow participants to update their forecasts
    showOtherForecasts: false, // Don't show other participants' forecasts
    showModelComparisons: false, // Don't show model forecasts in challenges
    enableSocialSharing: true, // Enable sharing results
  },
};

/**
 * Get challenge by ID
 * @param {string} challengeId - Challenge ID
 * @returns {Object|null} Challenge configuration or null if not found
 */
export const getChallengeById = (challengeId) => {
  return TOURNAMENT_CONFIG.challenges.find(c => c.id === challengeId) || null;
};

/**
 * Get challenge by number
 * @param {number} challengeNumber - Challenge number (1-5)
 * @returns {Object|null} Challenge configuration or null if not found
 */
export const getChallengeByNumber = (challengeNumber) => {
  return TOURNAMENT_CONFIG.challenges.find(c => c.number === challengeNumber) || null;
};

/**
 * Check if all challenges are completed
 * @param {Array} submissions - Array of submission objects
 * @returns {boolean} True if all challenges have submissions
 */
export const areAllChallengesCompleted = (submissions) => {
  if (!submissions || submissions.length === 0) return false;

  const completedChallenges = new Set(
    submissions.map(sub => sub.challengeNum)
  );

  return completedChallenges.size === TOURNAMENT_CONFIG.numChallenges;
};
