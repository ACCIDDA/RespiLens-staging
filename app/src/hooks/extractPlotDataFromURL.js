import { savePlot } from "../utils/plotStorage";

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
  const id = crypto.randomUUID();

  let dataSuffix = "";
  let location = "";
  let fileName = "";
  let fullDataPath = "";
  let target = "";
  let columns = [];
  let models = [];

  switch (viewType) {
    case "covid_forecasts":
      dataSuffix = "covid19";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/covid19forecasthub/${fileName}`;
      target = params.has("covid_target")
        ? params.get("covid_target")
        : "wk inc covid hosp";
      const covidModelsString = params.get("covid_models");
      models = covidModelsString
        ? covidModelsString.split(",")
        : ["CovidHub-ensemble"];
      break;
    case "flu_forecasts":
    case "fludetailed":
      dataSuffix = "flu";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/flusight/${fileName}`;
      target = params.has("flu_target")
        ? params.get("flu_target")
        : "wk inc flu hosp";
      const fluModelsString = params.get("flu_models");
      models = fluModelsString
        ? fluModelsString.split(",")
        : ["FluSight-ensemble"];
      break;

    case "rsv_forecasts":
      dataSuffix = "rsv";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/rsvforecasthub/${fileName}`;
      target = params.has("rsv_target")
        ? params.get("rsv_target")
        : "wk inc rsv hosp";
      const rsvModelsString = params.get("rsv_models");
      models = rsvModelsString
        ? rsvModelsString.split(",")
        : ["RSVHub-ensemble"];
      break;

    case "metrocast_forecasts":
      dataSuffix = "flu_metrocast";
      location = params.has("location") ? params.get("location") : "colorado";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/flumetrocast/${fileName}`;
      target = "Flu ED visits pct";
      const metrocastModelsString = params.get("metrocast_models");
      models = metrocastModelsString
        ? metrocastModelsString.split(",")
        : ["epiENGAGE-ensemble_mean"];
      break;

    case "nhsnall":
      dataSuffix = "nhsn";
      location = params.has("location") ? params.get("location") : "US";
      fileName = `${location}_${dataSuffix}.json`;
      fullDataPath = `processed_data/nhsn/${fileName}`;
      target = params.has("nhsn_target")
        ? params.get("nhsn_target")
        : "Hospital Admissions (rates)";
      const nhsnColsFromUrl = params.getAll("nhsn_cols");
      columns =
        nhsnColsFromUrl.length > 0
          ? nhsnColsFromUrl
          : ["totalconfflunewadm", "totalconfc19newadm", "totalconfrsvnewadm"]; // TODO: slug:longform mapping
      break;

    default:
      throw new Error(`Unknown view type: ${viewType}`); // TODO: handle peak view??
  }

  // Construct the finalized plotData object
  const plotData = {
    viewType: viewType,
    fullUrl: href,
    id,
    // add editorializations from logic above
    settings: {
      dataSuffix,
      location,
      fileName,
      fullDataPath,
      target,
      columns,
      models,
    },
  };

  savePlot(plotData);

  return plotData;
};
