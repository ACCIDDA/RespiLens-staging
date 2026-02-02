import { SimpleGrid, Stack, Title, Paper } from '@mantine/core';
import PathogenOverviewGraph from './PathogenOverviewGraph';
import NHSNOverviewGraph from './NHSNOverviewGraph'
import Announcement from './Announcement'
import { useView } from '../hooks/useView';

const PathogenFrontPage = () => {
  const { selectedLocation } = useView();

  return (
    <Stack>
      <Announcement startDate={'2026-02-01'} endDate={'2026-02-28'} text={
        <span>
          Check out our new <a href="https://www.respilens.com/?view=metrocast_projs" style={{ color: 'inherit', fontWeight: 700 }}>Flu MetroCast forecasts</a>!
        </span>
      } announcementType={"update"} />
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
            <NHSNOverviewGraph location={selectedLocation}/>
          </SimpleGrid>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default PathogenFrontPage;
