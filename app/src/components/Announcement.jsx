import { useState } from "react";
import { Text, CloseButton } from "@mantine/core";
import { IconSpeakerphone, IconAlertTriangle } from "@tabler/icons-react";

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
  const Icon = isAlert ? IconAlertTriangle : IconSpeakerphone;

  // A flat full-width strip across the top of the page: the tint carries the
  // tone, so there is no box, border or pill around the message.
  return (
    <div
      className="respilens-notice"
      data-tone={isAlert ? "alert" : "update"}
      role="note"
    >
      <Icon size={16} stroke={2} className="respilens-notice-icon" />
      <Text size="sm" lh={1.55} className="respilens-notice-text">
        <strong>{isAlert ? "Alert" : "Update"}:</strong> {text}
      </Text>
      <CloseButton
        size="sm"
        iconSize={14}
        onClick={handleDismiss}
        variant="transparent"
        className="respilens-notice-close"
        aria-label="Dismiss announcement"
      />
    </div>
  );
};

export default Announcement;
