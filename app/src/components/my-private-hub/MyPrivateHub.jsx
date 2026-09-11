import { useCallback, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Container,
  Group,
  List,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconFolder,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import Seo from "../Seo";
import {
  FORECAST_REQUIRED_COLUMNS,
  GROUND_TRUTH_REQUIRED_COLUMNS,
  MyRespiVisualizationPanel,
  OTHER_HUB_CONFIG,
  buildGroundTruthOutput,
  readTabularUpload,
  validateGroundTruthCsv,
  validateHubverseCsv,
} from "../forecastchecker/ForecastCheckerDashboard";

const EXPECTED_MODEL_OUTPUT_FOLDER = "model-output";
const EXPECTED_TARGET_DATA_FOLDER = "target-data";
const TARGET_DATA_FILE_NAMES = new Set([
  "time-series.csv",
  "time-series.parquet",
]);
const MODEL_OUTPUT_FILE_EXTENSIONS = [".csv", ".parquet"];
const SILENT_MODEL_OUTPUT_FILES = new Set([".ds_store", "readme.md"]);

const normalizePath = (path) =>
  String(path ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");

const readDirectoryEntries = (directoryEntry) =>
  new Promise((resolve, reject) => {
    const reader = directoryEntry.createReader();
    const entries = [];

    const readNextBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readNextBatch();
        },
        (error) => reject(error),
      );
    };

    readNextBatch();
  });

const getEntryFile = (fileEntry) =>
  new Promise((resolve, reject) => fileEntry.file(resolve, reject));

const walkEntry = async (entry, result) => {
  const path = normalizePath(entry.fullPath || entry.name);

  if (entry.isFile) {
    result.files.push({ file: await getEntryFile(entry), path });
    return;
  }

  if (entry.isDirectory) {
    result.directories.add(path);
    const children = await readDirectoryEntries(entry);
    for (const child of children) {
      await walkEntry(child, result);
    }
  }
};

const collectDroppedHub = async (dataTransfer) => {
  const entries = Array.from(dataTransfer?.items ?? [])
    .map((item) =>
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null,
    )
    .filter(Boolean);

  if (entries.length !== 1 || !entries[0].isDirectory) {
    throw new Error("Drop exactly one hub folder, not individual files.");
  }

  const result = { files: [], directories: new Set() };
  await walkEntry(entries[0], result);
  return result;
};

const collectSelectedHub = (fileList) => {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    throw new Error(
      "The selected folder is empty or its files could not be read by the browser.",
    );
  }

  const rootNames = new Set();
  const directories = new Set();
  const describedFiles = files.map((file) => {
    const path = normalizePath(file.webkitRelativePath);
    const parts = path.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Select a hub folder, not individual files.");
    }
    rootNames.add(parts[0]);
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
    return { file, path };
  });

  if (rootNames.size !== 1) {
    throw new Error("Select exactly one hub folder at a time.");
  }

  return { files: describedFiles, directories };
};

const getPathParts = (path) => normalizePath(path).split("/").filter(Boolean);

const findNamedTopLevelDirectories = (directories, expectedName) => {
  const matches = new Set();
  directories.forEach((path) => {
    const parts = getPathParts(path);
    if (
      parts.length === 2 &&
      parts[1].toLowerCase() === expectedName.toLowerCase()
    ) {
      matches.add(path);
    }
  });
  return [...matches];
};

const requireOneTopLevelDirectory = (directories, expectedName) => {
  const matches = findNamedTopLevelDirectories(directories, expectedName);
  if (matches.length === 0) {
    throw new Error(
      `The selected hub must contain one top-level \`${expectedName}\` folder. None was found.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `The selected hub contains ${matches.length} top-level folders named \`${expectedName}\`. Keep exactly one.`,
    );
  }
  return matches[0];
};

const getImmediateChildDirectories = (directories, parentPath) => {
  const parentParts = getPathParts(parentPath);
  return [...directories].filter((path) => {
    const parts = getPathParts(path);
    return (
      parts.length === parentParts.length + 1 &&
      parts.slice(0, parentParts.length).join("/") === parentPath
    );
  });
};

const isFileWithin = (path, directoryPath) =>
  normalizePath(path).startsWith(`${normalizePath(directoryPath)}/`);

const isSilentModelOutputFile = (describedFile, modelOutputPath) => {
  return (
    isFileWithin(describedFile.path, modelOutputPath) &&
    SILENT_MODEL_OUTPUT_FILES.has(describedFile.file.name.toLowerCase())
  );
};

