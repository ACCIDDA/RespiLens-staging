import { useView } from "../hooks/useView";
import { useLocationOptions } from "../hooks/useLocationOptions";
import { getNsspTopLevelLocation } from "../utils/nsspGeo";
import InlinePicker from "./InlinePicker";

const displayName = (location) =>
  location.abbreviation === "US" ? "United States" : location.location_name;

const LocationPicker = () => {
  const { selectedLocation, handleLocationSelect, viewType, currentDataset } =
    useView();
  const { locations, loading, error } = useLocationOptions(
    viewType,
    currentDataset,
  );

  const selected =
    viewType === "nsspall"
      ? getNsspTopLevelLocation(selectedLocation)
      : selectedLocation;
  const isMetro = viewType === "metrocast_forecasts";

  const data = locations.map((location) => ({
    value: location.abbreviation,
    label: displayName(location),
  }));

  return (
    <InlinePicker
      value={selected}
      data={data}
      onChange={handleLocationSelect}
      searchable
      placeholder={loading ? "…" : error ? "unavailable" : "a location"}
      renderOption={(item) => {
        const isCity = isMetro && item.label.includes(",");
        return (
          <span
            style={{
              paddingLeft: isCity ? 14 : 0,
              fontSize: isCity ? 13 : 14,
              fontWeight: isCity ? 400 : 500,
            }}
          >
            {item.label}
          </span>
        );
      }}
      aria-label="Select location"
    />
  );
};

export default LocationPicker;
