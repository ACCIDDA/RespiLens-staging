// Summaries of FluSight peak forecasts (the `peaks` block of a location's
// flusight JSON): for one forecast date and model, the peak's size
// (quantiles of "peak inc flu hosp") and timing (quantiles read off the pmf
// of "peak week inc flu hosp"), in a shape a chart, a table and a sentence
// can all share.

export const PEAK_SIZE_TARGET = "peak inc flu hosp";
export const PEAK_WEEK_TARGET = "peak week inc flu hosp";

const QUANTILE_KEYS = {
  q025: 0.025,
  q25: 0.25,
  median: 0.5,
  q75: 0.75,
  q975: 0.975,
};

// { q025, q25, median, q75, q975 } from a { quantiles, values } prediction
// (null where a level is missing), or null without a median
export const readQuantileSummary = (prediction) => {
  const quantiles = prediction?.quantiles;
  const values = prediction?.values;
  if (!Array.isArray(quantiles) || !Array.isArray(values)) return null;

  const summary = {};
  Object.entries(QUANTILE_KEYS).forEach(([key, level]) => {
    const index = quantiles.indexOf(level);
    const value = index === -1 ? null : Number(values[index]);
    summary[key] = Number.isFinite(value) ? value : null;
  });
  return summary.median === null ? null : summary;
};

// The weeks at which the pmf's running total first reaches each level
const readWeekQuantiles = (forecast) => {
  const weeks =
    forecast?.predictions?.["peak week"] || forecast?.predictions?.values;
  const probabilities = forecast?.predictions?.probabilities;
  if (!Array.isArray(weeks) || !weeks.length) return null;
  if (!Array.isArray(probabilities) || !probabilities.length) {
    const middle = weeks[Math.floor(weeks.length / 2)];
    return { q025: null, q25: null, median: middle, q75: null, q975: null };
  }

  const order = weeks
    .map((week, index) => ({ week, p: Number(probabilities[index]) || 0 }))
    .sort((a, b) => a.week.localeCompare(b.week));
  const total = order.reduce((sum, entry) => sum + entry.p, 0) || 1;

  const summary = {};
  Object.entries(QUANTILE_KEYS).forEach(([key, level]) => {
    let running = 0;
    const hit = order.find((entry) => {
      running += entry.p / total;
      return running >= level - 1e-9;
    });
    summary[key] = (hit || order[order.length - 1]).week;
  });
  return summary;
};

// Every model with a peak-size forecast on `date`, sorted by name
export const getPeakModels = (peaks, date) =>
  Object.keys(peaks?.[date]?.[PEAK_SIZE_TARGET] || {}).sort();

// { model, size, week } for one model on one date. `week` is null for a
// model that forecast the peak's size but not its timing.
export const summarizePeakForecast = (peaks, date, model) => {
  const dateData = peaks?.[date];
  const size = readQuantileSummary(
    dateData?.[PEAK_SIZE_TARGET]?.[model]?.predictions,
  );
  if (!size) return null;
  return {
    model,
    size,
    week: readWeekQuantiles(dateData?.[PEAK_WEEK_TARGET]?.[model]),
  };
};

export const summarizePeakForecasts = (peaks, date, models) =>
  models
    .map((model) => summarizePeakForecast(peaks, date, model))
    .filter(Boolean);

// The flu season (August through July) a date belongs to, by its start year
export const getSeasonStartYear = (dateString) => {
  const [year, month] = dateString.split("-").map(Number);
  return month >= 8 ? year : year - 1;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const weeksBetween = (from, to) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      (7 * DAY_MS),
  );

// The highest observed week of a season ({ date, value }), from a location's
// ground truth
export const getObservedSeasonPeak = (groundTruth, seasonStartYear) => {
  const values = groundTruth?.["wk inc flu hosp"];
  if (!values || !groundTruth.dates) return null;
  let peak = null;
  groundTruth.dates.forEach((date, index) => {
    const value = Number(values[index]);
    // August through June, like the peak chart's season
    if (
      Number.isNaN(value) ||
      getSeasonStartYear(date) !== seasonStartYear ||
      date > `${seasonStartYear + 1}-06-30`
    ) {
      return;
    }
    if (!peak || value > peak.value) peak = { date, value };
  });
  return peak;
};

// The latest season before `currentSeason` with peak forecasts, with its
// forecast dates and observed peak. Null before there is one.
export const getPastPeakSeason = (peakDates, groundTruth, currentSeason) => {
  const past = peakDates
    .map(getSeasonStartYear)
    .filter((season) => season < currentSeason)
    .sort((a, b) => b - a)[0];
  if (past === undefined) return null;
  return {
    season: past,
    dates: peakDates.filter((date) => getSeasonStartYear(date) === past),
    observedPeak: getObservedSeasonPeak(groundTruth, past),
  };
};

// The date in `dates` nearest to `target` (the earlier one on a tie)
export const pickNearestDate = (dates, target) => {
  if (!dates.length) return null;
  const distance = (date) => Math.abs(weeksBetween(date, target));
  return dates.reduce((best, date) =>
    distance(date) < distance(best) ? date : best,
  );
};

// Whether an observed value falls inside a forecast's 50% / 95% interval
export const intervalHit = (size, value) => ({
  in50:
    size.q25 !== null && size.q75 !== null
      ? value >= size.q25 && value <= size.q75
      : false,
  in95:
    size.q025 !== null && size.q975 !== null
      ? value >= size.q025 && value <= size.q975
      : false,
});

const UTC_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// "2025-12-20" → "Dec 20, 2025"
export const formatStoryDate = (dateString) =>
  dateString ? UTC_DATE.format(new Date(`${dateString}T00:00:00Z`)) : "";

export const formatCount = (value) =>
  value === null || value === undefined
    ? "—"
    : Math.round(value).toLocaleString("en-US");
