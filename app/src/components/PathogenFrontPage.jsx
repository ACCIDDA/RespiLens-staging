import { SimpleGrid, Stack, Text, Title, Paper } from '@mantine/core';
import PathogenOverviewGraph from './PathogenOverviewGraph';

const PathogenFrontPage = () => {
  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Title order={3}>Explore Forecasts by Pathogen</Title>
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
