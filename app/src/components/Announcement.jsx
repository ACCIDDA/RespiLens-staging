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
    return sessionStorage.getItem(storageKey) === "true";
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
    sessionStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  const isAlert = announcementType === "alert";

  return (
    <Stack>
      <Paper
        p="sm"
        pl="md"
        radius="md"
        shadow="none"
        style={{
          // A flat tint with a single accent edge, rather than a gradient
          // inside a full outline.
          background: isAlert
            ? "var(--mantine-color-yellow-0)"
            : "var(--mantine-color-blue-0)",
          borderLeft: `3px solid ${
            isAlert
              ? "var(--mantine-color-yellow-5)"
              : "var(--mantine-color-blue-4)"
          }`,
        }}
      >
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <ThemeIcon
              variant="light"
              color={isAlert ? "yellow" : "blue"}
              radius="xl"
              size="sm"
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              {isAlert ? (
                <IconAlertSquareRounded size={14} />
              ) : (
                <IconSpeakerphone size={14} />
              )}
            </ThemeIcon>
            <Text
              size="sm"
              fw={450}
              lh={1.5}
              c={isAlert ? "yellow.9" : "blue.9"}
            >
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