const isSupportedModelOutputFile = (file) => {
  const lowerName = file.name.toLowerCase();
  return MODEL_OUTPUT_FILE_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );
};

const uniqueValues = (values) => [...new Set(values)];

const createModelOutputError = (message, filteredItems) => {
  const error = new Error(message);
  error.filteredItems = filteredItems;
  return error;
};

const buildSharedTupleKey = (row) =>
  [row.target_end_date, row.location, row.target]
    .map((value) => String(value))
    .join("\u0000");

const createProjectionAccumulator = (targetRows) => {
  const outputs = {};
  const sharedTupleKeys = new Set();
  const targetTupleKeys = new Set(targetRows.map(buildSharedTupleKey));
  const targetDimensions = {
    target_end_date: new Set(
      targetRows.map((row) => String(row.target_end_date)),
    ),
    location: new Set(targetRows.map((row) => String(row.location))),
    target: new Set(targetRows.map((row) => String(row.target))),
  };
  const sharedDimensions = {
    target_end_date: new Set(),
    location: new Set(),
    target: new Set(),
  };
  let retainedRows = 0;

  const addRows = (forecastRows) => {
    const retainedRowsBefore = retainedRows;
    forecastRows.forEach((row) => {
      Object.keys(sharedDimensions).forEach((key) => {
        const value = String(row[key]);
        if (targetDimensions[key].has(value)) {
          sharedDimensions[key].add(value);
        }
      });

      const tupleKey = buildSharedTupleKey(row);
      if (!targetTupleKeys.has(tupleKey)) {
        return;
      }

      const location = String(row.location);
      const referenceDate = String(row.reference_date);
      const target = String(row.target);
      const modelId = String(row.model_id);
      const horizon = String(row.horizon);
      const outputType = String(row.output_type);

      outputs[location] ??= {
        metadata: {
          location,
          abbreviation: location,
          location_name: location,
          population: null,
          dataset: OTHER_HUB_CONFIG.datasetLabel,
          series_type: "projection",
          hubverse_keys: {
            models: new Set(),
            targets: new Set(),
            horizons: new Set(),
            output_types: new Set(),
          },
        },
        forecasts: {},
      };

      const payload = outputs[location];
      payload.metadata.hubverse_keys.models.add(modelId);
      payload.metadata.hubverse_keys.targets.add(target);
      payload.metadata.hubverse_keys.horizons.add(horizon);
      payload.metadata.hubverse_keys.output_types.add(outputType);

      payload.forecasts[referenceDate] ??= {};
      payload.forecasts[referenceDate][target] ??= {};
      payload.forecasts[referenceDate][target][modelId] ??= {
        type: outputType,
        predictions: {},
      };
      const modelForecast = payload.forecasts[referenceDate][target][modelId];
      modelForecast.predictions[horizon] ??= {
        date: String(row.target_end_date),
        ...(outputType === "quantile"
          ? { quantiles: [], values: [] }
          : { categories: [], probabilities: [] }),
      };
      const prediction = modelForecast.predictions[horizon];
      const predictionIds =
        outputType === "quantile"
          ? prediction.quantiles
          : prediction.categories;
      if (
        prediction.date === String(row.target_end_date) &&
        predictionIds.includes(row.output_type_id)
      ) {
        return;
      }

      sharedTupleKeys.add(tupleKey);
      retainedRows += 1;
      if (outputType === "quantile") {
        prediction.quantiles.push(row.output_type_id);
        prediction.values.push(row.value);
      } else {
        prediction.categories.push(row.output_type_id);
        prediction.probabilities.push(row.value);
      }
    });
    return retainedRows - retainedRowsBefore;
  };

  const finalize = () => {
    const emptyDimensions = Object.entries(sharedDimensions)
      .filter(([, values]) => values.size === 0)
      .map(([key]) => key);
    if (emptyDimensions.length > 0) {
      throw new Error(
        `Forecast and ground truth data have no shared values for: ${emptyDimensions.join(", ")}.`,
      );
    }
    if (retainedRows === 0) {
      throw new Error(
        "Forecast and ground truth data share individual dates, locations, and targets, but no matching target_end_date, location, and target combinations were found.",
      );
    }

    const locations = Object.keys(outputs).sort((left, right) =>
      left.localeCompare(right),
    );
    locations.forEach((location) => {
      const payload = outputs[location];
      const keys = payload.metadata.hubverse_keys;
      keys.models = [...keys.models];
      keys.targets = [...keys.targets];
      keys.horizons = [...keys.horizons];
      keys.output_types = [...keys.output_types];

      const locationTargetRows = targetRows.filter(
        (row) =>
          row.location === location &&
          sharedTupleKeys.has(buildSharedTupleKey(row)),
      );
      payload.ground_truth = buildGroundTruthOutput(
        locationTargetRows,
        OTHER_HUB_CONFIG,
        keys.targets,
      );
    });

    outputs["metadata.json"] = {
      last_updated: new Date().toISOString(),
      models: uniqueValues(
        locations.flatMap(
          (location) => outputs[location].metadata.hubverse_keys.models,
        ),
      ).sort(),
      locations: locations.map((location) => ({
        location,
        abbreviation: location,
        location_name: location,
        population: null,
      })),
    };

    return outputs;
  };

  return { addRows, finalize, getRetainedRows: () => retainedRows };
};

