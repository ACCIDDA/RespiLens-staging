import { UnstyledButton } from "@mantine/core";

// The chart's marker shapes (Plotly symbol names) drawn in a 12px box, so a
// chip shows the exact mark its series gets on the chart
const MARKER_PATHS = {
  circle: <circle cx="6" cy="6" r="4.25" />,
  square: <rect x="2" y="2" width="8" height="8" />,
  diamond: <path d="M6 1.2 10.8 6 6 10.8 1.2 6Z" />,
  "triangle-up": <path d="M6 1.6 10.8 10 1.2 10Z" />,
  "triangle-down": <path d="M6 10.4 10.8 2 1.2 2Z" />,
  cross: <path d="M4.5 1.5h3v3h3v3h-3v3h-3v-3h-3v-3h3Z" />,
};

// A toggle for one chart series. The colour and marker shape live in the
// mark (always shown, so the user sees how a series will be drawn before
// turning it on); the label stays in ink. Selected: tinted fill, a border
// in the series colour and a filled mark. Unselected: a plain hairline chip
// with a hollow mark.
const SeriesToggleChip = ({
  color,
  symbol = "circle",
  selected,
  onClick,
  children,
}) => (
  <UnstyledButton
    className="respilens-series-chip"
    data-selected={selected || undefined}
    aria-pressed={selected}
    onClick={onClick}
    style={{ "--series-color": color }}
  >
    <svg
      className="respilens-series-chip-mark"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      {MARKER_PATHS[symbol] ?? MARKER_PATHS.circle}
    </svg>
    <span>{children}</span>
  </UnstyledButton>
);

// One chip per column, toggling membership in `selectedColumns`
const SeriesToggleChips = ({
  columns,
  selectedColumns,
  setSelectedColumns,
  colors,
  symbols = {},
  labels,
}) =>
  columns.map((column) => {
    const selected = selectedColumns.includes(column);
    return (
      <SeriesToggleChip
        key={column}
        color={colors[column]}
        symbol={symbols[column]}
        selected={selected}
        onClick={() =>
          setSelectedColumns(
            selected
              ? selectedColumns.filter((value) => value !== column)
              : [...selectedColumns, column],
          )
        }
      >
        {labels[column] || column}
      </SeriesToggleChip>
    );
  });

export default SeriesToggleChips;
