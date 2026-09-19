import { UnstyledButton } from "@mantine/core";

// A toggle for one chart series. The colour lives in the dot (always shown,
// so the user sees the colour a series will get before turning it on); the
// label stays in ink. Selected: tinted fill and a border in the series
// colour. Unselected: a plain hairline chip with a hollow dot.
const SeriesToggleChip = ({ color, selected, onClick, children }) => (
  <UnstyledButton
    className="respilens-series-chip"
    data-selected={selected || undefined}
    aria-pressed={selected}
    onClick={onClick}
    style={{ "--series-color": color }}
  >
    <span className="respilens-series-chip-dot" aria-hidden="true" />
    <span>{children}</span>
  </UnstyledButton>
);

// One chip per column, toggling membership in `selectedColumns`
const SeriesToggleChips = ({
  columns,
  selectedColumns,
  setSelectedColumns,
  colors,
  labels,
}) =>
  columns.map((column) => {
    const selected = selectedColumns.includes(column);
    return (
      <SeriesToggleChip
        key={column}
        color={colors[column]}
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