const yieldToBrowser = () =>
  new Promise((resolve) => window.setTimeout(resolve, 0));

const processForecastFiles = async (
  hubContents,
  modelOutputPath,
  targetRows,
  onProgress,
) => {
  const modelFolders = getImmediateChildDirectories(
    hubContents.directories,
    modelOutputPath,
  ).sort();
  const filteredItems = [];

  if (modelFolders.length === 0) {
    const filesAtModelOutputLevel = hubContents.files.filter(({ path }) =>
      isFileWithin(path, modelOutputPath),
    );
    filteredItems.push(
      ...filesAtModelOutputLevel
        .filter(
          (describedFile) =>
            !isSilentModelOutputFile(describedFile, modelOutputPath),
        )
        .map(({ path }) => ({
          type: "file",
          path,
          reason: "The file is not inside a model folder.",
        })),
      {
        type: "folder",
        path: modelOutputPath,
        reason:
          filesAtModelOutputLevel.length > 0
            ? "The folder contains files but no model folders."
            : "The folder is empty.",
      },
    );
    throw createModelOutputError(
      filesAtModelOutputLevel.length > 0
        ? "The `model-output` folder contains files but no model folders. Put forecast CSV or parquet files inside folders named for their models."
        : "The `model-output` folder is empty. Add at least one model folder containing forecast CSV or parquet files.",
      filteredItems,
    );
  }

  const filesByModelFolder = new Map(
    modelFolders.map((modelFolder) => [modelFolder, []]),
  );
  hubContents.files.forEach((describedFile) => {
    if (isSilentModelOutputFile(describedFile, modelOutputPath)) {
      return;
    }

    const containingModelFolder = modelFolders.find((candidate) =>
      isFileWithin(describedFile.path, candidate),
    );
    if (containingModelFolder) {
      filesByModelFolder.get(containingModelFolder).push(describedFile);
      return;
    }

    if (isFileWithin(describedFile.path, modelOutputPath)) {
      filteredItems.push({
        type: "file",
        path: describedFile.path,
        reason: "The file is not inside an immediate model folder.",
      });
    }
  });

  const totalFiles = [...filesByModelFolder.values()].reduce(
    (total, files) => total + files.length,
    0,
  );
  const accumulator = createProjectionAccumulator(targetRows);
  let processedFiles = 0;
  let usableModelRows = 0;

  for (const modelFolder of modelFolders) {
    const modelName = getPathParts(modelFolder).at(-1);
    const modelFiles = filesByModelFolder.get(modelFolder);
    const retainedRowsBeforeFolder = accumulator.getRetainedRows();

    for (const { file, path } of modelFiles) {
      if (!isSupportedModelOutputFile(file)) {
        filteredItems.push({
          type: "file",
          path,
          reason: "Only CSV and parquet files are supported in model folders.",
        });
      } else if (file.size === 0) {
        filteredItems.push({
          type: "file",
          path,
          reason: "The file is empty.",
        });
      } else {
        try {
          const { headers, records } = await readTabularUpload(file);
          const missingColumns = FORECAST_REQUIRED_COLUMNS.filter(
            (column) => !headers.includes(column),
          );

          if (missingColumns.length > 0) {
            filteredItems.push({
              type: "file",
              path,
              reason: `Missing required forecast columns: ${missingColumns.join(", ")}.`,
            });
          } else if (records.length === 0) {
            filteredItems.push({
              type: "file",
              path,
              reason: "The file has headers but no forecast rows.",
            });
          } else {
            records.forEach((record) => {
              record.model_id =
                String(record.model_id ?? "").trim() || modelName;
            });
            const validation = validateHubverseCsv(records, OTHER_HUB_CONFIG);
            if (!validation.ok) {
              filteredItems.push({
                type: "file",
                path,
                reason: validation.errors.join(" "),
              });
            } else {
              usableModelRows += validation.usableRows.length;
              const retainedFromFile = accumulator.addRows(
                validation.usableRows,
              );
              if (retainedFromFile === 0) {
                filteredItems.push({
                  type: "file",
                  path,
                  reason:
                    "No rows remained after matching target_end_date, location, and target against ground truth and removing cross-file duplicates.",
                });
              }
            }
          }
        } catch (fileError) {
          filteredItems.push({
            type: "file",
            path,
            reason:
              fileError instanceof Error
                ? fileError.message
                : "The file could not be parsed.",
          });
        }
      }

      processedFiles += 1;
      if (processedFiles % 10 === 0 || processedFiles === totalFiles) {
        onProgress?.({
          processedFiles,
          totalFiles,
          retainedRows: accumulator.getRetainedRows(),
        });
        await yieldToBrowser();
      }
    }

    if (accumulator.getRetainedRows() === retainedRowsBeforeFolder) {
      filteredItems.push({
        type: "folder",
        path: modelFolder,
        reason:
          modelFiles.length === 0
            ? "The model folder is empty."
            : "No files in this model folder contributed usable matching forecast rows.",
      });
    }
  }

  if (usableModelRows === 0) {
    throw createModelOutputError(
      "No usable model data was found in any model folder.",
      filteredItems,
    );
  }

  try {
    return { outputs: accumulator.finalize(), filteredItems };
  } catch (finalizeError) {
    finalizeError.filteredItems = filteredItems;
    throw finalizeError;
  }
};

