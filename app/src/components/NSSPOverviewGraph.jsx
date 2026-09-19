import { useMemo } from "react";
import { Alert, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useView } from "../hooks/useView";
import { useAsyncData } from "../hooks/useAsyncData";
import NSSPGeoMap from "./NSSPGeoMap";
import OverviewTile from "./OverviewTile";
import {
  NSSP_STATE_ABBREVIATION_TO_INFO,
  fetchNsspCountiesGeoJson,
  fetchNsspCountyAssignments,
  getCountySelectionForFeature,
  fetchNsspStateCoverage,
  fetchNsspStatesGeoJson,
  getNsspStateAbbreviationFromLocation,
  isNsspStatewideLocation,
  isNsspUnitedStatesLocation,
} from "../utils/nsspGeo";
import {
  NSSP_MAP_COLORS,
  NSSP_MAP_HEIGHTS,
  getNsspUsFeatureCallout,
} from "../utils/nsspMap";

const EMPTY_COVERAGE = {};

const NSSPOverviewGraph = () => {
  const {
    selectedLocation,
    viewType: activeViewType,
    setViewAndLocation,
  } = useView();
  const {
    data: usMap,
    loading,
    error,
  } = useAsyncData(async () => {
    const [coverage, statesGeoJson] = await Promise.all([
      fetchNsspStateCoverage(),
      fetchNsspStatesGeoJson(),
    ]);
    return { coverage, statesGeoJson };
  }, []);
  const usMapData = usMap?.statesGeoJson ?? null;
  const stateCoverage = usMap?.coverage ?? EMPTY_COVERAGE;

  const resolvedNsspLocation = useMemo(() => {
    if (
      !selectedLocation ||
      selectedLocation === "US" ||
      selectedLocation === "US_All"
    ) {
      return "US_All";
    }

    const stateAbbreviation =
      getNsspStateAbbreviationFromLocation(selectedLocation);
    if (!NSSP_STATE_ABBREVIATION_TO_INFO[stateAbbreviation]) {
      return "US_All";
    }

    return selectedLocation.includes("_")
      ? selectedLocation
      : `${stateAbbreviation}_All`;
  }, [selectedLocation]);

  const selectedStateAbbreviation = useMemo(
    () => getNsspStateAbbreviationFromLocation(resolvedNsspLocation),
    [resolvedNsspLocation],
  );
  const stateInfo = NSSP_STATE_ABBREVIATION_TO_INFO[selectedStateAbbreviation];
  const isUnitedStates = isNsspUnitedStatesLocation(resolvedNsspLocation);
  const isStatewide = isNsspStatewideLocation(resolvedNsspLocation);
  const currentStateCoverage = stateCoverage[selectedStateAbbreviation] || {
    hasAnyData: false,
    hasCountyData: false,
  };
  const isActive = activeViewType === "nsspall";

  const needsStateMap =
    !loading &&
    !isUnitedStates &&
    Boolean(selectedStateAbbreviation) &&
    selectedStateAbbreviation !== "US" &&
    currentStateCoverage.hasAnyData &&
    currentStateCoverage.hasCountyData;

  const { data: stateMap, loading: detailLoading } = useAsyncData(
    needsStateMap
      ? async () => {
          const [countiesGeoJson, assignments] = await Promise.all([
            fetchNsspCountiesGeoJson(selectedStateAbbreviation),
            fetchNsspCountyAssignments(selectedStateAbbreviation),
          ]);
          return { countiesGeoJson, assignments };
        }
      : null,
    [needsStateMap, selectedStateAbbreviation],
  );
  const stateMapData = stateMap?.countiesGeoJson ?? null;
  const countyAssignmentData = stateMap?.assignments ?? null;

  const isStateClickable = (feature) =>
    Boolean(stateCoverage[feature.properties?.STUSAB]?.hasAnyData);

  const getStateFill = (feature) => {
    const featureStateAbbreviation = feature.properties?.STUSAB;
    const coverage = stateCoverage[featureStateAbbreviation];

    if (!coverage?.hasAnyData) {
      return NSSP_MAP_COLORS.unavailable;
    }

    return featureStateAbbreviation === selectedStateAbbreviation
      ? NSSP_MAP_COLORS.selected
      : NSSP_MAP_COLORS.base;
  };

  const handleStateClick = (feature) => {
    const nextStateAbbreviation = feature?.properties?.STUSAB;
    if (!stateCoverage[nextStateAbbreviation]?.hasAnyData) {
      return;
    }

    setViewAndLocation("nsspall", `${nextStateAbbreviation}_All`);
  };

  const handleCountyClick = (feature) => {
    if (!countyAssignmentData) {
      return;
    }

    const selection = getCountySelectionForFeature(
      feature,
      countyAssignmentData,
    );

    if (!selection.hasData || !selection.locationId) {
      return;
    }

    setViewAndLocation("nsspall", selection.locationId);
  };

  const isCountyClickable = (feature) =>
    Boolean(
      getCountySelectionForFeature(feature, countyAssignmentData).hasData,
    );

  const getCountyFill = (feature) => {
    if (!countyAssignmentData) {
      return NSSP_MAP_COLORS.base;
    }

    const selection = getCountySelectionForFeature(
      feature,
      countyAssignmentData,
    );

    if (!selection.hasData) {
      return NSSP_MAP_COLORS.unavailable;
    }

    const isSelectedByLocation = selection.locationId === resolvedNsspLocation;
    if (isSelectedByLocation) {
      return isStatewide ? NSSP_MAP_COLORS.active : NSSP_MAP_COLORS.selected;
    }

    return selection.isStatewideFallback
      ? NSSP_MAP_COLORS.fallback
      : NSSP_MAP_COLORS.base;
  };

  const hasUsMap = !loading && !error && usMapData?.features?.length;
  const hasStateMap = !detailLoading && stateMapData?.features?.length;
  const nsspViewTarget = currentStateCoverage.hasAnyData
    ? resolvedNsspLocation
    : "US_All";
  // The national entry map needs no caption; states name their county map
  const locationLabel = isUnitedStates
    ? null
    : currentStateCoverage.hasAnyData
      ? `${stateInfo?.name || selectedStateAbbreviation} county map`
      : `No NSSP data for ${stateInfo?.name || selectedStateAbbreviation}`;

  return (
    <OverviewTile
      title="NSSP data"
      subtitle="Emergency department visits"
      actionLabel={isActive ? "Viewing" : "View NSSP data"}
      actionActive={isActive}
      onAction={() => setViewAndLocation("nsspall", nsspViewTarget)}
      locationLabel={locationLabel}
    >
      {loading && (
        <Stack align="center" gap="xs" py="lg">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading NSSP map...
          </Text>
        </Stack>
      )}

      {!loading && error && (
        <Text size="sm" c="red">
          No NSSP map available
        </Text>
      )}

      {hasUsMap && isUnitedStates && (
        <Stack gap="xs">
          <div style={{ width: "100%", minHeight: 200 }}>
            <NSSPGeoMap
              featureCollection={usMapData}
              height={NSSP_MAP_HEIGHTS.usa}
              projectionKind="usa"
              onFeatureClick={handleStateClick}
              isFeatureClickable={isStateClickable}
              getFeatureKey={(feature) => feature.properties?.STUSAB}
              getFeatureLabel={(feature) => {
                const stateAbbreviation = feature.properties?.STUSAB;
                const stateName =
                  feature.properties?.NAME || stateAbbreviation || "State";
                return stateCoverage[stateAbbreviation]?.hasAnyData
                  ? stateName
                  : `${stateName}: no NSSP data available`;
              }}
              getFeatureFill={getStateFill}
              getFeatureCallout={getNsspUsFeatureCallout}
            />
          </div>
        </Stack>
      )}

      {!loading &&
        !error &&
        !isUnitedStates &&
        !currentStateCoverage.hasAnyData && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="yellow"
            variant="light"
          >
            No NSSP data is available for{" "}
            {stateInfo?.name || selectedStateAbbreviation}.
          </Alert>
        )}

      {!loading &&
        !error &&
        !isUnitedStates &&
        currentStateCoverage.hasAnyData &&
        !currentStateCoverage.hasCountyData && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="yellow"
            variant="light"
          >
            County-level NSSP data is not available for {stateInfo?.name}.
          </Alert>
        )}

      {!loading &&
        !error &&
        !isUnitedStates &&
        currentStateCoverage.hasAnyData &&
        currentStateCoverage.hasCountyData && (
          <Stack gap="xs">
            {detailLoading ? (
              <Stack align="center" gap="xs" py="lg">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loading {stateInfo?.name} NSSP map...
                </Text>
              </Stack>
            ) : hasStateMap ? (
              <div style={{ width: "100%", minHeight: 200 }}>
                <NSSPGeoMap
                  featureCollection={stateMapData}
                  height={NSSP_MAP_HEIGHTS.state}
                  projectionKind="state"
                  onFeatureClick={handleCountyClick}
                  isFeatureClickable={isCountyClickable}
                  getFeatureKey={(feature) => feature.properties?.GEOID}
                  getFeatureLabel={(feature) => {
                    const selection = getCountySelectionForFeature(
                      feature,
                      countyAssignmentData,
                    );
                    const countyName = feature.properties?.NAME || "County";

                    if (!selection.hasData) {
                      return `${countyName}: no NSSP data available`;
                    }

                    return selection.isStatewideFallback
                      ? `${countyName}: uses statewide NSSP data`
                      : countyName;
                  }}
                  getFeatureFill={getCountyFill}
                />
              </div>
            ) : (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="yellow"
                variant="light"
              >
                County-level NSSP data is not available for {stateInfo?.name}.
              </Alert>
            )}
          </Stack>
        )}
    </OverviewTile>
  );
};

export default NSSPOverviewGraph;
