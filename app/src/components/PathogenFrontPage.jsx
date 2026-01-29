import { SimpleGrid, Stack, Title, Paper } from '@mantine/core';
import PathogenOverviewGraph from './PathogenOverviewGraph';
import NHSNOverviewGraph from './NHSNOverviewGraph'
import { useView } from '../hooks/useView';

const PathogenFrontPage = () => {
  const { selectedLocation } = useView();

  return (
    <Stack>
      <Paper shadow="sm" p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={3}>Explore forecasts by pathogen</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <PathogenOverviewGraph viewType="covid_forecasts" title="COVID-19" location={selectedLocation} />
            <PathogenOverviewGraph viewType="flu_forecasts" title="Flu" location={selectedLocation} />
            <PathogenOverviewGraph viewType="rsv_forecasts" title="RSV" location={selectedLocation} />
          </SimpleGrid>
        </Stack>
      </Paper>
      <Paper shadow="sm" p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={3}>Explore ground truth data</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg:3 }} spacing="md">
            <NHSNOverviewGraph />
          </SimpleGrid>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default PathogenFrontPage;
