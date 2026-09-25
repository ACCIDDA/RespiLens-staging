import { Text, Tooltip } from "@mantine/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// "last fetched", not "updated": the timestamp is when RespiLens pulled
// the data, which is not always when the source last changed.
const LastFetched = ({ timestamp, label = "last fetched:" }) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const relativeTimeStr = dayjs(timestamp).fromNow();
  const fullTimestamp = date.toLocaleString(undefined, {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Text span inherit>
      {label}{" "}
      <Tooltip label={fullTimestamp} position="left" withArrow>
        <span
          style={{
            cursor: "help",
            textDecoration: "underline dotted",
            whiteSpace: "nowrap",
          }}
        >
          {relativeTimeStr}
        </span>
      </Tooltip>
    </Text>
  );
};

export default LastFetched;
