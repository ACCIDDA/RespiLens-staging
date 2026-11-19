import { Link } from "react-router-dom";
import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { buildForecastUrl } from "../../../utils/forecastRoutes";

// Where each part of the story continues in RespiLens: one card per page,
// opened at the reader's location (MetroCast at its area)
const PAGES = [
  {
    hub: "flu",
    viewType: "flu_forecasts",
    name: "FluSight: weekly forecasts",
    detail: "Flu hospital admissions, the next four weeks",
  },
  {
    hub: "flu",
    viewType: "flu_peak",
    name: "FluSight: peak forecasts",
    detail: "When flu will peak this season, and how high",
  },
  {
    hub: "metro",
    viewType: "metrocast_forecasts",
    name: "Flu MetroCast",
    detail: "Flu emergency department visits by metro area",
  },
  {
    hub: "rsv",
    viewType: "rsv_forecasts",
    name: "RSV Forecast Hub",
    detail: "RSV hospital admissions",
  },
  {
    hub: "covid",
    viewType: "covid_forecasts",
    name: "COVID-19 Forecast Hub",
    detail: "COVID-19 hospital admissions",
  },
];

const HubLinks = ({ story }) => (
  <Stack gap="md">
    <Title order={2} fz={{ base: 20, sm: 24 }} fw={600} lh={1.35}>
      Keep exploring{" "}
      <Text span inherit c="dimmed" fw={400}>
        {story.locationName
          ? `forecasts for ${story.locationName}`
          : "forecasts"}
      </Text>
    </Title>
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {PAGES.map((page) => {
        const location = story.hubs[page.hub]?.location;
        return (
          <Card
            key={page.viewType}
            component={Link}
            to={buildForecastUrl({ viewType: page.viewType, location })}
            withBorder
            radius="md"
            padding="lg"
            className="respilens-hub-link"
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={4}>
                <Text fw={600}>{page.name}</Text>
                <Text size="sm" c="dimmed">
                  {page.detail}
                  {page.hub === "metro" && story.metroName
                    ? ` (${story.metroName})`
                    : ""}
                </Text>
              </Stack>
              <IconArrowRight size={18} aria-hidden="true" />
            </Group>
          </Card>
        );
      })}
    </SimpleGrid>
  </Stack>
);

export default HubLinks;
