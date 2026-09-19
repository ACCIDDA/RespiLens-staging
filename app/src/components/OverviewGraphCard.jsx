import { Loader, Stack, Text } from "@mantine/core";
import Plot from "react-plotly.js";
import OverviewTile, { OVERVIEW_CHART_HEIGHT } from "./OverviewTile";

const OverviewGraphCard = ({
  title,
  subtitle = null,
  loading,
  loadingLabel = "Loading data...",
  error,
  errorLabel,
  traces,
  layout,
  emptyLabel = "No data available.",
  actionActive = false,
  onAction,
  locationLabel,
}) => {
  const hasTraces = Array.isArray(traces) && traces.length > 0;
  const showEmpty = !loading && !error && !hasTraces && emptyLabel;
  // Loading another location: keep the chart up, dimmed under a spinner,
  // so the tile does not collapse and reflow the page
  const showChart = hasTraces && !error;

  return (
    <OverviewTile
      title={title}
      subtitle={subtitle}
      actionActive={actionActive}
      onAction={onAction}
      locationLabel={locationLabel}
    >
      {loading && !showChart && (
        // Takes the chart's height, so the chart replaces it in place
        <Stack
          align="center"
          justify="center"
          gap="xs"
          h={OVERVIEW_CHART_HEIGHT}
        >
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {loadingLabel}
          </Text>
        </Stack>
      )}
      {!loading && error && (
        <Text size="sm" c="red">
          {errorLabel || error}
        </Text>
      )}
      {showChart && (
        <div
          className="respilens-view"
          data-loading={loading || undefined}
          style={{ width: "100%", height: OVERVIEW_CHART_HEIGHT }}
        >
          <Plot
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            data={traces}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
          />
          {loading && (
            <div className="respilens-chart-spinner" style={{ top: "50%" }}>
              <Loader size="sm" aria-label="Loading" />
            </div>
          )}
        </div>
      )}
      {showEmpty && (
        <Text size="sm" c="dimmed">
          {emptyLabel}
        </Text>
      )}
    </OverviewTile>
  );
};

export default OverviewGraphCard;
