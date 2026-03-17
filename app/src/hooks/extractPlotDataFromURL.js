import { savePlot } from "../utils/plotStorage";

/**
 * Parses the current URL and viewType to extract a serialized state
 * for the "My Plots" persistence feature.
 * * @param {string} viewType - The current active view
 * @param {string} href - The full window.location.href string
 * @returns {Object} The processed plotData object
 */
export const extractPlotData = (viewType, href, data) => {
  const url = new URL(href);
  const params = url.searchParams;
  const id = crypto.randomUUID();
  const currentDate = new Date().toISOString().split("T")[0];
  let dataSuffix = "";
  let fileName = "";
  let fullDataPath = "";

  // plot settings
  let location = "";
  let target = "";
  let columns = [];
  let models = [];
  let dates = [];

  switch (viewType) {
    case "covid_forecasts":
      dataSuffix = "covid19";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `covid19forecasthub/${fileName}`;
      target = params.has("covid_target")
        ? params.get("covid_target")
        : "wk inc covid hosp";
      const covidModelsString = params.get("covid_models");
      models = covidModelsString
        ? covidModelsString.split(",")
        : ["CovidHub-ensemble"];
      const covidDatesString = params.get("covid_dates");
      if (covidDatesString) {
        dates = covidDatesString.split(",");
      } else {
        // extract most recent date key from forecasts key of data
        const availableDates = Object.keys(data?.forecasts || {});
        if (availableDates.length > 0) {
          const mostRecent = availableDates.sort().pop();
          dates = [mostRecent];
        } else {
          // throw error otherwise
          throw new Error(
            `Unable to extract plot data: No dates found in URL and no forecast data available for ${viewType}.`,
          );
        }
      }
      break;

    case "flu_forecasts":
    case "fludetailed":
      dataSuffix = "flu";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `flusight/${fileName}`;
      target = params.has("flu_target")
        ? params.get("flu_target")
        : "wk inc flu hosp";
      const fluModelsString = params.get("flu_models");
      models = fluModelsString
        ? fluModelsString.split(",")
        : ["FluSight-ensemble"];
      const fluDatesString = params.get("flu_dates");
      if (fluDatesString) {
        dates = fluDatesString.split(",");
      } else {
        // extract most recent date key from forecasts key of data
        const availableDates = Object.keys(data?.forecasts || {});
        if (availableDates.length > 0) {
          const mostRecent = availableDates.sort().pop();
          dates = [mostRecent];
        } else {
          // throw error otherwise
          throw new Error(
            `Unable to extract plot data: No dates found in URL and no forecast data available for ${viewType}.`,
          );
        }
      }
      break;

    case "rsv_forecasts":
      dataSuffix = "rsv";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `rsvforecasthub/${fileName}`;
      target = params.has("rsv_target")
        ? params.get("rsv_target")
        : "wk inc rsv hosp";
      const rsvModelsString = params.get("rsv_models");
      models = rsvModelsString
        ? rsvModelsString.split(",")
        : ["RSVHub-ensemble"];
      const rsvDatesString = params.get("rsv_dates");
      if (rsvDatesString) {
        dates = rsvDatesString.split(",");
      } else {
        // extract most recent date key from forecasts key of data
        const availableDates = Object.keys(data?.forecasts || {});
        if (availableDates.length > 0) {
          const mostRecent = availableDates.sort().pop();
          dates = [mostRecent];
        } else {
          // throw error otherwise
          throw new Error(
            `Unable to extract plot data: No dates found in URL and no forecast data available for ${viewType}.`,
          );
        }
      }
      break;

    case "metrocast_forecasts":
      dataSuffix = "flu_metrocast";
      location = params.has("location") ? params.get("location") : "colorado";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `flumetrocast/${fileName}`;
      target = "Flu ED visits pct";
      const metrocastModelsString = params.get("metrocast_models");
      models = metrocastModelsString
        ? metrocastModelsString.split(",")
        : ["epiENGAGE-ensemble_mean"];
      const metrocastDatesString = params.get("metrocast_dates");
      if (metrocastDatesString) {
        dates = metrocastDatesString.split(",");
      } else {
        // extract most recent date key from forecasts key of data
        const availableDates = Object.keys(data?.forecasts || {});
        if (availableDates.length > 0) {
          const mostRecent = availableDates.sort().pop();
          dates = [mostRecent];
        } else {
          // throw error otherwise
          throw new Error(
            `Unable to extract plot data: No dates found in URL and no forecast data available for ${viewType}.`,
          );
        }
      }
      break;

    case "nhsnall":
      dataSuffix = "nhsn";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `nhsn/${fileName}`;
      target = params.has("nhsn_target")
        ? params.get("nhsn_target")
        : "Hospital Admissions (rates)";
      const nhsnColsFromUrl = params.getAll("nhsn_cols");
      columns =
        nhsnColsFromUrl.length > 0
          ? nhsnColsFromUrl
          : ["totalconfflunewadm", "totalconfc19newadm", "totalconfrsvnewadm"]; // TODO: slug:longform mapping
      dates = [currentDate]; // TODO: handle the range slider?? if they have moved it, it is uncaptured
      break;

    default:
      throw new Error(`Unknown view type: ${viewType}`); // TODO: handle peak view??
  }

  // Construct the finalized plotData object
  const plotData = {
    viewType: viewType,
    fullUrl: href,
    id,
    currentDate,
    dataSuffix,
    fileName,
    fullDataPath,
    // add editorializations from logic above
    settings: {
      location,
      target,
      columns,
      models,
      dates,
    },
  };

  savePlot(plotData);

  return plotData;
};
