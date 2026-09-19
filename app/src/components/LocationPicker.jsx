import { useEffect } from "react";
import { useView } from "../hooks/useView";
import { FORECAST_VIEWS, isOwnedKeyEvent } from "../hooks/useKeyboardShortcut";
import { useLocationOptions } from "../hooks/useLocationOptions";
import { getNsspTopLevelLocation } from "../utils/nsspGeo";
import InlinePicker from "./InlinePicker";

const displayName = (location) =>
  location.abbreviation === "US" ? "United States" : location.location_name;

// `arrowKeys`: on forecast pages, ArrowUp / ArrowDown step to the previous /
// next location in the picker's order, and L opens the picker
const LocationPicker = ({ arrowKeys = false }) => {
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

  const keysEnabled = arrowKeys && FORECAST_VIEWS.has(viewType);
  useEffect(() => {
    if (!keysEnabled || locations.length === 0) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (event.shiftKey || isOwnedKeyEvent(event)) return;

      const index = locations.findIndex(
        (location) => location.abbreviation === selectedLocation,
      );
      if (index === -1) return;
      const next = locations[index + (event.key === "ArrowUp" ? -1 : 1)];
      event.preventDefault();
      if (next) handleLocationSelect(next.abbreviation);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keysEnabled, locations, selectedLocation, handleLocationSelect]);

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
      shortcut={keysEnabled ? "l" : null}
      shortcutLabel="Change location"
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
