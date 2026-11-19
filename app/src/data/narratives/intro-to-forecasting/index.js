import { formatCount, formatStoryDate } from "../../../utils/peakForecasts";
import { getChartInk } from "../../../constants/chart";
import { transformValueForScale } from "../../../utils/scaleUtils";
// Made once by extract_sample_seasons.py (see there), never refreshed
import sampleSeasonsUrl from "./sample-seasons.json?url";
import {
  describeTrajectorySpread,
  describeTrend,
  formatTargetValue,
} from "../../../utils/trajectoryForecasts";

// A narrative is a list of slides read one after another. Each slide has a
// title, a `chapter` and a `short` name (or `layout: "cover"`: the
// full-width first page with the title, authors and logo) (the breadcrumb: Narratives ›
// shortTitle › chapter › short), prose (Markdown, or a function of the
// story's state returning it, so the text can quote the data on screen;
// keep it to a few sentences, the chart carries the rest) and a `visual`
// drawn beside it: "state-map" (with `advanceOnLocation`, a click on a
// state also moves on), "hub-links", "forecast" (the app's own
// chart, set up by `view`: which hub's data, which forecast date, which
// models, which intervals) or "chart" (a chart drawn from a blank canvas by
// the slide's `chart` function). A chart slide can call out points with
// `highlights`, and change the app's chart with `customize` (see
// SlideNarrativeViewer). `story` names the state the slides share (see
// SlideNarrativeViewer's STORIES); `requires` lists what must exist before
// a slide opens.

const seasonLabel = (season) =>
  `${season}–${String((season + 1) % 100).padStart(2, "0")}`;

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const shortDate = (date) => formatStoryDate(date).replace(/, \d{4}$/, "");

const shiftDays = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

// --- Weekly (trajectory) forecasts -----------------------------------------

// Before a hub's first forecast of the season, the chart shows its last
const trajectoryFreshness = (hub, hubName) => {
  if (hub.loading) return "";
  if (!hub.dateLabel) return `No ${hubName} forecasts here yet.`;
  return hub.fromPastSeason
    ? `No ${hubName} forecasts yet this season (${seasonLabel(hub.season)}); showing the last, from **${hub.dateLabel}**.`
    : "";
};

// "As of Oct 10, the ensemble expects 6,480 by Oct 31 (95%: 2,342–17,769),
// 1.7× the last observed week."
const ensembleTrajectorySentence = (hub) => {
  if (hub.loading || !hub.dateLabel) return "";
  if (!hub.ensemble) {
    return `No ensemble forecast on **${hub.dateLabel}**: try another date.`;
  }
  const last = hub.ensemble.weeks.at(-1);
  const value = (v) => formatTargetValue(v, hub.target);
  const trend = describeTrend(hub.observed, hub.ensemble);
  const change = trend
    ? trend.direction === "up"
      ? `, **${trend.ratio.toFixed(1)}×** the last observed week`
      : trend.direction === "down"
        ? `, **down ${Math.round((1 - trend.ratio) * 100)}%** from the last observed week`
        : ", about level with the last observed week"
    : "";
  return `As of ${shortDate(hub.date.value)}, the ensemble expects **${value(last.median)}** by ${shortDate(last.date)} (95% interval ${value(last.q025)}–${value(last.q975)})${change}.`;
};

const trajectorySpreadSentence = (hub) => {
  if (hub.loading || !hub.dateLabel) return "";
  const spread = describeTrajectorySpread(hub.ensemble, hub.members);
  if (!spread || spread.count < 2) return "";
  const { count, lowest, highest, aboveInterval } = spread;
  const value = (v) => formatTargetValue(v, hub.target);
  return `**${count} models** range from **${value(lowest.week.median)}** to **${value(highest.week.median)}**; **${aboveInterval}** sit above the ensemble's 50% interval.`;
};

// --- Peak forecasts ---------------------------------------------------------

