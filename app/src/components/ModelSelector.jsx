import { useMemo, useRef, useState } from "react";
import {
  Group,
  Stack,
  Text,
  TextInput,
  SegmentedControl,
  Anchor,
  Checkbox,
  CloseButton,
  Tooltip,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { getModelColor } from "../config/datasets";
import { extendStableModelOrder } from "../utils/modelColorUtils";

// Model picker under the chart: one filterable checklist, coloured like the
// chart's lines. "Selected" shows what is plotted; "All" (or typing a search)
// shows every model so any of them can be toggled.
const ModelSelector = ({
  models = [],
  selectedModels = [],
  setSelectedModels,
  activeModels = null,
  allowMultiple = true,
  disabled = false,
  modelColorFn = null,
  getModelColor: legacyGetModelColor = null,
  // Only used to word the "not available" tooltip
  selectedDates = [],
}) => {
  const [scope, setScope] = useState("selected");
  const [search, setSearch] = useState("");
  const stableModelOrderRef = useRef([]);
  const stableModelOrder = useMemo(() => {
    const nextOrder = extendStableModelOrder(
      stableModelOrderRef.current,
      selectedModels,
    );
    stableModelOrderRef.current = nextOrder;
    return nextOrder;
  }, [selectedModels]);

  const colorFor = (model) => {
    const resolvedColorFn = modelColorFn || legacyGetModelColor;
    if (resolvedColorFn) {
      return resolvedColorFn(model, selectedModels, stableModelOrder);
    }
    return getModelColor(model, stableModelOrder) ?? undefined;
  };

  const isActive = (model) => !activeModels || activeModels.has(model);
  const isSelected = (model) => selectedModels.includes(model);

  const query = search.toLowerCase().trim();
  // Searching always looks through every model
  const pool = query || scope === "all" ? models : selectedModels;
  const visibleModels = query
    ? pool.filter((model) => model.toLowerCase().includes(query))
    : pool;

  const toggle = (model) => {
    if (disabled || !isActive(model)) return;
    if (isSelected(model)) {
      setSelectedModels(selectedModels.filter((m) => m !== model));
    } else if (allowMultiple) {
      setSelectedModels([...selectedModels, model]);
    } else {
      setSelectedModels([model]);
    }
  };

  // "Select all" adds every model with a forecast, or only the matches
  // while searching
  const toAdd = (query ? visibleModels : models).filter(
    (model) => isActive(model) && !isSelected(model),
  );
  const handleSelectAll = () =>
    setSelectedModels([...selectedModels, ...toAdd]);
  // An empty selection falls back to the dataset's default model
  const handleReset = () => setSelectedModels([]);

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      const first = visibleModels.find(
        (model) => isActive(model) && !isSelected(model),
      );
      if (first) toggle(first);
    } else if (event.key === "Escape") {
      setSearch("");
    }
  };

  if (!models.length) {
    return (
      <Text c="dimmed" fs="italic" size="sm">
        No models available
      </Text>
    );
  }

  return (
    <Stack
      gap="sm"
      mt="md"
      pt="md"
      style={{ borderTop: "1px solid var(--respilens-hairline)" }}
    >
      <Group justify="space-between" gap="sm" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <Text fw={600} size="sm">
            Models{" "}
            <Text span c="dimmed" size="sm" fw={400}>
              {selectedModels.length} of {models.length}
            </Text>
          </Text>
          <TextInput
            w={240}
            size="xs"
            placeholder="Filter models…"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            leftSection={<IconSearch size={14} />}
            rightSection={
              search && (
                <CloseButton
                  size="sm"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                />
              )
            }
            aria-label="Filter forecasting models"
            disabled={disabled}
          />
          <SegmentedControl
            size="xs"
            value={query ? "all" : scope}
            onChange={setScope}
            data={[
              { value: "selected", label: "Selected" },
              { value: "all", label: "All" },
            ]}
            disabled={disabled || Boolean(query)}
            aria-label="Which models to list"
          />
        </Group>

        {allowMultiple && (
          <Group gap="md">
            <Tooltip
              label={
                query
                  ? `Add the ${toAdd.length} matching models`
                  : "Add every model with a forecast"
              }
              openDelay={300}
            >
              <Anchor
                component="button"
                size="sm"
                onClick={handleSelectAll}
                disabled={disabled || toAdd.length === 0}
              >
                Select all
              </Anchor>
            </Tooltip>
            <Tooltip label="Back to the default model" openDelay={300}>
              <Anchor
                component="button"
                size="sm"
                c="dimmed"
                onClick={handleReset}
                disabled={disabled || selectedModels.length === 0}
              >
                Reset
              </Anchor>
            </Tooltip>
          </Group>
        )}
      </Group>

      {visibleModels.length === 0 ? (
        <Text size="sm" c="dimmed">
          {query
            ? `No model matches “${search.trim()}”.`
            : "No models selected. Search above or switch to All."}
        </Text>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            columnGap: "var(--mantine-spacing-md)",
            rowGap: 2,
          }}
        >
          {visibleModels.map((model) => {
            const active = isActive(model);
            const checked = isSelected(model);
            // Colour only once plotted: unselected models have no line yet
            const color = checked ? colorFor(model) : undefined;
            const checkbox = (
              <Checkbox
                size="xs"
                radius="sm"
                checked={checked}
                onChange={() => toggle(model)}
                disabled={disabled || !active}
                color={color}
                styles={{
                  root: { padding: "3px 0", minWidth: 0 },
                  body: { alignItems: "center" },
                  labelWrapper: { minWidth: 0 },
                  label: {
                    fontSize: 13,
                    fontWeight: checked ? 500 : 400,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: active ? "pointer" : "not-allowed",
                  },
                }}
                label={model}
                title={active ? model : undefined}
              />
            );
            if (active) return <div key={model}>{checkbox}</div>;
            // Disabled inputs swallow hover events, so the tooltip sits on
            // a wrapper
            return (
              <Tooltip
                key={model}
                label={
                  selectedDates.length > 1
                    ? "Not available for these dates"
                    : "Not available for this date"
                }
                openDelay={200}
              >
                <div>{checkbox}</div>
              </Tooltip>
            );
          })}
        </div>
      )}
    </Stack>
  );
};

export default ModelSelector;
