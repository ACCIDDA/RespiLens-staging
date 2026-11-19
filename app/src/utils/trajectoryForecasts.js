// Summaries of weekly ("trajectory") forecasts: for one forecast date,
// target and model, the quantiles of every week forecast ahead, in a shape
// a sentence can quote. Works for every hub with quantile forecasts by
// horizon (FluSight, the COVID-19 and RSV hubs, Flu MetroCast).

import { formatCount, readQuantileSummary } from "./peakForecasts";

// { model, weeks: [{ horizon, date, q025, q25, median, q75, q975 }] },
// weeks in horizon order; `date` is the week the horizon forecasts
export const summarizeTrajectory = (forecasts, date, target, model) => {
  const predictions = forecasts?.[date]?.[target]?.[model]?.predictions;
  if (!predictions) return null;
  const weeks = Object.entries(predictions)
    .map(([horizon, prediction]) => {
      const summary = readQuantileSummary(prediction);
      return summary && prediction.date
        ? { horizon: Number(horizon), date: prediction.date, ...summary }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.horizon - b.horizon);
  return weeks.length ? { model, weeks } : null;
};

export const summarizeTrajectories = (forecasts, date, target, models) =>
  models
    .map((model) => summarizeTrajectory(forecasts, date, target, model))
    .filter(Boolean);

// Every model forecasting `target` on any of `dates`, sorted by name
export const getTrajectoryModels = (forecasts, dates, target) => {
  const models = new Set();
  dates.forEach((date) =>
    Object.keys(forecasts?.[date]?.[target] || {}).forEach((model) =>
      models.add(model),
    ),
  );
  return [...models].sort();
};

// The last observed week on or before `date`: { date, value }
export const getLastObserved = (groundTruth, target, date) => {
  const values = groundTruth?.[target];
  if (!values || !groundTruth.dates || !date) return null;
  for (let index = groundTruth.dates.length - 1; index >= 0; index -= 1) {
    const value = Number(values[index]);
    if (groundTruth.dates[index] <= date && Number.isFinite(value)) {
      return { date: groundTruth.dates[index], value };
    }
  }
  return null;
};

const weekAt = (summary, horizon) =>
  summary?.weeks.find((week) => week.horizon === horizon) || null;

// The furthest week the ensemble forecast, and how the other models' best
// guesses for that same week compare with its median and 50% interval
export const describeTrajectorySpread = (ensemble, members) => {
  const last = ensemble?.weeks.at(-1);
  if (!last) return null;
  const guesses = members
    .map((member) => ({
      model: member.model,
      week: weekAt(member, last.horizon),
    }))
    .filter((guess) => guess.week)
    .sort((a, b) => a.week.median - b.week.median);
  if (!guesses.length) return null;
  return {
    week: last,
    count: guesses.length,
    lowest: guesses[0],
    highest: guesses.at(-1),
    aboveMedian: guesses.filter((guess) => guess.week.median > last.median)
      .length,
    aboveInterval: guesses.filter((guess) => guess.week.median > last.q75)
      .length,
  };
};

// The week a forecast's median is highest, and the week its 95% interval
// reaches highest (a long-term forecast's view of the season)
export const describeTrajectoryHigh = (summary) => {
  if (!summary?.weeks.length) return null;
  const byMedian = [...summary.weeks].sort((a, b) => b.median - a.median)[0];
  const byUpper = [...summary.weeks]
    .filter((week) => week.q975 !== null)
    .sort((a, b) => b.q975 - a.q975)[0];
  return { median: byMedian, upper: byUpper || null };
};

// Rise or fall from the last observed week to the forecast's last week:
// { ratio, direction: "up" | "down" | "flat" }
export const describeTrend = (observed, summary) => {
  const last = summary?.weeks.at(-1);
  if (!observed || !last || !(observed.value > 0)) return null;
  const ratio = last.median / observed.value;
  return {
    ratio,
    direction: ratio > 1.1 ? "up" : ratio < 0.9 ? "down" : "flat",
  };
};

// Percent targets ("... pct") read as percentages, counts as counts
export const isPercentTarget = (target) => /pct$/.test(target || "");

export const formatTargetValue = (value, target) => {
  if (value === null || value === undefined) return "—";
  if (isPercentTarget(target)) {
    return `${Number(value).toFixed(value < 10 ? 1 : 0)}%`;
  }
  return formatCount(value);
};
