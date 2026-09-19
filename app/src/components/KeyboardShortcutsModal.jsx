import { useState } from "react";
import { Group, Kbd, Modal, Stack, Text } from "@mantine/core";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";

// "?" lists the keyboard shortcuts for the forecast page. Rows for controls
// the current view doesn't have are left out.
const KeyboardShortcutsModal = ({
  enabled = true,
  hasTargets = false,
  hasDates = false,
  hasModels = false,
}) => {
  const [opened, setOpened] = useState(false);
  useKeyboardShortcut("?", () => setOpened((open) => !open), enabled);

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
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title="Keyboard shortcuts"
      size="sm"
      centered
    >
      <Stack gap="xs">
        {rows.map(({ keys, label }) => (
          <Group key={label} justify="space-between" wrap="nowrap">
            <Text size="sm">{label}</Text>
            <Group gap={4} wrap="nowrap">
              {keys.map((key) => (
                <Kbd key={key} size="sm">
                  {key}
                </Kbd>
              ))}
            </Group>
          </Group>
        ))}
      </Stack>
    </Modal>
  );
};

export default KeyboardShortcutsModal;
