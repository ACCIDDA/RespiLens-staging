import { useState } from "react";
import {
  ActionIcon,
  Divider,
  Group,
  Kbd,
  Modal,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";

// `keys` are keyboard keys, or (with `gestures`) mouse gestures in words
const HelpRows = ({ rows, size, gestures = false, ...props }) => (
  <Stack gap="xs" {...props}>
    {rows.map(({ keys, label }) => (
      <Group key={label} justify="space-between" wrap="nowrap" gap="md">
        <Text size={size}>{label}</Text>
        <Group gap={4} wrap="nowrap">
          {keys.map((key) =>
            gestures ? (
              <Text key={key} size={size} c="dimmed" ta="right">
                {key}
              </Text>
            ) : (
              <Kbd key={key} size={size}>
                {key}
              </Kbd>
            ),
          )}
        </Group>
      </Group>
    ))}
  </Stack>
);

// The forecast-page shortcuts. Rows for controls a view doesn't have can be
// left out; the About page lists them all.
export const ShortcutList = ({
  hasTargets = true,
  hasDates = true,
  hasModels = true,
  hasIntervals = true,
  hasDownload = true,
  size = "sm",
  ...props
}) => {
  const rows = [
    { keys: ["L"], label: "Change location" },
    { keys: ["↑", "↓"], label: "Previous / next location" },
    hasTargets && { keys: ["T"], label: "Change target" },
    hasDates && { keys: ["←", "→"], label: "Earlier / later forecast date" },
    hasModels && { keys: ["M"], label: "Filter models" },
    hasIntervals && {
      keys: ["I"],
      label: "Cycle intervals: all, 50% + median, median",
    },
    { keys: ["R"], label: "Reset the view" },
    hasDownload && { keys: ["D"], label: "Download the chart" },
    { keys: ["Esc"], label: "Close a menu" },
    { keys: ["?"], label: "Show this help" },
  ].filter(Boolean);

  return <HelpRows rows={rows} size={size} {...props} />;
};

// What the mouse does on a chart. `singleDate`: charts showing one forecast
// date at a time (a click moves it rather than adding one).
export const MouseList = ({
  hasDates = true,
  singleDate = false,
  size = "sm",
  ...props
}) => {
  const rows = [
    hasDates &&
      (singleDate
        ? { keys: ["Click"], label: "Move the forecast date there" }
        : { keys: ["Click"], label: "Add a forecast date" }),
    hasDates && { keys: ["Drag a date line"], label: "Move that date" },
    hasDates &&
      !singleDate && {
        keys: ["Double-click a line"],
        label: "Remove that date",
      },
    { keys: ["Drag the minimap"], label: "Zoom and pan in time" },
  ].filter(Boolean);

  return <HelpRows rows={rows} size={size} gestures {...props} />;
};

// Mouse and keyboard help, under two small headings. `dragDates`: the chart
// takes clicks and drags on its date lines (useForecastDateDrag).
export const NavigationHelp = ({
  hasTargets = true,
  hasDates = true,
  hasModels = true,
  hasIntervals = true,
  hasDownload = true,
  dragDates = hasDates,
  singleDate = false,
  size = "sm",
  ...props
}) => (
  <Stack gap="md" {...props}>
    <Stack gap={6}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
        Mouse
      </Text>
      <MouseList hasDates={dragDates} singleDate={singleDate} size={size} />
    </Stack>
    <Stack gap={6}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
        Keyboard
      </Text>
      <ShortcutList
        hasTargets={hasTargets}
        hasDates={hasDates}
        hasModels={hasModels}
        hasIntervals={hasIntervals}
        hasDownload={hasDownload}
        size={size}
      />
    </Stack>
  </Stack>
);

// A small red info button for a chart's header. Its window describes the
// data source (`about`: { title, content }, optional) and how to navigate
// the chart; "?" opens it too.
export const ChartInfoButton = ({ about = null, ...helpProps }) => {
  const [opened, setOpened] = useState(false);
  useKeyboardShortcut("?", () => setOpened((open) => !open));

  return (
    <>
      <Tooltip label="About this chart" openDelay={300}>
        <ActionIcon
          variant="subtle"
          color="red"
          size="lg"
          onClick={() => setOpened(true)}
          aria-label="About this chart"
          aria-keyshortcuts="?"
        >
          <IconInfoCircle size={18} />
        </ActionIcon>
      </Tooltip>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={about?.title ?? "Navigating the chart"}
        size="lg"
        centered
      >
        <Stack gap="lg">
          {about && (
            <>
              <div>{about.content}</div>
              <Divider />
              <Title order={4}>Navigating the chart</Title>
            </>
          )}
          <NavigationHelp {...helpProps} />
        </Stack>
      </Modal>
    </>
  );
};

// "?" toggles the shortcut list (pages without a chart header, like the
// front page)
const KeyboardShortcutsModal = ({ enabled = true, ...listProps }) => {
  const [opened, setOpened] = useState(false);
  useKeyboardShortcut("?", () => setOpened((open) => !open), enabled);

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title="Keyboard shortcuts"
      size="sm"
      centered
    >
      <ShortcutList {...listProps} />
    </Modal>
  );
};

export default KeyboardShortcutsModal;
