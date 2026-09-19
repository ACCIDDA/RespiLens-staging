import { useState } from "react";
import { Group, Kbd, Modal, Stack, Text } from "@mantine/core";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";

// The forecast-page shortcuts. Rows for controls a view doesn't have can be
// left out; the About page lists them all.
export const ShortcutList = ({
  hasTargets = true,
  hasDates = true,
  hasModels = true,
  size = "sm",
  ...props
}) => {
  const rows = [
    { keys: ["L"], label: "Change location" },
    { keys: ["↑", "↓"], label: "Previous / next location" },
    hasTargets && { keys: ["T"], label: "Change target" },
    hasDates && { keys: ["←", "→"], label: "Earlier / later forecast date" },
    hasModels && { keys: ["M"], label: "Filter models" },
    { keys: ["Esc"], label: "Close a menu" },
    { keys: ["?"], label: "Show this list" },
  ].filter(Boolean);

  return (
    <Stack gap="xs" {...props}>
      {rows.map(({ keys, label }) => (
        <Group key={label} justify="space-between" wrap="nowrap">
          <Text size={size}>{label}</Text>
          <Group gap={4} wrap="nowrap">
            {keys.map((key) => (
              <Kbd key={key} size={size}>
                {key}
              </Kbd>
            ))}
          </Group>
        </Group>
      ))}
    </Stack>
  );
};

// "?" toggles the list on forecast pages
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
