/**
 * RespiLens Storage Utility
 *
 * Manages localStorage for RespiLens games (currently Forecastle).
 * Stores raw game data (user predictions, intervals, ground truth).
 * Statistics are computed on-the-fly from stored data.
 */

const STORAGE_KEY = 'respilens_forecastle_games';

/**
 * Get all stored Forecastle games
 * @returns {Array} Array of game objects
 */
export function getForecastleGames() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading Forecastle games from localStorage:', error);
    return [];
  }
}

/**
 * Save a completed Forecastle game
 * @param {Object} gameData - The game data to save
 * @param {string} gameData.challengeDate - ISO date string of the challenge
 * @param {string} gameData.dataset - Dataset name (e.g., 'flusight')
 * @param {string} gameData.location - Location code (e.g., 'NY')
 * @param {string} gameData.target - Target name (e.g., 'influenza_hospitalizations')
 * @param {Array} gameData.userForecasts - Array of forecast entries with median and intervals
 * @param {Array} gameData.groundTruth - Array of actual observed values
 * @param {Array} gameData.horizonDates - Array of ISO date strings for each horizon
 * @returns {boolean} Success status
 */
export function saveForecastleGame(gameData) {
  try {
    const games = getForecastleGames();

    // Create unique ID for this game
    const id = `${gameData.challengeDate}_${gameData.dataset}_${gameData.location}`;

    // Check if this game already exists (replay protection)
    const existingIndex = games.findIndex(g => g.id === id);

    const gameEntry = {
      id,
      playedAt: new Date().toISOString(),
      challengeDate: gameData.challengeDate,
      dataset: gameData.dataset,
      location: gameData.location,
      target: gameData.target,
      userForecasts: gameData.userForecasts.map(f => ({
        horizon: f.horizon,
        median: f.median,
        lower95: f.lower95,
        upper95: f.upper95,
        lower50: f.lower50,
        upper50: f.upper50
      })),
      groundTruth: gameData.groundTruth,
      horizonDates: gameData.horizonDates
    };

    if (existingIndex >= 0) {
      // Replace existing game (user replayed the same challenge)
      games[existingIndex] = gameEntry;
    } else {
      // Add new game
      games.push(gameEntry);
    }

    // Sort by playedAt date (newest first)
    games.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    return true;
  } catch (error) {
    console.error('Error saving Forecastle game to localStorage:', error);
    return false;
  }
}

/**
 * Get a specific game by ID
 * @param {string} id - Game ID (format: "YYYY-MM-DD_dataset_location")
 * @returns {Object|null} Game object or null if not found
 */
export function getForecastleGame(id) {
  const games = getForecastleGames();
  return games.find(g => g.id === id) || null;
}

/**
 * Delete a specific game
 * @param {string} id - Game ID to delete
 * @returns {boolean} Success status
 */
export function deleteForecastleGame(id) {
  try {
    const games = getForecastleGames();
    const filtered = games.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting Forecastle game:', error);
    return false;
  }
}

/**
 * Clear all Forecastle game data
 * @returns {boolean} Success status
 */
export function clearForecastleGames() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing Forecastle games:', error);
    return false;
  }
}

/**
 * Export all game data as JSON
 * @returns {string} JSON string of all games
 */
export function exportForecastleData() {
  const games = getForecastleGames();
  return JSON.stringify(games, null, 2);
}

/**
 * Import game data from JSON
 * @param {string} jsonData - JSON string of games to import
 * @returns {boolean} Success status
 */
export function importForecastleData(jsonData) {
  try {
    const imported = JSON.parse(jsonData);
    if (!Array.isArray(imported)) {
      throw new Error('Invalid data format: expected array');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    return true;
  } catch (error) {
    console.error('Error importing Forecastle data:', error);
    return false;
  }
}
