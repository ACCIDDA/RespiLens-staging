/**
 * RespiLens My Plots Storage Utility
 */

const STORAGE_KEY = "respilens_user_saved_plots";

function isLocalStorageAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates the plot object against the schema defined in extractPlotData.js
 */
function isValidPlot(plot) {
  return (
    plot &&
    typeof plot === "object" &&
    typeof plot.id === "string" &&
    typeof plot.fullUrl === "string" &&
    typeof plot.viewType === "string" &&
    typeof plot.viewDisplayName === "string" &&
    typeof plot.fullDataPath === "string" &&
    plot.settings &&
    typeof plot.settings === "object" &&
    typeof plot.settings.location === "string" &&
    typeof plot.settings.target === "string" &&
    Array.isArray(plot.settings.dates)
  );
}

/**
 * Get all stored saved plots
 */
export function getSavedPlots() {
  if (!isLocalStorageAvailable()) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    // Filters out any old/legacy schemas that don't match the new extractPlotData structure
    return parsed.filter((plot) => isValidPlot(plot));
  } catch (error) {
    console.error("Error reading plots from localStorage:", error);
    return [];
  }
}

/**
 * Save a plot to My Plots
 */
export function savePlot(plotData) {
  if (!isLocalStorageAvailable()) return false;

  try {
    const plots = getSavedPlots();

    // Check for duplicates based on URL to prevent clutter
    const existingIndex = plots.findIndex(
      (p) => p.fullUrl === plotData.fullUrl,
    );

    const plotEntry = {
      ...plotData,
      // Ensure we have a UUID and a timestamp for sorting
      id: plotData.id || crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing entry
      plots[existingIndex] = plotEntry;
    } else {
      // Add new entry to the top of the list
      plots.unshift(plotEntry);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plots));
    return true;
  } catch (error) {
    if (error.name === "QuotaExceededError" || error.code === 22) {
      console.error("Storage quota exceeded.");
    } else {
      console.error("Failed to save plot:", error);
    }
    return false;
  }
}

/**
 * Delete a specific saved plot
 */
export function deletePlot(id) {
  if (!isLocalStorageAvailable()) return false;
  try {
    const plots = getSavedPlots();
    const filtered = plots.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}