const peakSentence = (story) => {
  const { peak } = story;
  if (story.hubs.flu.loading) return "";
  if (!peak.dateLabel) {
    return `No peak forecasts yet this season (${seasonLabel(peak.season)}); this chart fills in as they arrive.`;
  }
  if (!peak.ensemble) {
    return `No ensemble peak forecast on **${peak.dateLabel}**: try another date.`;
  }
  const { size, week } = peak.ensemble;
  return `As of ${shortDate(peak.date.value)}: a peak around **${shortDate(week?.median)}**, at about **${formatCount(size.median)}** admissions that week.`;
};

const lookBackText = (story) => {
  const { peak } = story;
  const { lookBack } = peak;
  if (!lookBack) return "No earlier season to look back on here yet.";
  const { observed, weeksBefore, ensemble, ensembleHit } = lookBack;
  const when =
    weeksBefore > 0 ? `, ${plural(weeksBefore, "week")} before the peak` : "";
  const lines = [
    `The ensemble's peak forecast a year earlier, on **${peak.pastDateLabel}**${when}. The **★** is the peak that came: **${formatCount(observed.value)}** on ${shortDate(observed.date)}.`,
  ];
  if (ensemble) {
    const ratio = observed.value / ensemble.size.median;
    const coverage = ensembleHit.in95
      ? "inside its 95% interval"
      : "outside its 95% interval";
    lines.push(
      ratio > 1.1
        ? `It came **${ratio.toFixed(1)}×** higher than the ensemble expected, ${coverage}.`
        : ratio < 0.9
          ? `It came **${(1 / ratio).toFixed(1)}×** lower than the ensemble expected, ${coverage}.`
          : `It came close to the ensemble's guess, ${coverage}.`,
    );
  }
  lines.push(
    `Across all ${lookBack.modelCount} models, **${lookBack.in95}** had it in their 95% interval.`,
  );
  return lines.join(" ");
};

// --- Flu MetroCast ----------------------------------------------------------

const metroWhere = (story) => {
  const { locationName, metroName, metroIsElsewhere } = story;
  if (!metroName) return "";
  if (!metroIsElsewhere) {
    return "Pick a **metro area** in the chart's title, or keep the whole state.";
  }
  return story.location === "US"
    ? `MetroCast covers states and cities, so this shows **${metroName}**: pick another place in the chart's title.`
    : `MetroCast doesn't cover ${locationName}, so this shows **${metroName}**: pick another place in the chart's title.`;
};

const metroLongSentence = (story) => {
  const { metroLong } = story;
  const hub = story.hubs.metro;
  if (hub.loading || !hub.dateLabel || !metroLong?.high) return "";
  const { median } = metroLong.high;
  return `It tops out at **${formatTargetValue(median.median, hub.target)}** around ${shortDate(median.date)}.`;
};

// --- Highlights and custom charts -------------------------------------------

// The first forecast slide: when the forecast was made, and its last
// week's 95% and 50% intervals as bars just past it
const weeklyHighlights = (story) => {
  const hub = story.hubs.flu;
  const last = hub.ensemble?.weeks.at(-1);
  const value = (v) => formatTargetValue(v, hub.target);
  const barX = last && shiftDays(last.date, 4);
  return [
    hub.date.value && {
      x: hub.date.value,
      label: "Forecast made",
      detail: `${hub.dateLabel}, with data up to the week before.`,
    },
    last && {
      x: barX,
      y0: last.q025,
      y1: last.q975,
      labelY: last.q975,
      width: 3,
      label: "95% interval",
      detail: `${value(last.q025)} to ${value(last.q975)} admissions in the week ending ${shortDate(last.date)}. A 95% prediction interval, if well calibrated, would contain the outcome about 19 times in 20.`,
    },
    last && {
      x: barX,
      y0: last.q25,
      y1: last.q75,
      width: 10,
      label: "50% interval",
      detail: `${value(last.q25)} to ${value(last.q75)} admissions. A well-calibrated 50% prediction interval would contain the outcome about half the time.`,
    },
  ];
};

