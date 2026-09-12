import { SimpleGrid, Stack, Title, Paper, Anchor } from "@mantine/core";
import PathogenOverviewGraph from "./PathogenOverviewGraph";
import NHSNOverviewGraph from "./NHSNOverviewGraph";
import Announcement from "./Announcement";
import { useView } from "../hooks/useView";

const MyPlotsLink = () => {
  return (
    <span>
      Check out the new{" "}
      <Anchor
        href="/myplots"
        fw={700}
        c="blue.7"
        style={{ fontSize: "inherit", verticalAlign: "baseline" }}
      >
        My Plots
      </Anchor>{" "}
      feature, where you can assemble your own dashboard of saved plots.
    </span>
  );
};

const MetroCastLink = () => {
  const { setViewType } = useView();

  const handleClick = (e) => {
    e.preventDefault();
    setViewType("metrocast_forecasts");
  };

  return (
    <span>
      RespiLens now displays{" "}
      <Anchor
        component="button"
        onClick={handleClick}
        fw={700}
        c="blue.7"
        style={{ fontSize: "inherit", verticalAlign: "baseline" }}
      >
        flu MetroCast forecasts;
      </Anchor>{" "}
      metro area-level flu forecasts.
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
        endDate="2026-04-15"
        announcementType={"update"}
        text={<MetroCastLink />}
      />
      <Announcement
        id="new-myplots-feature"
        startDate="2026-04-06"
        endDate="2026-06-30"
        announcementType={"update"}
        text={<MyPlotsLink />}
      />
      <Announcement
        id={"hub-seasonal-warning-2026"}
        startDate={"2026-05-31"}
        endDate={"2026-11-10"}
        announcementType={"alert"}
        text={
          "Flu and RSV forecasts are currently paused because they are out of season. FluSight will resume influenza forecasts on October 7, 2026, while MetroCast (the local influenza forecast) will resume on November 4, 2026. The RSV Forecast Hub will start on September 23, 2026. COVID-19 forecasts are issued year-round and continue."
        }
      />
      <Paper shadow="sm" p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={3}>Explore forecasts by pathogen</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <PathogenOverviewGraph
              viewType="covid_forecasts"
              title="COVID-19"
              location={selectedLocation}
            />
            <PathogenOverviewGraph
              viewType="flu_forecasts"
              title="Flu"
              location={selectedLocation}
            />
            <PathogenOverviewGraph
              viewType="rsv_forecasts"
              title="RSV"
              location={selectedLocation}
            />
          </SimpleGrid>
        </Stack>
      </Paper>
      <Paper shadow="sm" p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={3}>Explore surveillance data</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <NHSNOverviewGraph location={selectedLocation} />
          </SimpleGrid>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default FrontPage;
