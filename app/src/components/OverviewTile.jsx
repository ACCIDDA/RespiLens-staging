import { Anchor, Group, Stack, Text } from "@mantine/core";

// A front-page overview tile, laid out like a My Plots tile: title and grey
// subtitle, the chart or map, then a quiet link into the full view. No card;
// a hairline along the top sets tiles slightly apart.
const OverviewTile = ({
  title,
  subtitle = null,
  actionLabel,
  actionActive = false,
  onAction,
  locationLabel,
  children,
}) => (
  <Stack gap="xs" className="respilens-tile">
    <Stack gap={2}>
      <Text fw={600} size="md" lh={1.3}>
        {title}
      </Text>
      <Text size="xs" c="dimmed">
        {/* Kept even when empty so charts in a row line up */}
        {subtitle || "\u00a0"}
      </Text>
    </Stack>
    {children}
    <Group justify="space-between" align="center">
      {actionActive ? (
        <Text size="sm" c="dimmed">
          {actionLabel}
        </Text>
      ) : (
        <Anchor component="button" size="sm" fw={500} onClick={onAction}>
          {actionLabel} →
        </Anchor>
      )}
      <Text size="xs" c="dimmed">
        {locationLabel}
      </Text>
    </Group>
  </Stack>
);

export default OverviewTile;
