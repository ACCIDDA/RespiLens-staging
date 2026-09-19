import { useEffect, useState } from "react";
import { Stack, Button, Text, Box, Group } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconChartLine,
  IconActivityHeartbeat,
} from "@tabler/icons-react";
import { useView } from "../hooks/useView";
import { DATASETS } from "../config";

// Forecasts and surveillance data as two always-open groups, each with its
// own heading and icon. `showActive`: highlight the current view (off on pages
// that are not a chart, where the remembered view is not "where you are").
const ViewSelector = ({ showActive = true }) => {
  const { viewType, setViewType } = useView();
  const [isFluExpanded, setIsFluExpanded] = useState(false);

  const fluViews = [
    {
      label: "Standard view",
      value: DATASETS.flu.defaultView,
    },
    {
      label: "Detailed view",
      value: "fludetailed",
    },
    {
      label: "Peak forecasts",
      value: "flu_peak",
    },
    {
      label: "MetroCast Forecasts",
      value: DATASETS.metrocast.defaultView,
    },
  ];

  const forecastOptions = [
    {
      label: "Flu",
      value: DATASETS.flu.defaultView,
      children: fluViews,
    },
    {
      label: "COVID-19",
      value: DATASETS.covid.defaultView,
    },
    {
      label: "RSV",
      value: DATASETS.rsv.defaultView,
    },
  ];

  const surveillanceOptions = [
    {
      label: "NHSN",
      value: DATASETS.nhsn.defaultView,
    },
    {
      label: "NSSP",
      value: DATASETS.nssp.defaultView,
    },
  ];

  const fluViewValues = new Set(fluViews.map((view) => view.value));
  const isFluActive = fluViewValues.has(viewType);

  useEffect(() => {
    if (isFluActive) {
      setIsFluExpanded(true);
    }
  }, [isFluActive]);

  const handleViewSelect = (value) => {
    setViewType(value);
  };

  // `isActive` is the selected view: a soft tint with a blue accent bar.
  // `isParentActive` is the group holding it (Flu) and only gets blue text,
  // so a single row is highlighted.
  const renderOptionButton = ({
    label,
    value,
    nested = false,
    rightSection = null,
    onClick,
    isActive = false,
    isParentActive = false,
  }) => (
    <Button
      key={value || label}
      variant="subtle"
      color={isActive || isParentActive ? "blue" : "dark"}
      size="sm"
      radius="sm"
      fullWidth
      justify="space-between"
      rightSection={rightSection}
      onClick={onClick}
      styles={{
        root: {
          height: nested ? 32 : 34,
          // Rows sit under their group heading's text, past its icon
          paddingLeft: nested ? 44 : 32,
          paddingRight: 10,
          backgroundColor: isActive ? "rgba(0, 118, 209, 0.08)" : undefined,
          boxShadow: isActive
            ? "inset 3px 0 0 var(--mantine-color-blue-6)"
            : "none",
        },
        inner: {
          width: "100%",
          justifyContent: "space-between",
        },
        section: {
          opacity: isActive || isParentActive ? 0.7 : 0.35,
        },
        label: {
          width: "100%",
          textAlign: "left",
          fontWeight: isActive || isParentActive ? 600 : nested ? 450 : 500,
          fontSize: nested ? "0.8125rem" : "0.875rem",
          color:
            isActive || isParentActive
              ? "var(--mantine-color-blue-8)"
              : "var(--respilens-ink)",
        },
      }}
    >
      {label}
    </Button>
  );

  const renderSection = (title, Icon, options) => (
    <Stack gap={2}>
      <Group gap={8} px={10} pb={4} wrap="nowrap">
        <Icon size={14} stroke={2} className="respilens-eyebrow" />
        <Text size="xs" fw={700} className="respilens-eyebrow">
          {title}
        </Text>
      </Group>
      {options.map((option) => {
        if (!option.children) {
          return renderOptionButton({
            label: option.label,
            value: option.value,
            isActive: showActive && viewType === option.value,
            onClick: () => handleViewSelect(option.value),
          });
        }

        return (
          <Box key={option.label}>
            {renderOptionButton({
              label: option.label,
              value: option.value,
              isParentActive: showActive && isFluActive,
              rightSection: isFluExpanded ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronRight size={14} />
              ),
              // Like COVID-19 and RSV, clicking Flu opens it. Only once a flu
              // view is showing does the row fall back to folding the list.
              onClick: () =>
                isFluActive
                  ? setIsFluExpanded((expanded) => !expanded)
                  : handleViewSelect(DATASETS.flu.defaultView),
            })}
            {isFluExpanded && (
              <Stack gap={2} mt={2}>
                {option.children.map((child) =>
                  renderOptionButton({
                    label: child.label,
                    value: child.value,
                    nested: true,
                    isActive: showActive && viewType === child.value,
                    onClick: () => handleViewSelect(child.value),
                  }),
                )}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );

  return (
    <Stack gap="md">
      {renderSection("Forecasts", IconChartLine, forecastOptions)}
      {renderSection(
        "Surveillance data",
        IconActivityHeartbeat,
        surveillanceOptions,
      )}
    </Stack>
  );
};

export default ViewSelector;