// Slide 3, the app's chart changed: every model faded to a thin grey line,
// so the ensemble (drawn on top, bold) reads against the pack
const fadeAllButEnsemble = {
  traces: (traces, { story, colorScheme }) => {
    const ensemble = story.hubs.flu.ensembleModel;
    const grey =
      colorScheme === "dark" ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.28)";
    const isModel = (trace) => trace.legendgroup && trace.name !== "Observed";
    const faded = traces.map((trace) => {
      if (!isModel(trace)) return trace;
      if (trace.legendgroup === ensemble) {
        return { ...trace, line: { ...trace.line, width: 3.5 } };
      }
      return {
        ...trace,
        line: { ...trace.line, color: grey, width: 1.25 },
        marker: { ...trace.marker, color: grey, size: 4 },
      };
    });
    // The ensemble last, so it is drawn over the others
    return [
      ...faded.filter((trace) => trace.legendgroup !== ensemble),
      ...faded.filter((trace) => trace.legendgroup === ensemble),
    ];
  },
};

// Slide 4, a chart of our own: every model's best guess for the same week,
// lined up against the ensemble's intervals
const modelLineup = (story, { ink, accent }) => {
  const hub = story.hubs.flu;
  const last = hub.ensemble?.weeks.at(-1);
  const title = "Where each model lands";
  if (!last) {
    return {
      title,
      traces: [],
      empty: hub.loading
        ? "Loading forecasts…"
        : "No ensemble forecast on this date to line the models up against.",
    };
  }
  const rows = hub.members
    .map((member) => ({
      model: member.model,
      week: member.weeks.find((week) => week.horizon === last.horizon),
    }))
    .filter((row) => row.week)
    .sort((a, b) => a.week.median - b.week.median);
  const point = (list, color, name, size) => ({
    type: "scatter",
    mode: "markers",
    name,
    x: list.map((row) => row.week.median),
    y: list.map((row) => row.model),
    error_x: {
      type: "data",
      symmetric: false,
      array: list.map(
        (row) => (row.week.q75 ?? row.week.median) - row.week.median,
      ),
      arrayminus: list.map(
        (row) => row.week.median - (row.week.q25 ?? row.week.median),
      ),
      color,
      thickness: 1.5,
      width: 0,
    },
    marker: { color, size },
    hovertemplate: "<b>%{y}</b><br>Median %{x:,.0f}<extra></extra>",
  });
  const ensembleRow = { model: hub.ensembleModel, week: last };
  const order = [...rows, ensembleRow]
    .sort((a, b) => a.week.median - b.week.median)
    .map((row) => row.model);
  const week = formatStoryDate(last.date);
  return {
    title,
    subtitle: `Median and 50% interval, flu admissions in ${story.locationName}, week ending ${week}`,
    description: `Dot plot of ${rows.length} models' median forecasts for the week ending ${week}, from ${formatCount(rows[0]?.week.median)} to ${formatCount(rows.at(-1)?.week.median)}, against the ensemble's median of ${formatCount(last.median)} and 50% interval of ${formatCount(last.q25)} to ${formatCount(last.q75)}.`,
    height: Math.max(340, order.length * 18 + 90),
    traces: [
      point(rows, ink.soft, "Model median, 50% interval", 7),
      point([ensembleRow], "#1c7ed6", hub.ensembleModel, 10),
    ],
    layout: {
      showlegend: false,
      margin: { l: 8, r: 24, t: 12, b: 48 },
      xaxis: {
        title: { text: "Flu hospital admissions" },
        rangemode: "tozero",
        zeroline: false,
      },
      yaxis: {
        type: "category",
        categoryorder: "array",
        categoryarray: order,
        automargin: true,
        tickfont: { size: 11 },
        showgrid: false,
      },
      shapes: [
        {
          type: "rect",
          xref: "x",
          yref: "paper",
          x0: last.q25,
          x1: last.q75,
          y0: 0,
          y1: 1,
          fillcolor: "rgba(28, 126, 214, 0.12)",
          line: { width: 0 },
          layer: "below",
        },
        {
          type: "line",
          xref: "x",
          yref: "paper",
          x0: last.q975,
          x1: last.q975,
          y0: 0,
          y1: 1,
          line: { color: accent, width: 1.5, dash: "dot" },
        },
      ],
    },
  };
};

const lineupHighlights = (story) => {
  const hub = story.hubs.flu;
  const spread = describeTrajectorySpread(hub.ensemble, hub.members);
  if (!spread || spread.count < 2) return [];
  const { highest, week } = spread;
  return [
    {
      x: highest.week.median,
      y: highest.model,
      label: "Highest median",
      detail: `${highest.model}, ${(highest.week.median / week.median).toFixed(1)}× the ensemble's median.`,
      ax: -70,
      ay: 18,
    },
  ];
};

