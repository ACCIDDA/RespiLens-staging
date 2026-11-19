import { useCallback, useMemo } from "react";
import { useForecastData } from "../../hooks/useForecastData";
import { formatStoryDate, getSeasonStartYear } from "../../utils/peakForecasts";
import {
  getLastObserved,
  getTrajectoryModels,
  summarizeTrajectories,
  summarizeTrajectory,
} from "../../utils/trajectoryForecasts";

/**
 * One hub's weekly forecasts for a narrative: loads them with the app's own
 * useForecastData (only while `active`, so a story with several hubs loads
 * the ones near the reader's step), picks the forecast date the reader sees
 * (the latest on or before the story's fixed date `asOf` by default, kept in
 * the URL under `paramKey`; later forecasts are never offered, so the story
 * reads the same whenever it is opened) and summarises it for the prose.
 *
 * `target` is the target the prose describes (the first available one if
 * the location lacks it); `ensembleModel` the hub's headline forecast.
 */
export const useTrajectoryForecast = ({
  viewType,
  location,
  active,
  paramKey,
  params,
  updateParams,
  target: preferredTarget,
  ensembleModel,
  asOf,
}) => {
  const forecast = useForecastData(active ? location : null, viewType);
  // While a new location loads the hook still holds the last one's data
  const fresh =
    location && forecast.data?.metadata?.abbreviation === location
      ? forecast
      : null;
  const forecasts = fresh?.data?.forecasts || null;
  const groundTruth = fresh?.data?.ground_truth || null;
  const targets = fresh?.availableTargets;
  const target =
    !targets?.length || targets.includes(preferredTarget)
      ? preferredTarget
      : targets[0];

  // Every forecast up to the story's date; the latest by default
  const season = getSeasonStartYear(asOf);
  const offered = useMemo(
    () => (fresh?.availableDates || []).filter((date) => date <= asOf),
    [fresh?.availableDates, asOf],
  );
  const latestDate = offered.at(-1) || null;
  const requestedDate = params.get(paramKey);
  const date = offered.includes(requestedDate) ? requestedDate : latestDate;

  const ensemble = useMemo(
    () => summarizeTrajectory(forecasts, date, target, ensembleModel),
    [forecasts, date, target, ensembleModel],
  );
  // Every forecast but the ensemble's own, to compare it against
  const members = useMemo(
    () =>
      date
        ? summarizeTrajectories(
            forecasts,
            date,
            target,
            getTrajectoryModels(forecasts, [date], target).filter(
              (model) => model !== ensembleModel,
            ),
          )
        : [],
    [forecasts, date, target, ensembleModel],
  );
  const observed = useMemo(
    () => getLastObserved(groundTruth, target, date),
    [groundTruth, target, date],
  );

  // Back to the default drops the param
  const setDate = useCallback(
    (next) => updateParams({ [paramKey]: next === latestDate ? null : next }),
    [updateParams, paramKey, latestDate],
  );

  const dateEntry = useMemo(
    () => ({ value: date, set: setDate, available: offered }),
    [date, setDate, offered],
  );

  return {
    viewType,
    forecast,
    forecasts,
    location,
    target,
    ensembleModel,
    date: dateEntry,
    dateLabel: formatStoryDate(date),
    season,
    // No forecast yet in the story's season: the latest is an earlier one's
    fromPastSeason:
      Boolean(latestDate) && getSeasonStartYear(latestDate) < season,
    ensemble,
    members,
    observed,
    loading: Boolean(location) && active && !fresh,
  };
};
