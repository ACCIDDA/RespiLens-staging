import {
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconBook } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { narratives } from "../../data/narratives/index.js";
import { formatStoryDate } from "../../utils/peakForecasts";
import Seo from "../Seo";

// The list of narratives: one row per story, laid out like the Toolbox
const NarrativeBrowser = () => (
  <>
    <Seo
      title="RespiLens | Narratives"
      description="Interactive stories that walk through respiratory disease forecasts: which hubs exist, what they forecast and how to read their forecasts."
      canonicalPath="/narratives"
    />
    <Container size="sm" pt="md" pb="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>Narratives</Title>
          <Text size="sm" c="dimmed">
            Step-by-step stories built on live RespiLens data.
          </Text>
        </Stack>

        <Stack gap="sm" component="ul" style={{ listStyle: "none" }} p={0}>
          {narratives.map((narrative) => (
            <li key={narrative.id}>
              <Paper
                component={Link}
                to={`/narratives/${narrative.id}`}
                withBorder
                radius={0}
                p="lg"
                className="respilens-tool-row"
                style={{ display: "block" }}
              >
                <Group gap="lg" wrap="nowrap" align="center">
                  <ThemeIcon size={48} radius={0} variant="light" color="blue">
                    <IconBook size={26} />
                  </ThemeIcon>
                  <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                    <Text component="h2" fw={700} size="lg" m={0}>
                      {narrative.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {narrative.abstract}
                    </Text>
                    {/* How long it takes, and when it was written */}
                    <Group justify="space-between" gap="sm">
                      <Text size="xs" c="dimmed">
                        {narrative.minutes} min
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatStoryDate(narrative.date)}
                      </Text>
                    </Group>
                  </Stack>
                  <IconArrowRight
                    size={22}
                    className="respilens-tool-row-arrow"
                    aria-hidden="true"
                  />
                </Group>
              </Paper>
            </li>
          ))}
        </Stack>
      </Stack>
    </Container>
  </>
);

export default NarrativeBrowser;
