import {
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import LocationPicker from "../../LocationPicker";
import NSSPGeoMap from "../../NSSPGeoMap";
import { useView } from "../../../hooks/useView";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useLocationOptions } from "../../../hooks/useLocationOptions";
import { fetchNsspStatesGeoJson } from "../../../utils/nsspGeo";
import {
  NSSP_MAP_COLORS,
  NSSP_MAP_HEIGHTS,
  getNsspUsFeatureCallout,
} from "../../../utils/nsspMap";

// Pick the place a story is about, on the same map as the NSSP page. A
// click (or Enter on a focused state, or the heading's searchable picker,
// L to open) chooses it: on a slide with `advanceOnLocation` the story then
// moves straight on. Reads and sets the location through useView.
const StateMap = () => {
  const { selectedLocation, handleLocationSelect, viewType, currentDataset } =
    useView();
  const { locations } = useLocationOptions(viewType, currentDataset);
  const available = new Set(locations.map((entry) => entry.abbreviation));
  const {
    data: states,
    loading,
    error,
  } = useAsyncData(() => fetchNsspStatesGeoJson(), []);

  const code = (feature) => feature.properties?.STUSAB;
  const fill = (feature) =>
    !available.has(code(feature))
      ? NSSP_MAP_COLORS.unavailable
      : code(feature) === selectedLocation
        ? NSSP_MAP_COLORS.selected
        : NSSP_MAP_COLORS.base;

  return (
    <Stack gap="md">
      <Title
        order={3}
        fz={{ base: 20, sm: 24 }}
        fw={600}
        lh={1.35}
        style={{ textWrap: "balance" }}
      >
        Forecasts{" "}
        <Text span inherit c="dimmed" fw={400}>
          in
        </Text>{" "}
        <LocationPicker />
      </Title>

      <Group justify="space-between" align="center" gap="sm">
        <Text size="sm" c="dimmed">
          Click a state, or the whole country.
        </Text>
        {available.has("US") && (
          <Button
            size="xs"
            variant={selectedLocation === "US" ? "filled" : "default"}
            aria-pressed={selectedLocation === "US"}
            onClick={() => handleLocationSelect("US")}
          >
            United States
          </Button>
        )}
      </Group>

      {loading ? (
        <Center mih={320}>
          <Loader />
        </Center>
      ) : error ? (
        <Text size="sm" c="dimmed">
          The map could not load; choose a state in the heading instead.
        </Text>
      ) : (
        <NSSPGeoMap
          featureCollection={states}
          height={NSSP_MAP_HEIGHTS.usa}
          projectionKind="usa"
          displayHeight="min(62vh, 620px)"
          onFeatureClick={(feature) => handleLocationSelect(code(feature))}
          isFeatureClickable={(feature) => available.has(code(feature))}
          getFeatureKey={(feature) => feature.properties?.GEOID}
          getFeatureLabel={(feature) => feature.properties?.NAME}
          getFeatureFill={fill}
          getFeatureCallout={getNsspUsFeatureCallout}
          focusableFeatures
          ariaLabel="Map of US states: choose one"
        />
      )}
    </Stack>
  );
};

export default StateMap;
