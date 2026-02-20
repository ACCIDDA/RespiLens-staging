import { useState } from "react";
import {
  Paper,
  Group,
  Text,
  ThemeIcon,
  Stack,
  CloseButton,
} from "@mantine/core";
import { IconSpeakerphone, IconAlertSquareRounded } from "@tabler/icons-react";

// Announcement component params:
// `id` | unique ID for the announcement
// `startDate` | date for announcement to start being displayed
// `endDate` | date for announcement to stop being displayed
// `text` | text for the announcement
// `announcementType` | alert or update
const Announcement = ({ id, startDate, endDate, text, announcementType }) => {
  const storageKey = `dismissed-announcement-${id}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });

  const currentDate = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const validTypes = ["update", "alert"];
  if (!validTypes.includes(announcementType)) {
    console.error(`[Announcement Error]: Invalid type "${announcementType}".`);
  }

  const isVisible = currentDate >= start && currentDate <= end;
  if (!isVisible || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  const isAlert = announcementType === "alert";

  return (
    <Stack>
      <Paper
        withBorder
        p="xs"
        radius="md"
        shadow="xs"
        style={{
          background: isAlert
            ? "linear-gradient(45deg, #fef3c7, #fffbeb)"
            : "linear-gradient(45deg, var(--mantine-color-blue-light), var(--mantine-color-cyan-light))",
          borderColor: isAlert
            ? "#f59e0b"
            : "var(--mantine-color-blue-outline)",
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <ThemeIcon
              variant="light"
              color={isAlert ? "yellow" : "blue"}
              radius="xl"
              size="sm"
            >
              {isAlert ? (
                <IconAlertSquareRounded size={14} />
              ) : (
                <IconSpeakerphone size={14} />
              )}
            </ThemeIcon>
            <Text size="sm" fw={500} c={isAlert ? "yellow.9" : "blue.9"}>
              <strong>{isAlert ? "Alert" : "Update"}:</strong> {text}
            </Text>
          </Group>

          <CloseButton
            size="sm"
            iconSize={14}
            onClick={handleDismiss}
            variant="transparent"
            c={isAlert ? "yellow.9" : "blue.9"}
            aria-label="Dismiss announcement"
          />
        </Group>
      </Paper>
    </Stack>
  );
};

export default Announcement;
