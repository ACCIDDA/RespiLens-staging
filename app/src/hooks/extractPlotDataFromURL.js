/**
 * Parses the current URL and viewType to extract a serialized state
 * for the "My Plots" persistence feature.
 * * @param {string} viewType - The current active view
 * @param {string} href - The full window.location.href string
 * @returns {Object} The processed plotData object
 */
export const extractPlotData = (viewType, href) => {
  const url = new URL(href);
  const params = url.searchParams;

  let dataSuffix = "";
  let location = "";
  let fileName = "";
  let fullDataPath = "";
  let target = "";

  // Translate pseudo-code logic into JavaScript
  switch (viewType) {
    case "covid_forecasts":
      dataSuffix = "covid19";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      target = params.has("covid_target")
        ? params.get("covid_target")
        : "wk inc covid hosp"; // TODO: get right target
      break;

    case "flu_forecasts":
    case "fludetailed":
      dataSuffix = "flu";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/flusight/${fileName}`;
      target = params.has("flu_target")
        ? params.get("flu_target")
        : "wk inc flu hosp"; // TODO: get right target
      break;

    case "rsv_forecasts":
      dataSuffix = "rsv";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/flusight/${fileName}`;
      target = params.has("rsv_target")
        ? params.get("rsv_target")
        : "wk inc rsv hosp"; // TODO: get right target
      break;

    case "metrocast_forecasts":
      dataSuffix = "flu_metrocast";
      location = params.has("location") ? params.get("location") : "colorado";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/flusight/${fileName}`;
      target = "pct ed visits due to flu"; // TODO: get right target
      break;

    case "nhsnall":
      dataSuffix = "nhsn";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/flusight/${fileName}`;
      // TODO: need to handle target (aka column+column unit combo for nhsn)
      break;

    default:
      throw new Error(`Unknown view type: ${viewType}`);
  }

  // Construct the finalized plotData object
  const plotData = {
    viewType: viewType,
    fullUrl: href,
    // add editorializations from logic above
    settings: {
      dataSuffix,
      location,
      fileName,
      fullDataPath,
      target,
    },
  };

  // Persist to Web Storage (for later)
  // const currentSaved = JSON.parse(localStorage.getItem("userSavedPlots") || "[]");
  // localStorage.setItem("userSavedPlots", JSON.stringify([plotData, ...currentSaved]));

  return plotData;
};
