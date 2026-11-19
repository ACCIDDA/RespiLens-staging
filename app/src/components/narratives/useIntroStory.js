import { useCallback, useMemo } from "react";
import { DATASETS } from "../../config/datasets";
import { useLocationOptions } from "../../hooks/useLocationOptions";
import {
  STATE_ABBREVIATION_TO_NAME,
  resolvePlotLocationDisplayName,
} from "../../utils/plotLocationDisplay";
import {
  describeTrajectoryHigh,
  summarizeTrajectory,
} from "../../utils/trajectoryForecasts";
import { usePeakForecast } from "./usePeakForecast";
import { useTrajectoryForecast } from "./useTrajectoryForecast";

// The hubs the story visits: the view each is drawn with, the target the
// prose describes and the URL param holding its forecast date
const HUBS = {
  flu: {
    viewType: "flu_forecasts",
    target: "wk inc flu hosp",
    paramKey: "fluDate",
    ensembleModel: DATASETS.flu.defaultModel,
  },
  metro: {
    viewType: "metrocast_forecasts",
    target: "Flu ED visits pct",
    paramKey: "metroDate",
    ensembleModel: DATASETS.metrocast.defaultModel,
  },
  rsv: {
    viewType: "rsv_forecasts",
    target: "wk inc rsv hosp",
    paramKey: "rsvDate",
    ensembleModel: DATASETS.rsv.defaultModel,
  },
  covid: {
    viewType: "covid_forecasts",
    target: "wk inc covid hosp",
    paramKey: "covidDate",
    ensembleModel: DATASETS.covid.defaultModel,
  },
};

/**
 * The state the introduction's slides share, kept in the URL so any step
 * can be shared or reloaded: the state (`location`), the MetroCast area
 * (`metro`, the chosen state's when MetroCast covers it) and each chart's
 * forecast date, read as of the narrative's fixed date `asOf`. Each hub's data loads only while `activeHubs` names it
 * (the hubs of the slides around the reader's step).
 */
export const useIntroStory = ({ params, updateParams, activeHubs, asOf }) => {
  const location = params.get("location") || null;
  const hubProps = (key, hubLocation) => ({
    ...HUBS[key],
    location: hubLocation,
    active: activeHubs.has(key),
    asOf,
    params,
    updateParams,
  });

  // MetroCast covers a few states, by state and metro area
  const { locations: metroLocations } = useLocationOptions(
    HUBS.metro.viewType,
    DATASETS.metrocast,
  );
  const stateName = STATE_ABBREVIATION_TO_NAME[location];
  const metroForState =
    metroLocations.find(
      (entry) => !entry.parent && entry.location_name === stateName,
    )?.abbreviation || null;
  // Waits for MetroCast's list, so the chosen state's own area loads first
  const metroLocation =
    location && metroLocations.length
      ? params.get("metro") ||
        metroForState ||
        DATASETS.metrocast.defaultLocation
      : null;
  const metroEntry = metroLocations.find(
    (entry) => entry.abbreviation === metroLocation,
  );

  const flu = useTrajectoryForecast(hubProps("flu", location));
  const peak = usePeakForecast({
    forecast: flu.forecast,
    location,
    params,
    updateParams,
    asOf,
  });
  const metro = useTrajectoryForecast(hubProps("metro", metroLocation));
  const rsv = useTrajectoryForecast(hubProps("rsv", location));
  const covid = useTrajectoryForecast(hubProps("covid", location));

  // The full-season ensemble, on the same date as the 4-week one
  const metroLong = useMemo(() => {
    const summary = summarizeTrajectory(
      metro.forecasts,
      metro.date.value,
      metro.target,
      DATASETS.metrocast.longTermDefaultModel,
    );
    return summary
      ? { ...summary, high: describeTrajectoryHigh(summary) }
      : null;
  }, [metro.forecasts, metro.date.value, metro.target]);

  // A new state starts MetroCast from that state again
  const locationPatch = useCallback(
    (next) => ({ location: next, metro: null }),
    [],
  );
  const setLocation = useCallback(
    (next) => updateParams(locationPatch(next)),
    [updateParams, locationPatch],
  );
  const setMetroLocation = useCallback(
    (next) => updateParams({ metro: next === metroForState ? null : next }),
    [updateParams, metroForState],
  );

  const hubs = {
    flu: { ...flu, setLocation },
    // flu_peak reads the same flusight data as the weekly forecasts
    peak: { ...flu, viewType: "flu_peak", setLocation },
    metro: {
      ...metro,
      setLocation: setMetroLocation,
      longTermModel: DATASETS.metrocast.longTermDefaultModel,
    },
    rsv: { ...rsv, setLocation },
    covid: { ...covid, setLocation },
  };

  return {
    // The date the story reads its data as of
    asOf,
    location,
    // Read inside sentences: "in the United States", "in North Carolina"
    locationName:
      location === "US"
        ? "the United States"
        : location
          ? resolvePlotLocationDisplayName(location)
          : "",
    setLocation,
    // The URL change choosing a place makes, for a step that also moves on
    locationPatch,
    hubs,
    // The forecast date each slide shows, by the name its `view.date` gives
    dates: {
      flu: flu.date,
      peak: peak.date,
      peakPast: peak.past,
      metro: metro.date,
      rsv: rsv.date,
      covid: covid.date,
    },
    peak,
    pastDate: peak.pastDate,
    metroName: metroEntry?.location_name || metroLocation || "",
    // MetroCast does not cover the chosen state: the story shows another
    metroIsElsewhere:
      Boolean(location) && metroLocations.length > 0 && !metroForState,
    metroLong,
    loading: [flu, metro, rsv, covid].some((hub) => hub.loading),
  };
};