// Slide 7: the ensemble's guess then, beside the peak that came (the star)
const lookBackHighlights = (story) => {
  const ensemble = story.peak.lookBack?.ensemble;
  if (!ensemble?.week?.median) return [];
  return [
    {
      x: ensemble.week.median,
      y: ensemble.size.median,
      label: "Ensemble's best guess",
      detail: `${formatCount(ensemble.size.median)} around ${shortDate(ensemble.week.median)}.`,
      ax: 50,
      ay: -40,
    },
  ];
};

// Slide 9: the long-term median's high point, and how far above it the
// season could go
const medianHighHighlight = (story) => {
  const high = story.metroLong?.high;
  const target = story.hubs.metro.target;
  if (!high) return [];
  return [
    {
      x: high.median.date,
      y: high.median.median,
      label: "The median's high point",
      detail: `${formatTargetValue(high.median.median, target)}, week ending ${shortDate(high.median.date)}.`,
      ax: 50,
      ay: -30,
    },
  ];
};

// The last full-season slide: the median's high point, and the peak
// forecast from the simulated seasons
const peakHighlights = (story) => {
  const target = story.hubs.metro.target;
  return [
    ...medianHighHighlight(story),
    peakOf(story) && {
      x: peakOf(story).week.median,
      y: peakOf(story).size.median,
      label: fromLabel("Peak forecast", sampleSeasons(story)),
      detail: `${formatTargetValue(peakOf(story).size.median, target)} around ${shortDate(peakOf(story).week.median)}; even odds between ${formatTargetValue(peakOf(story).size.q25, target)} and ${formatTargetValue(peakOf(story).size.q75, target)}, ${shortDate(peakOf(story).week.q25)} to ${shortDate(peakOf(story).week.q75)}.`,
      ax: 60,
      ay: -24,
    },
  ];
};

// The full-season slide: a few of the long-term ensemble's sampled seasons
// (the sample-seasons.json snapshot), drawn over the app's chart. `from`
// names their forecast when the chart shows another one (the data may not
// have reached the snapshot's date yet, or the reader stepped back).
const sampleSeasons = (story) => {
  const hub = story.hubs.metro;
  const snapshot = story.snapshots.sampleSeasons;
  const kept = snapshot?.locations?.[hub.location]?.[hub.target];
  if (!kept) return null;
  const date = snapshot.reference_date;
  return { ...kept, from: date === hub.date.value ? null : shortDate(date) };
};

// "Sampled seasons", or "Sampled seasons (Oct 31 forecast)"
const fromLabel = (label, kept) =>
  kept.from ? `${label} (${kept.from} forecast)` : label;

// The ensemble's peak forecast, computed from all its sampled seasons
const peakOf = (story) => sampleSeasons(story)?.peak || null;

// The peak forecast as on the peak chart: a dot at the median peak, with
// thin bars for the 95% intervals and thick ones for the 50% intervals of
// its height and week
const peakTraces = (peak, color, toAxis, label) => {
  const { size, week } = peak;
  const bar = (x, y, width) => ({
    type: "scatter",
    mode: "lines",
    x,
    y: y.map(toAxis),
    line: { color, width, dash: "dash" },
    hoverinfo: "skip",
    legendgroup: "peak-forecast",
    showlegend: false,
  });
  return [
    bar([week.median, week.median], [size.q025, size.q975], 1.5),
    bar([week.q025, week.q975], [size.median, size.median], 1.5),
    bar([week.median, week.median], [size.q25, size.q75], 3.5),
    bar([week.q25, week.q75], [size.median, size.median], 3.5),
    {
      type: "scatter",
      mode: "markers",
      x: [week.median],
      y: [toAxis(size.median)],
      marker: { color, size: 11, line: { color: "#fff", width: 1.5 } },
      name: label,
      legendgroup: "peak-forecast",
      hovertemplate: `${label}<br>${shortDate(week.median)}: %{y:.1f}%<extra></extra>`,
    },
  ];
};

