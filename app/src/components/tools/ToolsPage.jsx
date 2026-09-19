import {
  Badge,
  Container,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconClock,
  IconAdjustmentsCheck,
  IconLockSquareRounded,
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
    badge: "Visualization",
  },
  {
    title: "Reporting delay explorer",
    description:
      "Do you need to nowcast? What does your reporting delay distribution look like? Securely upload your reporting data to build your reporting triangle and answer these questions.",
    icon: IconClock,
    href: "/toolbox/reporting-triangle",
    badge: "Nowcasting",
  },
  {
    title: "My Private Hub",
    description:
      "Drag and drop a Hub folder for a private dashboard visualization of all targets, models, dates, and locations. The processing happens in your browser, no data is sent our servers.",
    icon: IconLockSquareRounded,
    href: "/toolbox/my-private-hub",
    badge: "Private",
  },
];

const ToolsPage = () => {
  return (
    <>
      <Seo
        title="RespiLens | Toolbox | Forecast Checker"
        description="Browse the RespiLens Toolbox, including Forecast Checker for private forecast visualization and the reporting delay explorer for nowcasting preparation."
        canonicalPath="/toolbox"
      />
      <Container size="xl" pt="md" pb="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>Toolbox</Title>
            <Text size="sm" c="dimmed">
              Lightweight infectious disease modeling utilities that run
              privately in your browser. No data leaves your computer.
            </Text>
          </Stack>

          {/* Same cards as the Forecast Checker's hub picker */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {tools.map((tool) => (
              // The whole card is the link
              <Paper
                key={tool.title}
                component={Link}
                to={tool.href}
                withBorder
                radius="xl"
                p="xl"
                className="respilens-hub-card"
              >
                <Stack align="center" gap="sm" ta="center" h="100%">
                  <ThemeIcon size={56} radius="xl" variant="light" color="blue">
                    <tool.icon size={28} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    {tool.title}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {tool.description}
                  </Text>
                  <Badge variant="light" color="gray" mt="auto">
                    {tool.badge}
                  </Badge>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </>
  );
};

export default ToolsPage;
