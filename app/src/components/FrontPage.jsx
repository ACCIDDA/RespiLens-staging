import { SimpleGrid, Stack, Title, Anchor } from "@mantine/core";
import PathogenOverviewGraph from "./PathogenOverviewGraph";
import NHSNOverviewGraph from "./NHSNOverviewGraph";
import NSSPOverviewGraph from "./NSSPOverviewGraph";
import Announcement from "./Announcement";
import { useView } from "../hooks/useView";

const normalizeFrontPageLocation = (location) => {
  if (!location || location === "US_All") {
    return "US";
  }

  return location.includes("_") ? location.split("_")[0] : location;
};

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

const NsspViewLink = () => {
  return (
    <span>
      Check out our new{" "}
      <Anchor
        href="/surveillance/nssp"
        fw={700}
        c="blue.7"
        style={{ fontSize: "inherit", verticalAlign: "baseline" }}
      >
        NSSP view
      </Anchor>{" "}
      to visualize the CDC's National Syndromic Surveillance Program
      county-level data stream.
    </span>
  );
};

// Sections are separated by headings and whitespace rather than by a box
// drawn around each group.
const Section = ({ title, children }) => (
  <Stack gap="sm" mt="xs">
    <Title order={3}>{title}</Title>
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {children}
    </SimpleGrid>
  </Stack>
);

const FrontPage = () => {
  const { selectedLocation } = useView();
  const overviewLocation = normalizeFrontPageLocation(selectedLocation);

  return (
    <Stack gap="lg">
      <Announcement
        id="new-nssp-all-view"
        startDate="2026-05-20"
        endDate="2026-07-15"
        announcementType="update"
        text={<NsspViewLink />}
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
        startDate={"2026-06-01"}
        endDate={"2026-11-10"}
        announcementType={"alert"}
        text={
          "Flu and RSV forecasts are currently paused because they are out of season. FluSight will resume influenza forecasts on October 7, 2026, while MetroCast (the local influenza forecast) will resume on November 4, 2026. The RSV Forecast Hub will start on September 23, 2026. COVID-19 forecasts are issued year-round and continue."
        }
      />
      <Section title="Explore forecasts by pathogen">
        <PathogenOverviewGraph
          viewType="covid_forecasts"
          title="COVID-19"
          location={overviewLocation}
        />
        <PathogenOverviewGraph
          viewType="flu_forecasts"
          title="Flu"
          location={overviewLocation}
        />
        <PathogenOverviewGraph
          viewType="rsv_forecasts"
          title="RSV"
          location={overviewLocation}
        />
      </Section>

      <Section title="Explore surveillance data by source">
        <NHSNOverviewGraph location={overviewLocation} />
        <NSSPOverviewGraph />
      </Section>
    </Stack>
  );
};

export default FrontPage;