// The simulated seasons as thin light grey lines, under the app's own
// traces so the median stays on top; with `peak`, the peak forecast too
const seasonsLayer =
  ({ peak }) =>
  (traces, { story, colorScheme, scale }) => {
    const kept = sampleSeasons(story);
    if (!kept) return traces;
    const color =
      colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.22)"
        : "rgba(15, 23, 42, 0.2)";
    const toAxis = (value) =>
      scale === "sqrt" || scale === "log2"
        ? transformValueForScale(value, scale)
        : value;
    const seasons = kept.samples.map((values, index) => ({
      type: "scatter",
      mode: "lines",
      x: kept.dates,
      y: values.map(toAxis),
      line: { color, width: 1 },
      name: fromLabel("Simulated seasons", kept),
      legendgroup: "sampled-seasons",
      showlegend: index === 0,
      hovertemplate: `Simulated season<br>%{x|%b %d}: %{y:.1f}%<extra></extra>`,
    }));
    return [
      ...seasons,
      ...traces,
      ...(peak && kept.peak
        ? peakTraces(
            kept.peak,
            getChartInk(colorScheme).text,
            toAxis,
            fromLabel("Peak forecast", kept),
          )
        : []),
    ];
  };

// The app sizes its y axis to its own traces: stretch it to the simulated
// seasons (and the peak forecast's bars) so none is cut off
const seasonsRange =
  ({ peak }) =>
  (layout, { story, scale }) => {
    const kept = sampleSeasons(story);
    if (!kept || scale === "log10") return layout;
    const highest = Math.max(
      ...kept.samples.map((values) => Math.max(...values)),
      peak && kept.peak ? kept.peak.size.q975 : 0,
    );
    const top =
      scale === "sqrt" || scale === "log2"
        ? transformValueForScale(highest * 1.05, scale)
        : highest * 1.05;
    const current = layout.yaxis?.range;
    if (current && current[1] >= top) return layout;
    return {
      ...layout,
      yaxis: {
        ...layout.yaxis,
        range: [current?.[0] ?? 0, top],
        autorange: false,
      },
    };
  };

const withSampleSeasons = {
  traces: seasonsLayer({ peak: false }),
  layout: seasonsRange({ peak: false }),
};
const withSeasonsAndPeak = {
  traces: seasonsLayer({ peak: true }),
  layout: seasonsRange({ peak: true }),
};

// The median line's high, when it can be set against the snapshot (both
// from the same forecast)
const comparableLineHigh = (story, kept) =>
  kept.from ? null : story.metroLong?.high?.median?.median;

const sampleSeasonsSentence = (story) => {
  const kept = sampleSeasons(story);
  if (!kept) return "";
  const lineHigh = comparableLineHigh(story, kept);
  const above = lineHigh
    ? kept.samples.filter((values) => Math.max(...values) > lineHigh).length
    : null;
  return `The **grey lines** are ${kept.samples.length} of the ensemble's simulated seasons, drawn at random${kept.from ? ` from its **${kept.from}** forecast` : ""}. Each rises and falls on its own schedule${above !== null ? `, and **${above} of ${kept.samples.length}** peak higher than the median line ever goes` : ""}.`;
};

const peakFromSeasonsSentence = (story) => {
  const kept = sampleSeasons(story);
  if (!kept?.peak) return "";
  const { peak } = kept;
  const value = (v) => formatTargetValue(v, story.hubs.metro.target);
  const lineHigh = comparableLineHigh(story, kept);
  const ratio = lineHigh > 0 ? peak.size.median / lineHigh : null;
  return `The **dot** is the ensemble's **peak forecast**, from the peaks of all its seasons${kept.from ? ` (${kept.from} forecast)` : ""}: **${value(peak.size.median)}** around **${shortDate(peak.week.median)}**${ratio && ratio >= 1.2 ? `, ${ratio.toFixed(1)}× the median line's high` : ""}. The bars are its 50% and 95% intervals.`;
};

