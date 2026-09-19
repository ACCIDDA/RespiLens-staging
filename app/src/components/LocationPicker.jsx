import { Text } from "@mantine/core";
import { useView } from "../hooks/useView";
import { useLocationOptions } from "../hooks/useLocationOptions";
import { getNsspTopLevelLocation } from "../utils/nsspGeo";
import InlinePicker from "./InlinePicker";

const displayName = (location) =>
  location.abbreviation === "US" ? "United States" : location.location_name;

// The page's location picker: L opens it, ArrowUp / ArrowDown step to the
// previous / next location in its order. On MetroCast and NSSP it picks
// the state; a second picker (MetroCityPicker, NsspCountyPicker) picks
// within it and takes the arrows first.
const LocationPicker = () => {
  const { selectedLocation, handleLocationSelect, viewType, currentDataset } =
    useView();
  const { locations, loading, error } = useLocationOptions(
    viewType,
    currentDataset,
  );

  const isMetro = viewType === "metrocast_forecasts";
  const current = locations.find(
    (location) => location.abbreviation === selectedLocation,
  );
  const selected =
    viewType === "nsspall"
      ? getNsspTopLevelLocation(selectedLocation)
      : (current?.parent ?? selectedLocation);

  const data = locations
    .filter((location) => !location.parent)
    .map((location) => ({
      value: location.abbreviation,
      label: displayName(location),
    }));

  return (
    <InlinePicker
      value={selected}
      data={data}
      onChange={handleLocationSelect}
      searchable
      shortcut="l"
      shortcutLabel={isMetro ? "Change state" : "Change location"}
      stepKeys
      placeholder={loading ? "…" : error ? "unavailable" : "a location"}
      aria-label="Select location"
    />
  );
};

// Second step of a MetroCast location: "in North Carolina, Triad Area".
// Renders nothing for states without cities.
export const MetroCityPicker = () => {
  const { selectedLocation, handleLocationSelect, viewType, currentDataset } =
    useView();
  const { locations } = useLocationOptions(viewType, currentDataset);

  const current = locations.find(
    (location) => location.abbreviation === selectedLocation,
  );
  const state = current?.parent ?? selectedLocation;
  const cities = locations.filter((location) => location.parent === state);
  if (!cities.length) return null;

  const data = [
    { value: state, label: "All (statewide)" },
    ...cities.map((city) => ({
      value: city.abbreviation,
      // "Triad Area, NC" → "Triad Area": the state is already named
      label: city.location_name.replace(/,\s*[A-Z]{2}$/, ""),
    })),
  ];

  return (
    <>
      <Text span inherit c="dimmed" fw={400}>
        ,
      </Text>{" "}
      <InlinePicker
        value={selectedLocation}
        data={data}
        onChange={handleLocationSelect}
        searchable
        stepKeys="first"
        aria-label="Select city"
      />
    </>
  );
};

export default LocationPicker;
