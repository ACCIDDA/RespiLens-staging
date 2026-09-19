import { useEffect, useState } from "react";
import { getDataPath } from "../utils/paths";
import {
  NSSP_STATE_ABBREVIATION_TO_INFO,
  fetchNsspTopLevelLocations,
} from "../utils/nsspGeo";

const METRO_STATE_MAP = {
  Colorado: "CO",
  Georgia: "GA",
  Indiana: "IN",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Minnesota: "MN",
  "South Carolina": "SC",
  Texas: "TX",
  Utah: "UT",
  Virginia: "VA",
  "North Carolina": "NC",
  Oregon: "OR",
};

const normalizeLocationEntry = (entry) => {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const stateInfo = NSSP_STATE_ABBREVIATION_TO_INFO[entry];
    return {
      abbreviation: entry,
      location_name: stateInfo?.name || entry,
    };
  }

  if (Array.isArray(entry)) {
    const [locationName, abbreviation] = entry;
    return {
      abbreviation: abbreviation || locationName,
      location_name: locationName || abbreviation,
    };
  }

  if (typeof entry === "object") {
    return {
      ...entry,
      abbreviation: entry.abbreviation || entry.location || entry.location_name,
      location_name:
        entry.location_name || entry.abbreviation || entry.location,
    };
  }

  return null;
};

// Loads the ordered location list for the current view (states, MetroCast
// cities nested under their state, or NSSP top-level locations).
export const useLocationOptions = (viewType, currentDataset) => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController(); // controller prevents issues if you click away while locs are loading

    setStates([]);
    setLoading(true);

    const fetchStates = async () => {
      // different fetching/ordering if it is metrocast vs. other views
      try {
        const isMetro = viewType === "metrocast_forecasts";
        const directory = isMetro
          ? "flumetrocast"
          : currentDataset?.dataPath || "flusight";

        const manifestResponse = await fetch(
          getDataPath(`${directory}/metadata.json`),
          { signal: controller.signal },
        );

        if (!manifestResponse.ok)
          throw new Error(`Failed: ${manifestResponse.statusText}`);

        const metadata = await manifestResponse.json();
        const normalizedLocations = (metadata.locations || [])
          .map(normalizeLocationEntry)
          .filter(Boolean);
        let finalOrderedList = [];

        if (isMetro) {
          const locations = normalizedLocations;
          const statesOnly = locations.filter(
            (l) => !(l.location_name || "").includes(","),
          );
          const citiesOnly = locations.filter((l) =>
            (l.location_name || "").includes(","),
          );
          statesOnly.sort((a, b) =>
            a.location_name.localeCompare(b.location_name),
          );

          statesOnly.forEach((stateObj) => {
            finalOrderedList.push(stateObj);
            const code = METRO_STATE_MAP[stateObj.location_name];

            const children = citiesOnly
              .filter((city) => city.location_name.endsWith(`, ${code}`))
              .sort((a, b) => a.location_name.localeCompare(b.location_name))
              // `parent`: the state's location id
              .map((city) => ({ ...city, parent: stateObj.abbreviation }));

            finalOrderedList.push(...children);
          });

          const handledIds = finalOrderedList.map((l) => l.abbreviation);
          const leftovers = locations.filter(
            (l) => !handledIds.includes(l.abbreviation),
          );
          finalOrderedList.push(...leftovers);
        } else if (viewType === "nsspall") {
          finalOrderedList = await fetchNsspTopLevelLocations();
        } else {
          finalOrderedList = normalizedLocations.sort((a, b) => {
            const isA_Default = a.abbreviation === "US";
            const isB_Default = b.abbreviation === "US";
            if (isA_Default) return -1;
            if (isB_Default) return 1;
            return (a.location_name || "").localeCompare(b.location_name || "");
          });
        }

        setStates(finalOrderedList);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchStates();

    return () => controller.abort();
  }, [viewType, currentDataset]);

  return { locations: states, loading, error };
};