export const narrative = {
  id: "intro-to-forecasting",
  title: "An introduction to respiratory disease forecasting in the US",
  shortTitle: "Introduction to US forecasting",
  abstract:
    "Learn about respiratory disease forecasting efforts in the US, and how to read and interpret these forecasts.",
  // Names shown on the cover, in order (placeholders for now)
  authors: ["Author 1", "Author 2"],
  date: "2026-11-04",
  // The story reads its data as of this date (last week's forecasts when it
  // was written), so it reads the same whenever it is opened
  asOf: "2026-10-31",
  // Reading time, shown on the narratives list
  minutes: 20,
  tags: [
    "Introduction",
    "FluSight",
    "Flu MetroCast",
    "RSV",
    "COVID-19",
    "Ensembles",
  ],
  story: "intro",
  // Fixed data files made once for this narrative, read as story.snapshots
  snapshots: { sampleSeasons: sampleSeasonsUrl },
  slides: [
    {
      id: "cover",
      layout: "cover",
      title: "An introduction to respiratory disease forecasting in the US",
    },
    {
      id: "hubs",
      chapter: "Introduction",
      short: "Forecast hubs",
      title: "Forecasting respiratory diseases in the US",
      visual: "hub-table",
      // Teams and models: those sending forecasts for the Oct 31, 2026
      // round, leaving out the hub's own ensembles and baselines
      hubs: [
        {
          name: "FluSight",
          organizer: "US CDC",
          since: 2013,
          teams: 37,
          models: 65,
          resolution: "50 states, DC, Puerto Rico and the US",
          forecasts:
            "Flu hospital admissions (NHSN), flu ED visit share (NSSP), and the season's admission peak",
        },
        {
          name: "Flu MetroCast",
          organizer:
            "epiENGAGE (UT Austin, UMass Amherst), a CDC Insight Net center",
          since: 2025,
          teams: 9,
          models: 10,
          resolution: "89 metro areas in 14 states, and those states",
          forecasts:
            "Flu ED visit share (mainly NSSP; local systems for NYC and North Carolina), up to 4 weeks ahead and optionally to season's end",
        },
        {
          name: "RSV Forecast Hub",
          organizer: "US CDC",
          since: 2025,
          teams: 9,
          models: 15,
          resolution: "50 states, DC, Puerto Rico and the US",
          forecasts:
            "RSV hospital admissions (NHSN) and ED visit share (NSSP), up to 4 weeks ahead",
        },
        {
          name: "COVID-19 Forecast Hub",
          organizer: "US CDC (begun at UMass Amherst)",
          since: 2020,
          teams: 12,
          models: 17,
          resolution: "50 states, DC, Puerto Rico and the US",
          forecasts:
            "COVID-19 hospital admissions (NHSN) and ED visit share (NSSP), up to 4 weeks ahead",
        },
      ],
      body: `Four forecasting hubs bring together predictions for respiratory disease in the US: **FluSight**, **Flu MetroCast**, the **RSV Forecast Hub** and the **COVID-19 Forecast Hub**.

The targets differ: **hospital admissions** come from CDC's [National Healthcare Safety Network (NHSN)](https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Data-HRD-Metrics-by-Ju/ua7e-t2fy), while the **share of emergency department visits** generally comes from its [National Syndromic Surveillance Program (NSSP)](https://data.cdc.gov/Public-Health-Surveillance/NSSP-Emergency-Department-Visit-Trajectories-by-St/rdmq-nq56). MetroCast uses local surveillance data for New York City and North Carolina.

Participating teams submit forecasts in a shared format so the hubs can compare models, combine predictions and evaluate them against later observations. We start with FluSight, whose first decade is reviewed by [Hines et al. (2026, preprint)](https://doi.org/10.64898/2026.06.05.26354941).`,
    },
    {
      id: "place",
      chapter: "Introduction",
      short: "Choose a place",
      title: "Pick a place to follow",
      visual: "state-map",
      advanceOnLocation: true,
      body: `Forecasts can tell different stories in different places. Choose a state to follow as we move from a single flu forecast to model comparisons, past performance and other respiratory viruses.

**Click a state** to begin, or press **L** to search.`,
    },
    {
      id: "flu-weekly-ensemble",
      chapter: "FluSight",
      short: "Weekly forecast",
      title: "Last week's flu forecast",
      visual: "forecast",
      view: {
        hub: "flu",
        date: "flu",
        models: "ensemble",
        intervals: { median: true, ci50: true, ci95: true },
      },
      requires: ["location"],
      highlights: weeklyHighlights,
      body: (story) => {
        const hub = story.hubs.flu;
        return `We begin with a question: how many people might be **admitted to hospital with flu** in the coming weeks? This chart shows the **FluSight ensemble**, which combines forecasts from participating models. The dotted line marks **when the forecast was made**; the **50%** and **95% prediction intervals** show its uncertainty.

${trajectoryFreshness(hub, "FluSight")}

${ensembleTrajectorySentence(hub)}`;
      },
    },
    {
      id: "flu-weekly-models",
      chapter: "FluSight",
      short: "All models",
      title: "Many models behind one median",
      visual: "forecast",
      view: {
        hub: "flu",
        date: "flu",
        models: "all",
        intervals: { median: true, ci50: false, ci95: false },
      },
      requires: ["location"],
      customize: fadeAllButEnsemble,
      body: (
        story,
      ) => `The ensemble offers one summary, but the contributing models do not always agree. Each grey line is a model's median forecast; the bold line is the ensemble's median.

${trajectorySpreadSentence(story.hubs.flu)}

Look beyond the bold line to see the range of possible trajectories the models suggest.`,
    },
    {
      id: "flu-weekly-lineup",
      chapter: "FluSight",
      short: "Model lineup",
      title: "The models, lined up",
      visual: "chart",
      view: { hub: "flu", date: "flu" },
      requires: ["location"],
      chart: modelLineup,
      highlights: lineupHighlights,
      body: `Here, each model's median forecast is lined up for the **same target week**. The shaded band is the ensemble's **50% interval**; the dotted line marks the upper end of its **95% interval**.

A model to the right expects more admissions. This view makes disagreement easier to see, but we can judge accuracy only after that week's admissions are observed.`,
    },
    {
      id: "flu-weekly-history",
      chapter: "FluSight",
      short: "Two years",
      title: "Two years of forecasts",
      visual: "forecast",
      view: {
        hub: "flu",
        date: "flu",
        models: "ensemble",
        spread: { days: 730, count: 20 },
        intervals: { median: true, ci50: true, ci95: false },
      },
      requires: ["location"],
      body: `Now compare predictions with what happened. Each of these 20 ensemble forecasts begins on the date it was issued; later observations show where the forecast did and did not anticipate the path of admissions.

Published FluSight evaluations found that performance varies across seasons and places, and that uncertainty coverage declines at longer horizons. Ensembles have often performed well, but no approach leads everywhere or every year ([Reich et al., 2019](https://doi.org/10.1371/journal.pcbi.1007486); [Mathis et al., 2024](https://doi.org/10.1038/s41467-024-50601-9); [Hines et al., 2026, preprint](https://doi.org/10.64898/2026.06.05.26354941)). Add or move forecast dates in the chart header to inspect this place for yourself.`,
    },
    {
      id: "ensemble-peak",
      chapter: "FluSight",
      short: "Peak",
      title: "When will flu peak, and how high?",
      visual: "forecast",
      view: {
        hub: "peak",
        date: "peak",
        models: "ensemble",
        intervals: { median: true, ci50: true, ci95: true },
      },
      requires: ["location"],
      body: (
        story,
      ) => `Weekly forecasts show the near future. FluSight also asks **when the season will peak** and **how many admissions might occur in its busiest week**. Read left to right for timing and bottom to top for size; the bars show 50% and 95% prediction intervals.

${peakSentence(story)}`,
    },
    {
      id: "look-back",
      chapter: "FluSight",
      short: "Peak, last year",
      title: "The same forecast, a year ago",
      visual: "forecast",
      view: {
        hub: "peak",
        date: "peakPast",
        models: "ensemble",
        intervals: { median: true, ci50: true, ci95: true },
        showObservedPeak: true,
      },
      requires: ["location", "pastDate"],
      highlights: lookBackHighlights,
      body: (story) =>
        `A past forecast gives us a chance to check those peak predictions against the eventual result. ${lookBackText(story)}`,
    },
    {
      id: "metro-weeks",
      chapter: "Flu MetroCast",
      short: "4 weeks",
      title: "Zooming in on cities",
      visual: "forecast",
      view: {
        hub: "metro",
        date: "metro",
        models: "ensemble",
        span: "4wk",
        intervals: { median: true, ci50: true, ci95: true },
      },
      requires: ["location"],
      body: (story) => {
        const hub = story.hubs.metro;
        return `We can also look closer to home. **Flu MetroCast** forecasts metro areas using the **share of emergency department visits related to flu**. ${metroWhere(story)}

${trajectoryFreshness(hub, "MetroCast")}

${ensembleTrajectorySentence(hub)}`;
      },
    },
    {
      id: "metro-season",
      chapter: "Flu MetroCast",
      short: "Full season",
      title: "To the end of the season",
      visual: "forecast",
      view: {
        hub: "metro",
        date: "metro",
        models: "ensemble",
        span: "season",
        intervals: { median: true, ci50: false, ci95: false },
      },
      requires: ["location"],
      highlights: medianHighHighlight,
      body: (story) =>
        `MetroCast also looks **to the end of the season**. The line joins the ensemble's median for each week, offering a compact view of its longer outlook. ${metroLongSentence(story)}`,
    },
    {
      id: "metro-seasons",
      chapter: "Flu MetroCast",
      short: "Simulated seasons",
      title: "One median, many seasons",
      visual: "forecast",
      view: {
        hub: "metro",
        date: "metro",
        models: "ensemble",
        span: "season",
        intervals: { median: true, ci50: false, ci95: false },
      },
      requires: ["location"],
      highlights: medianHighHighlight,
      customize: withSampleSeasons,
      body: (
        story,
      ) => `A median line is assembled one week at a time. The grey lines show individual simulated seasons, each with its own timing and height. The median may therefore describe a path that none of those seasons follows exactly.

${sampleSeasonsSentence(story)}`,
    },
    {
      id: "metro-peak",
      chapter: "Flu MetroCast",
      short: "Peak forecast",
      title: "Where the peak may land",
      visual: "forecast",
      view: {
        hub: "metro",
        date: "metro",
        models: "ensemble",
        span: "season",
        intervals: { median: true, ci50: false, ci95: false },
      },
      requires: ["location"],
      highlights: peakHighlights,
      customize: withSeasonsAndPeak,
      body: (story) => `${peakFromSeasonsSentence(story)}

For the peak, use the **peak forecast**: it summarizes the peaks of individual simulated seasons rather than the highest point on the week-by-week median line.`,
    },
    {
      id: "rsv",
      chapter: "RSV",
      short: "Weekly forecast",
      title: "RSV: the same forecasts, another virus",
      visual: "forecast",
      view: {
        hub: "rsv",
        date: "rsv",
        models: "ensemble",
        intervals: { median: true, ci50: true, ci95: true },
      },
      requires: ["location"],
      body: (story) => {
        const hub = story.hubs.rsv;
        return `The same reading skills carry over to another virus. Here the forecast concerns **weekly RSV hospital admissions**.

${trajectoryFreshness(hub, "RSV")}

${ensembleTrajectorySentence(hub)}`;
      },
    },
    {
      id: "covid",
      chapter: "COVID-19",
      short: "Weekly forecast",
      title: "COVID-19, all year round",
      visual: "forecast",
      view: {
        hub: "covid",
        date: "covid",
        models: "ensemble",
        intervals: { median: true, ci50: true, ci95: true },
      },
      requires: ["location"],
      body: (story) => {
        const hub = story.hubs.covid;
        return `COVID-19 activity can rise outside winter, so its hub **forecasts throughout the year**. The median and intervals have the same meaning as in the flu and RSV charts.

${trajectoryFreshness(hub, "COVID-19")}

${ensembleTrajectorySentence(hub)}`;
      },
    },
    {
      id: "next",
      chapter: "Next steps",
      short: "Explore",
      title: "Where to go from here",
      visual: "hub-links",
      requires: ["location"],
      body: `As you explore, keep three habits in mind: **read the intervals** to see uncertainty, **compare models** to see disagreement, and **check past forecasts** against what happened.

Open a hub to try those questions with another place, date or disease.`,
    },
  ],
};

export default narrative;
