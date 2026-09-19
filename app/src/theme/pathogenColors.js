// One identity colour per pathogen, used wherever a series *is* a pathogen
// (NHSN and NSSP surveillance lines, their pickers, the front-page tiles).
// Forecast charts keep the blue ensemble colour: there the series is a
// model, not a pathogen.
//
// Base steps are Mantine's open-color orange 8 / violet 7 / teal 8. As a
// set they pass the dataviz validator all-pairs on white (lightness band,
// chroma floor, >= 3:1 contrast, worst CVD dE 9.5, normal-vision dE 28.4),
// so the three can share any chart. None of them is close to the UI blue.
//
// Each pathogen also has a short ramp: when several columns of the same
// pathogen are on one chart (adult / pediatric / total, age bands), they
// take successive steps of that pathogen's hue instead of unrelated colours.
export const PATHOGEN_COLORS = {
  covid: {
    label: "COVID-19",
    color: "#e8590c",
    ramp: ["#e8590c", "#a8430a", "#fd9a4d", "#ffc078"],
  },
  flu: {
    label: "Influenza",
    color: "#7048e8",
    ramp: ["#7048e8", "#4a2fb0", "#9775fa", "#c0aefc"],
  },
  rsv: {
    label: "RSV",
    color: "#099268",
    ramp: ["#099268", "#05684a", "#20c997", "#8ce99a"],
  },
};

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

// Colour for every column a chart can show, as { column: hex }. Computed
// over all *available* columns, not the selected ones, so a series keeps
// its colour while others are toggled on and off. Within a pathogen the
// headline series ("Total <pathogen> Admissions", the default view) takes
// the base step, then other "Total ..." columns, then the rest.
const seriesPriority = (column) => {
  if (/^total (covid-19|influenza|rsv) admissions$/i.test(column.trim())) {
    return 0;
  }
  if (/total/i.test(column)) return 1;
  return 2;
};

export const assignSeriesColors = (columns = []) => {
  const byTotalFirst = [...columns].sort(
    (a, b) => seriesPriority(a) - seriesPriority(b),
  );
  const used = {};
  const colors = {};
  byTotalFirst.forEach((column) => {
    const pathogen = detectPathogen(column);
    const key = pathogen || "other";
    const i = used[key] ?? 0;
    used[key] = i + 1;
    if (pathogen === "combined") {
      colors[column] = COMBINED_RESPIRATORY_COLOR;
    } else if (pathogen) {
      const { ramp } = PATHOGEN_COLORS[pathogen];
      colors[column] = ramp[i % ramp.length];
    } else {
      colors[column] = NON_PATHOGEN_COLORS[i % NON_PATHOGEN_COLORS.length];
    }
  });
  return colors;
};
