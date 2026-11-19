import { Stack, Text } from "@mantine/core";

// The slide's highlights in words, numbered like their labels on the chart:
// what a sighted reader sees called out, for everyone (chart labels are not
// read by screen readers, and may fall outside a zoomed chart).
const ChartHighlights = ({ highlights }) => {
  if (!highlights.length) return null;
  return (
    <Stack gap={6} component="section" aria-label="Highlighted on the chart">
      <Text
        size="xs"
        fw={700}
        c="dimmed"
        tt="uppercase"
        style={{ letterSpacing: "0.06em" }}
      >
        Highlighted on the chart
      </Text>
      <ol className="respilens-highlight-list">
        {highlights.map((highlight, index) => (
          <li key={`${highlight.label}-${index}`}>
            <span className="respilens-highlight-number" aria-hidden="true">
              {index + 1}
            </span>
            <Text span size="sm">
              <strong>{highlight.label}</strong>
              {highlight.detail ? `: ${highlight.detail}` : ""}
            </Text>
          </li>
        ))}
      </ol>
    </Stack>
  );
};

export default ChartHighlights;
