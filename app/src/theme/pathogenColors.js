// One identity colour per pathogen, used wherever a series *is* a pathogen
// (NHSN and NSSP surveillance lines, their pickers, the front-page tiles).
// Forecast charts keep the blue ensemble colour: there the series is a
// model, not a pathogen.
//
// Base colours are Mantine's open-color orange 8 / violet 7 / teal 8. As a
// set they pass the dataviz validator all-pairs on white (lightness band,
// chroma floor, >= 3:1 contrast, worst CVD dE 9.5, normal-vision dE 28.4),
// so the three can share any chart. None of them is close to the UI blue.
//
// When several columns of one pathogen share a chart (adult / pediatric /
// total, age bands) they take the four steps of that pathogen's family -
// hue-shifted as well as lighter/darker, so they read apart: every pair
// within a family is >= 14.6 OKLab dE apart, and every step stays >= 18 from
// the other two families. Four steps is the most one family can hold at that
// separation, so each series also gets a marker shape (SERIES_SYMBOLS);
// consecutive series differ in both colour and shape.
export const PATHOGEN_COLORS = {
  covid: {
    label: "COVID-19",
    color: "#e8590c",
    // orange, light amber, raspberry, dark brown
    ramp: ["#e8590c", "#ffa94d", "#a61e4d", "#6b2408"],
  },
  flu: {
    label: "Influenza",
    color: "#7048e8",
    // violet, lavender, magenta, deep indigo
    ramp: ["#7048e8", "#b197fc", "#be4bdb", "#3b1f8f"],
  },
  rsv: {
    label: "RSV",
    color: "#099268",
    // teal-green, mint, lime, deep green
    ramp: ["#099268", "#63e6be", "#82c91e", "#0b5d3f"],
  },
};

// Plotly marker symbols, in assignment order. Six against four colours:
// a colour + shape pair only repeats every 12 series.
export const SERIES_SYMBOLS = [
  "circle",
  "square",
  "diamond",
  "triangle-up",
  "triangle-down",
  "cross",
];

// Marker size for shaped series: large enough that a square and a diamond
// read apart (the plain 5px dot of single-series charts does not)
export const SERIES_MARKER_SIZE = 7;

// All three respiratory pathogens combined
export const COMBINED_RESPIRATORY_COLOR = "#343a40";

// Series that are not about one pathogen (bed capacity, hospitals
// reporting): quiet hues that stay clear of the three pathogen colours.
const NON_PATHOGEN_COLORS = [
  "#1971c2",
  "#495057",
  "#c2255c",
  "#e67700",
  "#0c8599",
  "#5c940d",
];

// "covid" | "flu" | "rsv" for a series name or column key, "combined" when
// it names more than one pathogen, null when it names none.
export const detectPathogen = (name) => {
  const s = String(name).toLowerCase();
  const hits = [
    /covid/.test(s) && "covid",
    /influenza|\bflu\b/.test(s) && "flu",
    /rsv/.test(s) && "rsv",
  ].filter(Boolean);
  if (hits.length > 1) return "combined";
  return hits[0] || null;
};

export const getPathogenColor = (pathogen) =>
  PATHOGEN_COLORS[pathogen]?.color ?? null;

// Style for every column a chart can show, as { column: { color, symbol } }.
// Computed over all *available* columns, not the selected ones, so a series
// keeps its style while others are toggled on and off. Within a pathogen the
// headline series ("Total <pathogen> Admissions", the default view) takes
// the base colour and a circle, then other "Total ..." columns, then the
// rest; age bands in age order, so neighbouring ages differ in colour and
// shape.
const seriesPriority = (column) => {
  if (/^total (covid-19|influenza|rsv) admissions$/i.test(column.trim())) {
    return 0;
  }
  if (/total/i.test(column)) return 1;
  return 2;
};

// First age in a band ("0-4 years" -> 0, "75+ years" -> 75); unknown last
const ageKey = (column) => {
  const match = column.match(/(\d+)\s*(?:-|–|\+)\s*\d*\s*years/i);
  return match ? Number(match[1]) : Infinity;
};

export const assignSeriesStyles = (columns = []) => {
  const ordered = columns
    .map((column, index) => ({ column, index }))
    .sort(
      (a, b) =>
        seriesPriority(a.column) - seriesPriority(b.column) ||
        ageKey(a.column) - ageKey(b.column) ||
        a.index - b.index,
    )
    .map(({ column }) => column);
  const used = {};
  const styles = {};
  ordered.forEach((column) => {
    const pathogen = detectPathogen(column);
    const key = pathogen || "other";
    const i = used[key] ?? 0;
    used[key] = i + 1;
    let color;
    if (pathogen === "combined") {
      color = COMBINED_RESPIRATORY_COLOR;
    } else if (pathogen) {
      const { ramp } = PATHOGEN_COLORS[pathogen];
      color = ramp[i % ramp.length];
    } else {
      color = NON_PATHOGEN_COLORS[i % NON_PATHOGEN_COLORS.length];
    }
    styles[column] = {
      color,
      symbol: SERIES_SYMBOLS[i % SERIES_SYMBOLS.length],
    };
  });
  return styles;
};

// Colours only, as { column: hex }, for callers that don't draw markers
export const assignSeriesColors = (columns = []) =>
  Object.fromEntries(
    Object.entries(assignSeriesStyles(columns)).map(([column, style]) => [
      column,
      style.color,
    ]),
  );
