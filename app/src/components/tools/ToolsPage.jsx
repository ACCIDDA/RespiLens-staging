import {
  Badge,
  Button,
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
  IconTools,
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
      "Drag and drop your Hub folder for a private visualization display with all targets, models, dates, and locations.",
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
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Group align="center">
            <IconTools size={28} />
            <Title order={1}>RespiLens Toolbox</Title>
          </Group>
          <Text c="dimmed" size="lg">
            Lightweight infectious disease modeling utilities that run privately
            in your browser. No data leaves your computer.
          </Text>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {tools.map((tool) => (
              <Card key={tool.title} withBorder radius="md" padding="lg">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group>
                      <tool.icon size={22} />
                      <Title order={3}>{tool.title}</Title>
                    </Group>
                    <Badge variant="light">{tool.badge}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {tool.description}
                  </Text>
                  <Button
                    component={Link}
                    to={tool.href}
                    size="sm"
                    w="fit-content"
                  >
                    Open tool
                  </Button>
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
