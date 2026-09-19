import { Loader, Stack, Text } from "@mantine/core";
import Plot from "react-plotly.js";
import OverviewTile from "./OverviewTile";

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
  actionLabel,
  actionActive = false,
  onAction,
  locationLabel,
}) => {
  const hasTraces = Array.isArray(traces) && traces.length > 0;
  const showEmpty = !loading && !error && !hasTraces && emptyLabel;

  return (
    <OverviewTile
      title={title}
      subtitle={subtitle}
      actionLabel={actionLabel}
      actionActive={actionActive}
      onAction={onAction}
      locationLabel={locationLabel}
    >
      {loading && (
        <Stack align="center" gap="xs" py="lg">
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
      {!loading && !error && hasTraces && (
        <div style={{ width: "100%", height: 240, minHeight: 200 }}>
          <Plot
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            data={traces}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
          />
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