const parseTargetData = async (hubContents, targetDataPath) => {
  const targetFiles = hubContents.files.filter(({ file, path }) => {
    const parts = getPathParts(path);
    const parentPath = parts.slice(0, -1).join("/");
    return (
      parentPath === targetDataPath &&
      TARGET_DATA_FILE_NAMES.has(file.name.toLowerCase())
    );
  });

  const filesInTargetData = hubContents.files.filter(({ path }) =>
    isFileWithin(path, targetDataPath),
  );
  if (filesInTargetData.length === 0) {
    throw new Error("The `target-data` folder is empty.");
  }
  if (targetFiles.length === 0) {
    throw new Error(
      "The `target-data` folder must contain `time-series.csv` or `time-series.parquet` at its top level.",
    );
  }
  if (targetFiles.length > 1) {
    throw new Error(
      "The `target-data` folder contains more than one supported time-series file. Keep exactly one of `time-series.csv` or `time-series.parquet`.",
    );
  }

  const [{ file }] = targetFiles;
  const { headers, records } = await readTabularUpload(file);
  const missingColumns = GROUND_TRUTH_REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `Ground truth data is missing required columns: ${missingColumns.join(", ")}.`,
    );
  }

  const validation = validateGroundTruthCsv(records, {
    allowNaObservation: true,
  });
  if (!validation.ok) {
    throw new Error(
      `Ground truth validation failed: ${validation.errors.join(" ")}`,
    );
  }
  return validation.usableRows;
};

const processHubContents = async (hubContents, onProgress) => {
  const modelOutputPath = requireOneTopLevelDirectory(
    hubContents.directories,
    EXPECTED_MODEL_OUTPUT_FOLDER,
  );
  const targetDataPath = requireOneTopLevelDirectory(
    hubContents.directories,
    EXPECTED_TARGET_DATA_FOLDER,
  );
  const targetRows = await parseTargetData(hubContents, targetDataPath);
  return processForecastFiles(
    hubContents,
    modelOutputPath,
    targetRows,
    onProgress,
  );
};

