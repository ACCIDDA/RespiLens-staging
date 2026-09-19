import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
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

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {tools.map((tool) => (
              // The whole tile is the link
              <Card
                key={tool.title}
                component={Link}
                to={tool.href}
                withBorder
                radius="md"
                padding="lg"
                className="respilens-tile-link"
              >
                <Stack gap="sm" h="100%">
                  <Group justify="space-between">
                    <Group>
                      <tool.icon size={20} stroke={1.75} />
                      <Title order={3}>{tool.title}</Title>
                    </Group>
                    <Badge variant="light" color="gray">
                      {tool.badge}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {tool.description}
                  </Text>
                  <Text size="sm" c="blue.7" fw={500} mt="auto">
                    Open tool →
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </>
  );
};

export default ToolsPage;
