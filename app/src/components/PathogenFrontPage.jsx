import { Card, SimpleGrid, Stack, Text, Title, Button, Group, Paper, Divider } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useView } from '../hooks/useView';
import { DATASETS } from '../config';
import PathogenOverviewGraph from './PathogenOverviewGraph';

const PATHOGEN_KEYS = ['covid', 'flu', 'rsv'];

const PATHOGEN_DESCRIPTIONS = {
  covid: 'Weekly hospitalizations and emergency department visit projections for COVID-19.',
  flu: 'Seasonal influenza projections with detailed, projections, and peak views.',
  rsv: 'Weekly RSV hospitalization and emergency department visit projections.'
};

const PathogenFrontPage = () => {
  const { viewType, setViewType } = useView();

  const cards = PATHOGEN_KEYS
    .map((key) => DATASETS[key])
    .filter(Boolean)
    .map((dataset) => {
      const isActive = dataset.views.some((view) => view.value === viewType);
      const defaultView = dataset.defaultView || dataset.views[0]?.value;
      return {
        key: dataset.shortName,
        title: dataset.fullName,
        description: PATHOGEN_DESCRIPTIONS[dataset.shortName] || '',
        defaultView,
        isActive
      };
    });

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={3}>Explore Forecasts by Pathogen</Title>
          <Text c="dimmed" size="sm">
            Choose a pathogen to jump directly into the latest national forecasts.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {cards.map((card) => (
            <Card
              key={card.key}
              shadow="xs"
              padding="lg"
              radius="md"
              withBorder
              style={{
                borderColor: card.isActive ? 'var(--mantine-color-blue-5)' : undefined
              }}
            >
              <Stack gap="sm">
                <Stack gap={4}>
                  <Title order={4}>{card.title}</Title>
                  <Text size="sm" c="dimmed">
                    {card.description}
                  </Text>
                </Stack>
                <Group justify="space-between" align="center">
                  <Button
                    variant={card.isActive ? 'light' : 'filled'}
                    rightSection={<IconChevronRight size={16} />}
                    onClick={() => setViewType(card.defaultView)}
                  >
                    {card.isActive ? 'Viewing' : 'View forecasts'}
                  </Button>
                  {card.isActive && (
                    <Text size="xs" c="blue" fw={600} tt="uppercase">
                      Active
                    </Text>
                  )}
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
        <Divider />
        <Stack gap={4}>
          <Title order={4}>Latest 8-week snapshot</Title>
          <Text c="dimmed" size="sm">
            Showing the most recent 4 weeks of history and 4 weeks of projections.
          </Text>
        </Stack>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <PathogenOverviewGraph viewType="covid_projs" title="COVID-19" />
          <PathogenOverviewGraph viewType="flu_projs" title="Flu" />
          <PathogenOverviewGraph viewType="rsv_projs" title="RSV" />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};

export default PathogenFrontPage;