const MyPrivateHub = () => {
  const navigate = useNavigate();
  const [requirementsOpened, { toggle: toggleRequirements }] =
    useDisclosure(false);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [outputs, setOutputs] = useState(null);
  const [progress, setProgress] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);

  const processHub = useCallback(async (hubContents) => {
    setProcessing(true);
    setError(null);
    setOutputs(null);
    setProgress(null);
    setFilteredItems([]);
    try {
      const result = await processHubContents(hubContents, setProgress);
      setOutputs(result.outputs);
      setFilteredItems(result.filteredItems);
    } catch (processingError) {
      setFilteredItems(processingError?.filteredItems ?? []);
      setError(
        processingError instanceof Error
          ? processingError.message
          : "The hub folder could not be processed.",
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (processing) return;
      setDragActive(false);
      try {
        await processHub(await collectDroppedHub(event.dataTransfer));
      } catch (dropError) {
        setFilteredItems([]);
        setError(
          dropError instanceof Error
            ? dropError.message
            : "The dropped folder could not be read.",
        );
      }
    },
    [processHub, processing],
  );

  const handleFolderSelect = useCallback(
    async (event) => {
      if (processing) return;
      try {
        await processHub(collectSelectedHub(event.target.files));
      } catch (selectionError) {
        setFilteredItems([]);
        setError(
          selectionError instanceof Error
            ? selectionError.message
            : "The selected folder could not be read.",
        );
      } finally {
        event.target.value = "";
      }
    },
    [processHub, processing],
  );

  const reset = useCallback(() => {
    setDragActive(false);
    setProcessing(false);
    setError(null);
    setOutputs(null);
    setProgress(null);
    setFilteredItems([]);
  }, []);

  return (
    <>
      <Seo
        title="RespiLens | Toolbox | My Private Hub"
        description="Process and visualize a private Hubverse folder in your browser."
        canonicalPath="/toolbox/my-private-hub"
      />
      <Container size="xl" py="xl" fluid>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Tooltip
                label={
                  outputs ? "Choose another hub folder" : "Back to toolbox"
                }
                withArrow
              >
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="xl"
                  radius="xl"
                  onClick={outputs ? reset : () => navigate("/toolbox")}
                  aria-label={
                    outputs ? "Choose another hub folder" : "Back to toolbox"
                  }
                >
                  <IconArrowLeft size={24} />
                </ActionIcon>
              </Tooltip>
              <Title order={1}>My Private Hub</Title>
            </Group>
          </Group>

          {outputs ? (
            <MyRespiVisualizationPanel
              projectionOutputs={outputs}
              hubConfig={OTHER_HUB_CONFIG}
              comparisonEligibility={{
                isEligible: false,
                reason:
                  "Comparison with submitting models is not available for private hubs.",
              }}
            />
          ) : (
            <Group justify="center">
              <Box w="100%" maw={860}>
                <Stack gap="lg">
                  <Paper
                    withBorder
                    radius="xl"
                    p="xl"
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!processing) setDragActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDragActive(false);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (!processing) {
                        document
                          .getElementById("my-private-hub-folder-input")
                          ?.click();
                      }
                    }}
                    style={{
                      cursor: processing ? "progress" : "pointer",
                      border: dragActive
                        ? "2px dashed var(--mantine-color-blue-6)"
                        : "2px dashed var(--mantine-color-gray-4)",
                      backgroundColor: dragActive
                        ? "var(--mantine-color-blue-light)"
                        : "transparent",
                      transition:
                        "border-color 160ms ease, background-color 160ms ease",
                    }}
                  >
                    <Stack align="center" gap="lg" py="xl">
                      {processing ? (
                        <Loader color="blue" size="xl" />
                      ) : (
                        <ThemeIcon
                          size={84}
                          radius="xl"
                          variant="light"
                          color={dragActive ? "blue" : "gray"}
                        >
                          <IconFolder size={40} />
                        </ThemeIcon>
                      )}
                      <Stack gap="xs" ta="center">
                        <Title order={2}>
                          {processing
                            ? "Processing your hub"
                            : "Drop your hub folder here"}
                        </Title>
                        <Text c="dimmed">
                          {processing
                            ? progress
                              ? `Processed ${progress.processedFiles.toLocaleString()} of ${progress.totalFiles.toLocaleString()} forecast files; retained ${progress.retainedRows.toLocaleString()} matching rows.`
                              : "Validating target data and indexing your hub folder..."
                            : "Drop one folder, or click to select it from your device."}
                        </Text>
                      </Stack>
                      <input
                        id="my-private-hub-folder-input"
                        type="file"
                        webkitdirectory=""
                        multiple
                        style={{ display: "none" }}
                        onChange={handleFolderSelect}
                      />
                    </Stack>
                  </Paper>

                  <Group justify="center">
                    <Button
                      variant="light"
                      color="blue"
                      leftSection={<IconInfoCircle size={16} />}
                      onClick={toggleRequirements}
                    >
                      Hub folder requirements
                    </Button>
                  </Group>

                  {requirementsOpened && (
                    <Alert
                      icon={<IconInfoCircle size={16} />}
                      title="Hub folder requirements"
                      color="blue"
                      radius="lg"
                    >
                      <Stack gap="lg">
                        <Stack gap="xs">
                          <Text fw={600}>Folder structure</Text>
                          <Text size="sm">
                            Select exactly one hub folder containing one
                            top-level <code>model-output</code> folder and one
                            top-level <code>target-data</code> folder.
                          </Text>
                          <List spacing="xs" size="sm">
                            <List.Item>
                              <code>model-output/&lt;model-name&gt;/*.csv</code>{" "}
                              or <code>*.parquet</code>
                            </List.Item>
                            <List.Item>
                              <code>target-data/time-series.csv</code> or{" "}
                              <code>target-data/time-series.parquet</code>
                            </List.Item>
                          </List>
                        </Stack>

                        <Stack gap="xs">
                          <Text fw={600}>Model output</Text>
                          <Text size="sm">
                            <code>model-output</code> must contain at least one
                            model folder. CSV and parquet files within each
                            model folder are processed recursively.
                          </Text>
                          <Text size="sm">
                            Required forecast columns:{" "}
                            <code>{FORECAST_REQUIRED_COLUMNS.join(", ")}</code>.
                          </Text>
                          <Text size="sm">
                            My Private Hub currently visualizes{" "}
                            <code>output_type</code> values{" "}
                            <code>== quantile</code>. To be plotted, each{" "}
                            <code>output_type_id</code> must be a numeric
                            quantile between 0 and 1, inclusive. Other output
                            types do not produce forecast traces in this tool.
                          </Text>
                          <Text size="sm">
                            <code>model_id</code> is optional. When it is
                            missing, the model folder name is used. Empty or
                            unusable files and model folders are skipped and
                            reported after processing. At least one usable model
                            row must remain.
                          </Text>
                        </Stack>

                        <Stack gap="xs">
                          <Text fw={600}>Target data</Text>
                          <Text size="sm">
                            <code>target-data</code> must contain exactly one
                            supported time-series file at its top level.
                          </Text>
                          <Text size="sm">
                            Required target columns:{" "}
                            <code>
                              {GROUND_TRUTH_REQUIRED_COLUMNS.join(", ")}
                            </code>
                            .
                          </Text>
                          <Text size="sm">
                            <code>as_of</code> is optional. <code>NA</code>{" "}
                            observations are accepted and displayed as gaps in
                            the ground truth plot.
                          </Text>
                        </Stack>

                        <Stack gap="xs">
                          <Text fw={600}>Resulting display</Text>
                          <Text size="sm">
                            Model output and target data must share at least one
                            exact <code>target_end_date</code>,{" "}
                            <code>location</code>, and <code>target</code>{" "}
                            combination. Only matching combinations are included
                            in the visualization.
                          </Text>
                        </Stack>
                      </Stack>
                    </Alert>
                  )}
                </Stack>
              </Box>
            </Group>
          )}

          {error && !outputs && (
            <Alert
              color="red"
              radius="lg"
              title="Hub folder validation failed"
              icon={<IconAlertCircle size={16} />}
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {filteredItems.length > 0 && (
            <Alert
              color={outputs ? "yellow" : "red"}
              radius="lg"
              title={`${filteredItems.length.toLocaleString()} model output item${filteredItems.length === 1 ? " was" : "s were"} omitted`}
            >
              <Text size="sm" mb="xs">
                Empty or unusable model files and folders were skipped during
                processing.
              </Text>
              <details>
                <summary>View omitted files and folders</summary>
                <Box
                  component="pre"
                  mt="sm"
                  p="sm"
                  style={{
                    maxHeight: 320,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {filteredItems
                    .map(
                      (item) => `[${item.type}] ${item.path}\n  ${item.reason}`,
                    )
                    .join("\n")}
                </Box>
              </details>
            </Alert>
          )}

          {outputs && (
            <Group justify="center">
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={reset}
              >
                Process another hub folder
              </Button>
            </Group>
          )}
        </Stack>
      </Container>
    </>
  );
};

export default MyPrivateHub;
