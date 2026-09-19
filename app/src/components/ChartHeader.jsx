import {
  Group,
  Stack,
  Title,
  Text,
  Popover,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconShare,
  IconChartScatter,
  IconDownload,
} from "@tabler/icons-react";
import { useView } from "../hooks/useView";
import { getDatasetTitleFromView } from "../utils/datasetUtils";
import LocationPicker from "./LocationPicker";
import TargetSelector from "./TargetSelector";
import DateSelector from "./DateSelector";
import ForecastChartControls from "./controls/ForecastChartControls";

// The chart's title doubles as its setup: "<target> in <location>", with the
// forecast date on the line below (source and freshness are captioned under
// the chart). Display options and
// actions on the view stay as quiet icons to the right.
const ChartHeader = ({ onSave, isAdded, onShare, shareCopied, onDownload }) => {
  const {
    viewType,
    currentDataset,
    loading,
    availableTargets,
    availableDates,
    selectedDates,
    setSelectedDates,
    activeDate,
    setActiveDate,
    chartScale,
    setChartScale,
    intervalVisibility,
    setIntervalVisibility,
    showLegend,
    setShowLegend,
    showOtherGroundTruthSeasons,
    setShowOtherGroundTruthSeasons,
  } = useView();

  const isSurveillance = viewType === "nhsnall" || viewType === "nsspall";
  const hasTargets = availableTargets?.length > 0;
  const datasetTitle =
    getDatasetTitleFromView(viewType) || currentDataset?.fullName;

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap={6} style={{ minWidth: 0 }}>
        <Title
          order={2}
          fz={{ base: 20, sm: 24 }}
          fw={600}
          lh={1.35}
          style={{ textWrap: "balance" }}
        >
          {hasTargets ? <TargetSelector /> : datasetTitle}{" "}
          <Text span inherit c="dimmed" fw={400}>
            in
          </Text>{" "}
          <LocationPicker />
        </Title>

        {/* Each fact stays on one line; facts wrap as whole units */}
        <Group
          wrap="wrap"
          fz="sm"
          c="dimmed"
          style={{ columnGap: "var(--mantine-spacing-lg)", rowGap: 2 }}
        >
          {currentDataset?.hasDateSelector && (
            <Group gap={6} wrap="nowrap">
              <Text span size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                Forecast date
              </Text>
              <DateSelector
                compact
                selectedDates={selectedDates}
                setSelectedDates={setSelectedDates}
                availableDates={availableDates}
                activeDate={activeDate}
                setActiveDate={setActiveDate}
                loading={loading}
                multi={viewType !== "flu_peak"}
              />
            </Group>
          )}
        </Group>
      </Stack>

      <Group gap={2} wrap="nowrap">
        <Popover position="bottom-end" shadow="md" width={360}>
          <Popover.Target>
            <Tooltip label="Display options" openDelay={300}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Display options"
              >
                <IconAdjustmentsHorizontal size={18} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>
            <ForecastChartControls
              chartScale={chartScale}
              setChartScale={setChartScale}
              intervalVisibility={intervalVisibility}
              setIntervalVisibility={setIntervalVisibility}
              showLegend={showLegend}
              setShowLegend={setShowLegend}
              showOtherGroundTruthSeasons={showOtherGroundTruthSeasons}
              setShowOtherGroundTruthSeasons={setShowOtherGroundTruthSeasons}
              disableOtherGroundTruthSeasons={isSurveillance}
              showIntervals={!isSurveillance}
            />
          </Popover.Dropdown>
        </Popover>
        <Tooltip label="Download chart as PNG">
          <ActionIcon
            variant="subtle"
            size="lg"
            color="gray"
            onClick={onDownload}
            aria-label="Download chart as PNG"
          >
            <IconDownload size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isAdded ? "Added!" : "Add to My Plots"}>
          <ActionIcon
            variant="subtle"
            size="lg"
            color={isAdded ? "green" : "gray"}
            onClick={onSave}
            aria-label="Add to My Plots"
          >
            <IconChartScatter size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={shareCopied ? "Link copied!" : "Copy link to this view"}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            color={shareCopied ? "green" : "gray"}
            onClick={onShare}
            aria-label="Copy link to this view"
          >
            <IconShare size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};

export default ChartHeader;
