import { Anchor, Group, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

// Chart height in a tile: sized so both rows of the front page fit on a
// laptop screen, growing on taller ones
export const OVERVIEW_CHART_HEIGHT = "clamp(180px, calc(50vh - 205px), 280px)";

// A front-page overview tile, laid out like a My Plots tile: title with a
// "View" button beside it, the location and a grey subtitle under it, then
// the chart or map. No card; a hairline along the top sets tiles apart.
const OverviewTile = ({
  title,
  subtitle = null,
  actionActive = false,
  onAction,
  locationLabel,
  children,
}) => (
  <Stack gap="xs" className="respilens-tile">
    <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Text fw={600} size="md" lh={1.3}>
          {title}
        </Text>
        <Text size="xs" c="dimmed" lh={1.4}>
          {locationLabel && (
            <Text span size="sm" fw={600} c="var(--mantine-color-text)">
              {locationLabel}
            </Text>
          )}
          {locationLabel && subtitle && " · "}
          {/* Kept even when empty so charts in a row line up */}
          {subtitle || (!locationLabel && "\u00a0")}
        </Text>
      </Stack>
      {/* A quiet link on the title's line, not a filled button */}
      {actionActive ? (
        <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
          Viewing
        </Text>
      ) : (
        <Anchor
          component="button"
          size="sm"
          fw={500}
          underline="always"
          onClick={onAction}
          className="respilens-tile-action"
        >
          View
          <IconArrowRight size={14} stroke={2} />
        </Anchor>
      )}
    </Group>
    {children}
  </Stack>
);

export default OverviewTile;
