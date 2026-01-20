import { SimpleGrid, Stack, Title, Paper } from '@mantine/core';
import PathogenOverviewGraph from './PathogenOverviewGraph';
import { useView } from '../hooks/useView';

const PathogenFrontPage = () => {
  const { selectedLocation } = useView();

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Title order={3}>Explore forecasts by pathogen</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          <PathogenOverviewGraph viewType="covid_projs" title="COVID-19" location={selectedLocation} />
          <PathogenOverviewGraph viewType="flu_projs" title="Flu" location={selectedLocation} />
          <PathogenOverviewGraph viewType="rsv_projs" title="RSV" location={selectedLocation} />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};

export default PathogenFrontPage;
