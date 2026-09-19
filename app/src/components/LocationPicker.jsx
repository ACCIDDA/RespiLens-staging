import { useEffect } from "react";
import { useView } from "../hooks/useView";
import { useLocationOptions } from "../hooks/useLocationOptions";
import { getNsspTopLevelLocation } from "../utils/nsspGeo";
import InlinePicker from "./InlinePicker";

const displayName = (location) =>
  location.abbreviation === "US" ? "United States" : location.location_name;

const FORECAST_VIEWS = new Set([
  "fludetailed",
  "flu_forecasts",
  "flu_peak",
  "rsv_forecasts",
  "covid_forecasts",
  "metrocast_forecasts",
]);

// Keys typed into these belong to them (menus, search boxes, pickers)
const KEY_OWNERS =
  'input, textarea, select, [contenteditable="true"], [role="listbox"], [role="combobox"], [role="menu"], [role="option"]';

// `arrowKeys`: on forecast pages, ArrowUp / ArrowDown step to the previous /
// next location in the picker's order
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
      if (event.defaultPrevented || event.altKey || event.ctrlKey) return;
      if (event.metaKey || event.shiftKey) return;
      if (event.target.closest?.(KEY_OWNERS)) return;

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
