import { Group, Kbd } from "@mantine/core";

// Tooltip label that names an action and the key that triggers it
const ShortcutHint = ({ label, shortcut }) => (
  <Group gap={8} wrap="nowrap">
    <span>{label}</span>
    <Kbd size="xs">{shortcut?.toUpperCase()}</Kbd>
  </Group>
);

export default ShortcutHint;
