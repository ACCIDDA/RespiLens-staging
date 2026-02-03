import { SimpleGrid, Stack, Title, Paper, Anchor } from '@mantine/core';
import PathogenOverviewGraph from './PathogenOverviewGraph';
import NHSNOverviewGraph from './NHSNOverviewGraph'
import Announcement from './Announcement'
import { useView } from '../hooks/useView';

const FluPeakLink = () => {
  const { setViewType } = useView();

  const handleClick = (e) => {
    e.preventDefault();
    setViewType('flu_peak');
  };

  return (
    <span>
      RespiLens now displays{' '}
      <Anchor
        component="button"
        onClick={handleClick}
        fw={700}
        c="blue.7"
        style={{ fontSize: 'inherit', veriticalAlign: 'baseline' }}
      >
        flu peak forecasts;
      </Anchor>
      {' '}forecasts for peak of the current influenza season.
    </span>
  )
}
const MetroCastLink = () => {
  const { setViewType } = useView();

  const handleClick = (e) => {
    e.preventDefault();
    setViewType('metrocast_forecasts');
  };

  return (
    <span>
      RespiLens now displays{' '}
      <Anchor 
        component="button" 
        onClick={handleClick}
        fw={700}
        c="blue.7" 
        style={{ fontSize: 'inherit', verticalAlign: 'baseline' }}
      >
        flu MetroCast forecasts;
      </Anchor>
      {' '}metro area-level flu forecasts.
    </span>
  );
};

const FrontPage = () => {
  const { selectedLocation } = useView();

  return (
    <Stack>
      <Announcement 
        id="new-metrocast-2026" 
        startDate="2026-02-01" 
        endDate="2026-03-15" 
        announcementType="update"
        text={<MetroCastLink />} 
      />
      <Announcement
        id="new-flu-peaks-2026"
        startDate="2026-02-01"
        endDate="2026-03-01"
        announcementType={"update"}
        text={<FluPeakLink />}
      />
      <Announcement id={"hub-seasonal-warning"} startDate={'2026-05-31'} endDate={'2026-11-10'} announcementType={'alert'} text={
        "Forecast hubs are out of season. Forecasting will begin again in Novembor."
      }
      />
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
          <Title order={3}>Explore surveillance data</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg:3 }} spacing="md">
            <NHSNOverviewGraph location={selectedLocation}/>
          </SimpleGrid>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default FrontPage;
