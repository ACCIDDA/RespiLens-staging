import { useCallback, useMemo } from "react";
import {
  formatStoryDate,
  getPastPeakSeason,
  getSeasonStartYear,
  getPeakModels,
  intervalHit,
  pickNearestDate,
  summarizePeakForecast,
  summarizePeakForecasts,
  weeksBetween,
} from "../../utils/peakForecasts";

const ENSEMBLE_MODEL = "FluSight-ensemble";

const shiftYear = (date, years) =>
  `${Number(date.slice(0, 4)) + years}${date.slice(4)}`;

/**
 * FluSight's peak forecasts for a narrative, from the flusight data the
 * story already loaded (`forecast`, a useForecastData result for
 * `location`): the forecast date in the season of the story's fixed date
 * `asOf` (`peakDate` in the URL, the latest by `asOf` by default) and the
 * date looked back from in the last season with peak forecasts (`pastDate`,
 * the same week a year earlier by default), summarised for the prose.
 *
 * `params` / `updateParams` are the story's URL search params and a setter
 * merging a patch into them (null deletes a key).
 */
export const usePeakForecast = ({
  forecast,
  location,
  params,
  updateParams,
  asOf,
}) => {
  // While a new location loads the hook still holds the last one's data
  const fresh =
    location && forecast.data?.metadata?.abbreviation === location
      ? forecast
      : null;
  const peaks = fresh?.peaks || null;
  const groundTruth = fresh?.data?.ground_truth || null;
  const peakDates = useMemo(
    () => fresh?.availablePeakDates || [],
    [fresh?.availablePeakDates],
  );

  // The story's season, up to its fixed date: none yet early in a season
  const season = getSeasonStartYear(asOf);
  const seasonDates = useMemo(
    () =>
      peakDates.filter(
        (date) => getSeasonStartYear(date) === season && date <= asOf,
      ),
    [peakDates, season, asOf],
  );
  // The latest by the story's date, unless the reader picked another
  const latestDate = seasonDates[seasonDates.length - 1] || null;
  const requestedDate = params.get("peakDate");
  const date = seasonDates.includes(requestedDate) ? requestedDate : latestDate;

  const ensemble = useMemo(
    () => summarizePeakForecast(peaks, date, ENSEMBLE_MODEL),
    [peaks, date],
  );

  // Last season, looked back on from one forecast date
  const pastSeason = useMemo(
    () => getPastPeakSeason(peakDates, groundTruth, season),
    [peakDates, groundTruth, season],
  );
  const requestedPastDate = params.get("pastDate");
  const pastDate = pastSeason
    ? pastSeason.dates.includes(requestedPastDate)
      ? requestedPastDate
      : // The same week a year earlier (or that season's nearest forecast)
        pickNearestDate(pastSeason.dates, shiftYear(asOf, -1))
    : null;
  const lookBack = useMemo(() => {
    const observed = pastSeason?.observedPeak;
    if (!observed || !pastDate) return null;
    const summaries = summarizePeakForecasts(
      peaks,
      pastDate,
      getPeakModels(peaks, pastDate),
    );
    const ensembleThen =
      summaries.find((summary) => summary.model === ENSEMBLE_MODEL) || null;
    return {
      season: pastSeason.season,
      observed,
      weeksBefore: weeksBetween(pastDate, observed.date),
      ensemble: ensembleThen,
      ensembleHit: ensembleThen
        ? intervalHit(ensembleThen.size, observed.value)
        : null,
      modelCount: summaries.length,
      in95: summaries.filter(
        (summary) => intervalHit(summary.size, observed.value).in95,
      ).length,
    };
  }, [peaks, pastDate, pastSeason]);

  // Back to the latest drops the param, so the link follows new forecasts
  const setDate = useCallback(
    (next) => updateParams({ peakDate: next === latestDate ? null : next }),
    [updateParams, latestDate],
  );
  const setPastDate = useCallback(
    (next) => updateParams({ pastDate: next }),
    [updateParams],
  );

  // The forecast dates the peak slides show, with the dates each may step
  // between (its season's)
  const dateEntry = useMemo(
    () => ({ value: date, set: setDate, available: seasonDates }),
    [date, setDate, seasonDates],
  );
  const pastEntry = useMemo(
    () => ({
      value: pastDate,
      set: setPastDate,
      available: pastSeason?.dates || [],
    }),
    [pastDate, setPastDate, pastSeason],
  );

  return {
    date: dateEntry,
    past: pastEntry,
    season,
    peaks,
    ensembleModel: ENSEMBLE_MODEL,
    dateLabel: formatStoryDate(date),
    ensemble,
    pastDate,
    pastDateLabel: formatStoryDate(pastDate),
    lookBack,
  };
};
