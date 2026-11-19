import { getChartInk } from "../constants/chart";
import { transformValueForScale } from "./scaleUtils";

// Highlights: points a narrative calls out on a chart, each drawn as a ring
// with a numbered label, and listed (with the same number) under the chart
// for readers who cannot see it. A highlight is
//   { x, y, label, detail?, ax?, ay? }
// `x` and `y` in the chart's own units (dates, values or categories);
// without `y` it marks the whole of `x` with a rule. With `y0` and `y1`
// instead it is a range: a vertical bar from `y0` to `y1` at `x` (`width`
// pixels wide), labelled beside its middle (or at `labelY`).
// `ax` / `ay` move the label away from the point (pixels; default above).

export const getHighlightColor = (colorScheme) =>
  colorScheme === "dark" ? "#ff922b" : "#d9480f";

// The highlights worth drawing: the ones with a place on the x axis
export const validHighlights = (highlights) =>
  (highlights || []).filter(
    (highlight) =>
      highlight &&
      highlight.label &&
      highlight.x !== null &&
      highlight.x !== undefined &&
      highlight.x !== "",
  );

const highlightLayer = (highlights, colorScheme, scale) => {
  const color = getHighlightColor(colorScheme);
  const ink = getChartInk(colorScheme);
  const toAxis = (value) =>
    (scale === "sqrt" || scale === "log2") && typeof value === "number"
      ? transformValueForScale(value, scale)
      : value;

  const isRange = (highlight) =>
    Number.isFinite(highlight.y0) && Number.isFinite(highlight.y1);
  const isPoint = (highlight) =>
    !isRange(highlight) &&
    highlight.y !== null &&
    highlight.y !== undefined &&
    highlight.y !== "";
  const points = highlights.filter(isPoint);
  const ranges = highlights.filter(isRange);
  const rules = highlights.filter(
    (highlight) => !isPoint(highlight) && !isRange(highlight),
  );
  const numberOf = (highlight) => highlights.indexOf(highlight) + 1;

  const ring = points.length
    ? [
        {
          type: "scatter",
          mode: "markers",
          x: points.map((highlight) => highlight.x),
          y: points.map((highlight) => toAxis(highlight.y)),
          marker: {
            symbol: "circle-open",
            size: 18,
            color,
            line: { width: 2.5, color },
          },
          cliponaxis: false,
          hoverinfo: "skip",
          showlegend: false,
          name: "Highlights",
        },
      ]
    : [];

  const label = (highlight) => ({
    text: `<b>${numberOf(highlight)}</b>  ${highlight.label}`,
    font: { size: 12, color: ink.text },
    bgcolor: ink.legendBg,
    bordercolor: color,
    borderwidth: 1.5,
    borderpad: 4,
    arrowcolor: color,
    arrowwidth: 1.5,
    arrowhead: 0,
  });

  const annotations = [
    ...points.map((highlight) => ({
      ...label(highlight),
      x: highlight.x,
      y: toAxis(highlight.y),
      xref: "x",
      yref: "y",
      showarrow: true,
      standoff: 10,
      ax: highlight.ax ?? 0,
      ay: highlight.ay ?? -44,
    })),
    ...ranges.map((highlight) => ({
      ...label(highlight),
      x: highlight.x,
      y: toAxis(highlight.labelY ?? (highlight.y0 + highlight.y1) / 2),
      xref: "x",
      yref: "y",
      showarrow: true,
      standoff: 4,
      ax: highlight.ax ?? 44,
      ay: highlight.ay ?? 0,
    })),
    ...rules.map((highlight) => ({
      ...label(highlight),
      x: highlight.x,
      y: 1,
      xref: "x",
      yref: "paper",
      yanchor: "bottom",
      showarrow: false,
    })),
  ];

  const bars = ranges.map((highlight) => ({
    type: "line",
    x0: highlight.x,
    x1: highlight.x,
    y0: toAxis(highlight.y0),
    y1: toAxis(highlight.y1),
    xref: "x",
    yref: "y",
    line: { color, width: highlight.width ?? 4 },
  }));
  const ruleLines = rules.map((highlight) => ({
    type: "line",
    x0: highlight.x,
    x1: highlight.x,
    y0: 0,
    y1: 1,
    xref: "x",
    yref: "paper",
    line: { color, width: 1.5, dash: "dot" },
  }));

  return { ring, annotations, shapes: [...ruleLines, ...bars] };
};

/**
 * A chart's traces and layout with a narrative's additions: first its
 * `customize` ({ traces, layout }, functions of what the chart drew and
 * { story, colorScheme, scale }), then its highlights on top.
 */
export const applyStoryChart = ({
  traces,
  layout,
  chart,
  colorScheme,
  scale,
}) => {
  if (!chart) return { traces, layout };
  const context = { story: chart.story, colorScheme, scale };
  let nextTraces = traces;
  let nextLayout = layout;
  if (chart.customize?.traces) {
    nextTraces = chart.customize.traces(nextTraces, context) || nextTraces;
  }
  if (chart.customize?.layout) {
    nextLayout = chart.customize.layout(nextLayout, context) || nextLayout;
  }

  const highlights = validHighlights(chart.highlights);
  if (!highlights.length) return { traces: nextTraces, layout: nextLayout };
  const { ring, annotations, shapes } = highlightLayer(
    highlights,
    colorScheme,
    scale,
  );
  return {
    traces: [...nextTraces, ...ring],
    layout: {
      ...nextLayout,
      annotations: [...(nextLayout.annotations || []), ...annotations],
      shapes: [...(nextLayout.shapes || []), ...shapes],
    },
  };
};
