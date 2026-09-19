import { useState, useEffect } from "react";
import {
  Title,
  Text,
  Stack,
  ThemeIcon,
  Center,
  Box,
  SimpleGrid,
  Group,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconChartScatter,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { getSavedPlots, deletePlot } from "../../utils/plotStorage";
import { fetchNsspLocationLabel } from "../../utils/nsspGeo";
import { resolvePlotLocationDisplayName } from "../../utils/plotLocationDisplay";
import MiniPlot from "./MiniPlot";
import Seo from "../Seo";
import { getDatasetTitleFromView } from "../../utils/datasetUtils";
import { targetDisplayNameMap } from "../../utils/mapUtils";

const normalizeLabel = (value = "") =>
  value
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b(forecasts?|forecast hub|hub|surveillance|data|view)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const MyPlots = () => {
  const [userSavedPlots, setUserSavedPlots] = useState([]);
  const [plotMetadata, setPlotMetadata] = useState({});
  const [plotLocationLabels, setPlotLocationLabels] = useState({});

  useEffect(() => {
    const plots = getSavedPlots();
    setUserSavedPlots(plots);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadNsspLabels = async () => {
      const nsspPlots = userSavedPlots.filter(
        (plot) => plot.viewType === "nsspall" && plot.settings?.location,
      );

      if (nsspPlots.length === 0) {
        if (isActive) {
          setPlotLocationLabels({});
        }
        return;
      }

      const resolvedEntries = await Promise.all(
        nsspPlots.map(async (plot) => [
          plot.id,
          await fetchNsspLocationLabel(plot.settings.location),
        ]),
      );

      if (isActive) {
        setPlotLocationLabels(Object.fromEntries(resolvedEntries));
      }
    };

    loadNsspLabels();

    return () => {
      isActive = false;
    };
  }, [userSavedPlots]);

  const handleDelete = (id) => {
    if (deletePlot(id)) {
      setUserSavedPlots(getSavedPlots());
    }
  };

  const hasPlots = userSavedPlots.length > 0;
  const plotCount = userSavedPlots.length;

  const gridConfig = (() => {
    if (plotCount <= 1) {
      return {
        cols: { base: 1, md: 1, xl: 1 },
        plotHeight: 500,
      };
    }

    if (plotCount === 2) {
      return {
        cols: { base: 1, md: 2, xl: 2 },
        plotHeight: 360,
      };
    }

    if (plotCount === 3) {
      return {
        cols: { base: 1, md: 2, xl: 3 },
        plotHeight: 300,
      };
    }

    if (plotCount === 4) {
      return {
        cols: { base: 1, md: 2, xl: 2 },
        plotHeight: 250,
      };
    }

    return {
      cols: { base: 1, md: 2, xl: 3 },
      plotHeight: 210,
    };
  })();

  const handleMetadataLoad = (plotId, metadata) => {
    setPlotMetadata((current) => {
      if (
        current[plotId]?.location_name === metadata?.location_name &&
        current[plotId]?.dataset === metadata?.dataset
      ) {
        return current;
      }

      return {
        ...current,
        [plotId]: metadata,
      };
    });
  };

  // Spelled out like the dashboard's location picker
  const getPlotLocationLabel = (plot) => {
    const label = resolveLocationLabel(plot);
    return label === "US" ? "United States" : label;
  };

  const resolveLocationLabel = (plot) => {
    if (plot.locationDisplayName) {
      return plot.locationDisplayName;
    }

    if (plotMetadata[plot.id]?.location_name) {
      return plotMetadata[plot.id].location_name;
    }

    if (plot.viewType === "nsspall") {
      return plotLocationLabels[plot.id] || plot.settings.location;
    }

    if (plot.settings.location === "US") {
      return "United States";
    }

    const resolvedLocation = resolvePlotLocationDisplayName(
      plot.settings.location,
    );

    return resolvedLocation === plot.settings.location
      ? plot.settings.location.toUpperCase()
      : resolvedLocation;
  };

  const pageContainerStyle = {
    width: "100%",
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "var(--mantine-color-body)",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: "16px 24px 40px",
  };

  return (
    <>
      <Seo
        title="RespiLens | My Plots"
        description="Save and revisit personalized RespiLens respiratory disease forecast visualizations in your browser."
        canonicalPath="/myplots"
      />
      <Box style={pageContainerStyle}>
        {!hasPlots ? (
          <Center style={{ flex: 1, width: "100%" }}>
            <Stack align="center" gap="sm" maw={440} ta="center">
              <ThemeIcon size={56} variant="light" color="gray" radius="xl">
                <IconChartScatter size={28} />
              </ThemeIcon>
              <Title order={2} fz={22} fw={600}>
                No saved plots yet
              </Title>
              <Text size="sm" c="dimmed">
                Use the save icon above any chart to keep that view here, with
                its location, dates and models.
              </Text>
              <Text size="xs" c="dimmed">
                Plots are stored locally in your browser.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack
            style={{
              width: "100%",
              maxWidth: "1400px",
            }}
            gap="lg"
          >
            <Stack gap={4}>
              <Title order={2} fz={{ base: 20, sm: 24 }} fw={600}>
                My Plots
              </Title>
              <Text size="sm" c="dimmed">
                {plotCount} saved · stored in this browser
              </Text>
            </Stack>

            <Box style={{ width: "100%" }}>
              <SimpleGrid
                cols={gridConfig.cols}
                spacing="xl"
                verticalSpacing={40}
              >
                {userSavedPlots.map((plot) => {
                  const metadata = plotMetadata[plot.id];
                  const locationName = getPlotLocationLabel(plot);
                  const pathogenLabel =
                    getDatasetTitleFromView(plot.viewType) ||
                    metadata?.dataset ||
                    plot.viewDisplayName;
                  const showViewBadge =
                    normalizeLabel(plot.viewDisplayName) !==
                    normalizeLabel(pathogenLabel);

                  const isSeries =
                    plot.viewType === "nhsnall" || plot.viewType === "nsspall";
                  const what = isSeries
                    ? pathogenLabel
                    : targetDisplayNameMap[plot.settings.target] ||
                      plot.settings.target ||
                      pathogenLabel;
                  const models = plot.settings.models || [];
                  const details = [
                    isSeries ? null : pathogenLabel,
                    // Only views the title does not already imply
                    showViewBadge &&
                    ["fludetailed", "flu_peak"].includes(plot.viewType)
                      ? plot.viewDisplayName
                      : null,
                    !isSeries && plot.settings.dates?.length
                      ? `forecast ${plot.settings.dates.join(", ")}`
                      : null,
                    !isSeries && models.length
                      ? `${models.length} model${models.length > 1 ? "s" : ""}`
                      : null,
                    isSeries && plot.settings.columns?.length
                      ? `${plot.settings.columns.length} series`
                      : null,
                  ].filter(Boolean);

                  return (
                    <Stack key={plot.id} gap={6} className="respilens-tile">
                      <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                        gap="xs"
                      >
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} size="md" lh={1.3}>
                            {what}{" "}
                            <Text span inherit c="dimmed" fw={400}>
                              in
                            </Text>{" "}
                            {locationName}
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            title={models.join(", ") || undefined}
                          >
                            {details.join(" · ")}
                          </Text>
                        </Stack>

                        <Group gap={2} wrap="nowrap">
                          <Tooltip label="Open this view">
                            <ActionIcon
                              component="a"
                              href={plot.fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="subtle"
                              color="gray"
                              aria-label="Open this view"
                            >
                              <IconExternalLink size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Remove from My Plots">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              onClick={() => handleDelete(plot.id)}
                              aria-label="Remove from My Plots"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      <Box h={gridConfig.plotHeight}>
                        <MiniPlot
                          plot={plot}
                          plotHeight={gridConfig.plotHeight}
                          onMetadataLoad={(metadataForPlot) =>
                            handleMetadataLoad(plot.id, metadataForPlot)
                          }
                        />
                      </Box>
                    </Stack>
                  );
                })}
              </SimpleGrid>
            </Box>
          </Stack>
        )}
      </Box>
    </>
  );
};

export default MyPlots;
