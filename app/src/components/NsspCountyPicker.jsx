import { Text } from "@mantine/core";
import { useView } from "../hooks/useView";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  fetchNsspCountyAssignments,
  fetchNsspStateCoverage,
  getCountyDisplayLabel,
  getNsspStateAbbreviationFromLocation,
  normalizeCountyBasename,
} from "../utils/nsspGeo";
import InlinePicker from "./InlinePicker";

const ALL_COUNTIES = "__all__";

// Counties (each resolving to its HSA's data) of a state, alphabetically
const loadCountyOptions = async (stateAbbreviation) => {
  const coverage = await fetchNsspStateCoverage();
  if (!coverage[stateAbbreviation]?.hasCountyData) return [];
  const { countyAssignments } =
    await fetchNsspCountyAssignments(stateAbbreviation);
  return Object.values(countyAssignments)
    .map(({ countyName, locationId }) => ({
      value: normalizeCountyBasename(countyName),
      label: getCountyDisplayLabel(countyName),
      countyName,
      locationId,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Second step of the NSSP location: "in Colorado, Denver County". Renders
// nothing for the US or states without county-level data.
const NsspCountyPicker = () => {
  const { selectedLocation, handleLocationSelect, nsspCounty } = useView();
  const stateAbbreviation =
    getNsspStateAbbreviationFromLocation(selectedLocation);
  const hasCounties = Boolean(stateAbbreviation) && stateAbbreviation !== "US";
  const { data } = useAsyncData(
    hasCounties ? () => loadCountyOptions(stateAbbreviation) : null,
    [stateAbbreviation],
  );
  // The previous state's list stays around while the next one loads
  const counties = (data || []).filter((county) =>
    county.locationId.startsWith(`${stateAbbreviation}_`),
  );

  if (!hasCounties || !counties.length) return null;

  // Several counties share one HSA's data: show the one the user picked,
  // else the first county of the selected HSA
  const inLocation = counties.filter(
    (county) => county.locationId === selectedLocation,
  );
  const picked = nsspCounty && normalizeCountyBasename(nsspCounty);
  const current =
    inLocation.find((county) => county.value === picked) || inLocation[0];

  const options = [{ value: ALL_COUNTIES, label: "All counties" }, ...counties];

  return (
    <>
      <Text span inherit c="dimmed" fw={400}>
        ,
      </Text>{" "}
      <InlinePicker
        value={current?.value ?? ALL_COUNTIES}
        data={options}
        searchable
        stepKeys="first"
        onChange={(value) => {
          if (value === ALL_COUNTIES) {
            handleLocationSelect(`${stateAbbreviation}_All`);
            return;
          }
          const county = counties.find((entry) => entry.value === value);
          if (county)
            handleLocationSelect(county.locationId, county.countyName);
        }}
        aria-label="Select county"
      />
    </>
  );
};

export default NsspCountyPicker;
