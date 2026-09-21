import {
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconClock,
  IconAdjustmentsCheck,
  IconLockSquareRounded,
  IconArrowRight,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import Seo from "../Seo";

const tools = [
  {
    title: "Forecast Checker",
    description:
      "Pick a respiratory illness forecasting hub and instantly visualize your forecast data. Compare with ground truth data and other submitting models.",
    icon: IconAdjustmentsCheck,
    href: "/toolbox/forecast-checker",
  },
  {
    title: "Reporting delay explorer",
    description:
      "Do you need to nowcast? What does your reporting delay distribution look like? Securely upload your reporting data to build your reporting triangle and answer these questions.",
    icon: IconClock,
    href: "/toolbox/reporting-triangle",
  },
  {
    title: "My Private Hub",
    description:
      "Drag and drop a Hub folder for a private dashboard visualization of all targets, models, dates, and locations. The processing happens in your browser, no data is sent our servers.",
    icon: IconLockSquareRounded,
    href: "/toolbox/my-private-hub",
  },
];

const ToolsPage = () => {
  return (
    <>
      <Seo
        title="RespiLens | Toolbox"
        description="Browse the RespiLens Toolbox, including Forecast Checker for private forecast visualization and the reporting delay explorer for nowcasting preparation."
        canonicalPath="/toolbox"
      />
      <Container size="sm" pt="md" pb="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>Toolbox</Title>
            <Text size="sm" c="dimmed">
              Lightweight infectious disease modeling utilities that run
              privately in your browser. No data leaves your computer.
            </Text>
          </Stack>

          {/* One tool per row: square box, icon left, arrow right */}
          <Stack gap="sm">
            {tools.map((tool) => (
              // The whole row is the link
              <Paper
                key={tool.title}
                component={Link}
                to={tool.href}
                withBorder
                radius={0}
                p="lg"
                className="respilens-tool-row"
              >
                <Group gap="lg" wrap="nowrap" align="center">
                  <ThemeIcon size={48} radius={0} variant="light" color="blue">
                    <tool.icon size={26} />
                  </ThemeIcon>
                  <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="lg">
                      {tool.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {tool.description}
                    </Text>
                  </Stack>
                  <IconArrowRight
                    size={22}
                    className="respilens-tool-row-arrow"
                  />
                </Group>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>
    </>
  );
};

export default ToolsPage;
