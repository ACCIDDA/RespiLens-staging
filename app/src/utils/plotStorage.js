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

function isValidPlot(plot) {
  return (
    plot &&
    typeof plot === "object" &&
    typeof plot.id === "string" &&
    typeof plot.fullUrl === "string" &&
    typeof plot.viewType === "string" &&
    plot.settings &&
    typeof plot.settings === "object" &&
    Array.isArray(plot.settings.dates) // Added check for dates array
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

    // Check for duplicates based on URL
    const existingIndex = plots.findIndex(
      (p) => p.fullUrl === plotData.fullUrl,
    );

    const plotEntry = {
      ...plotData,
      id: plotData.id || crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      plots[existingIndex] = plotEntry;
    } else {
      plots.unshift(plotEntry);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plots));
    return true;
  } catch (error) {
    if (error.name === "QuotaExceededError" || error.code === 22) {
      console.error("Storage quota exceeded.");
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
  } catch (error) {
    return false;
  }
}
