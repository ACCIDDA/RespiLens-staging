/**
 * Tournament API
 * Handles communication with Google Sheets backend via Apps Script
 */

import { TOURNAMENT_CONFIG } from '../config';

/**
 * Make a GET request to the tournament API
 * @param {string} action - API action
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
const apiGet = async (action, params = {}) => {
  const apiUrl = TOURNAMENT_CONFIG.apiUrl;

  if (!apiUrl) {
    throw new Error('Tournament API URL not configured. Please set VITE_TOURNAMENT_API_URL in .env');
  }

  const url = new URL(apiUrl);
  url.searchParams.append('action', action);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    // No headers needed for GET - avoids CORS preflight
    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unknown API error');
    }

    return data;
  } catch (error) {
    console.error('Tournament API GET error:', error);
    throw error;
  }
};

/**
 * Make a POST request to the tournament API
 * @param {Object} payload - Request payload
 * @returns {Promise<Object>} Response data
 */
const apiPost = async (payload) => {
  const apiUrl = TOURNAMENT_CONFIG.apiUrl;

  if (!apiUrl) {
    throw new Error('Tournament API URL not configured. Please set VITE_TOURNAMENT_API_URL in .env');
  }

  try {
    // Use text/plain to avoid CORS preflight
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unknown API error');
    }

    return data;
  } catch (error) {
    console.error('Tournament API POST error:', error);
    throw error;
  }
};

/**
 * Register a new participant or login existing participant
 * @param {string} firstName - Participant's first name
 * @param {string} lastName - Participant's last name
 * @returns {Promise<Object>} Participant data {participantId, message}
 */
export const registerParticipant = async (firstName, lastName) => {
  if (!firstName || !lastName) {
    throw new Error('First name and last name are required');
  }

  const data = await apiPost({
    action: 'register',
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  });

  // Store in localStorage
  localStorage.setItem(TOURNAMENT_CONFIG.storageKeys.participantId, data.participantId);
  localStorage.setItem(TOURNAMENT_CONFIG.storageKeys.participantName, `${firstName} ${lastName}`);

  return data;
};

/**
 * Submit a forecast for a challenge
 * @param {string} participantId - Participant ID
 * @param {number} challengeNum - Challenge number (1-5)
 * @param {Object} forecast - Forecast data {median, q25, q75, q025, q975}
 * @returns {Promise<Object>} Submission data {submissionId, message}
 */
export const submitForecast = async (participantId, challengeNum, forecast) => {
  if (!participantId) {
    throw new Error('Participant ID is required');
  }

  if (!challengeNum || challengeNum < 1 || challengeNum > TOURNAMENT_CONFIG.numChallenges) {
    throw new Error(`Challenge number must be between 1 and ${TOURNAMENT_CONFIG.numChallenges}`);
  }

  if (!forecast || !forecast.median) {
    throw new Error('Forecast data is required');
  }

  const data = await apiPost({
    action: 'submitForecast',
    participantId,
    challengeNum,
    median: forecast.median,
    q25: forecast.q25 || forecast.lower50,
    q75: forecast.q75 || forecast.upper50,
    q025: forecast.q025 || forecast.lower95,
    q975: forecast.q975 || forecast.upper95,
  });

  // Update last sync time
  localStorage.setItem(TOURNAMENT_CONFIG.storageKeys.lastSync, new Date().toISOString());

  return data;
};

/**
 * Get the leaderboard
 * @returns {Promise<Array>} Leaderboard data
 */
export const getLeaderboard = async () => {
  const data = await apiGet('getLeaderboard');
  return data.leaderboard || [];
};

/**
 * Get participant data including submissions
 * @param {string} participantId - Participant ID
 * @returns {Promise<Object>} Participant data {participant, submissions}
 */
export const getParticipant = async (participantId) => {
  if (!participantId) {
    throw new Error('Participant ID is required');
  }

  const data = await apiGet('getParticipant', { participantId });

  return {
    participant: data.participant,
    submissions: data.submissions || [],
  };
};

/**
 * Get participant ID from localStorage
 * @returns {string|null} Participant ID or null if not found
 */
export const getStoredParticipantId = () => {
  return localStorage.getItem(TOURNAMENT_CONFIG.storageKeys.participantId);
};

/**
 * Get participant name from localStorage
 * @returns {string|null} Participant name or null if not found
 */
export const getStoredParticipantName = () => {
  return localStorage.getItem(TOURNAMENT_CONFIG.storageKeys.participantName);
};

/**
 * Clear participant data from localStorage (logout)
 */
export const clearParticipantData = () => {
  localStorage.removeItem(TOURNAMENT_CONFIG.storageKeys.participantId);
  localStorage.removeItem(TOURNAMENT_CONFIG.storageKeys.participantName);
  localStorage.removeItem(TOURNAMENT_CONFIG.storageKeys.submissions);
  localStorage.removeItem(TOURNAMENT_CONFIG.storageKeys.lastSync);
};

/**
 * Check if participant is registered
 * @returns {boolean} True if participant ID is stored
 */
export const isParticipantRegistered = () => {
  return !!getStoredParticipantId();
};
