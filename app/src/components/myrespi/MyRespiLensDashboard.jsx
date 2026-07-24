import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useParams } from "react-router-dom";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconFileText,
  IconInfoCircle,
  IconUpload,
} from "@tabler/icons-react";
import Seo from "../Seo";

const HUB_OPTIONS = [
  {
    slug: "flusight",
    label: "FluSight forecast hub",
    pathogenKey: "flu",
    processedDataPath: "processed_data/myrespi/flusight",
  },
  {
    slug: "covid19forecasthub",
    label: "covid19 forecast hub",
    pathogenKey: "covid19forecasthub",
    processedDataPath: "processed_data/myrespi/covid19forecasthub",
  },
  {
    slug: "rsvforecasthub",
    label: "rsv forecast hub",
    pathogenKey: "rsvforecasthub",
    processedDataPath: "processed_data/myrespi/rsvforecasthub",
  },
  {
    slug: "flumetrocast",
    label: "flu metrocast",
    pathogenKey: "flumetrocast",
    processedDataPath: "processed_data/myrespi/flumetrocast",
  },
];

const FORECAST_REQUIRED_COLUMNS = [
  "location",
  "reference_date",
  "target",
  "horizon",
  "output_type",
  "output_type_id",
  "value",
  "target_end_date",
];

const PEAK_TARGETS = new Set(["peak inc flu hosp", "peak week inc flu hosp"]);
const CATEGORICAL_OUTPUT_TYPE_IDS = new Set([
  "decrease",
  "increase",
  "large_decrease",
  "large_increase",
  "stable",
]);
const NUMERIC_OUTPUT_TYPE_IDS = new Set([0.025, 0.25, 0.5, 0.75, 0.975]);
const DEFAULT_MODEL_ID = "user-uploaded-model";

const csvDateLikeRegex = /^\d{4}-\d{2}-\d{2}$/;

const countCsvDataRows = (text) => {
  const rows = parseCsv(text);
  return Math.max(0, rows.length - 1);
};

const formatFileSize = (sizeInBytes) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fetchReferenceFile = async (path, fileKind) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${fileKind} from ${path}.`);
  }

  const blob = await response.blob();
  const fileName = path.split("/").pop() ?? path;

  if (fileName.endsWith(".csv")) {
    const text = await blob.text();
    return {
      path,
      fileName,
      size: blob.size,
      rowCount: countCsvDataRows(text),
    };
  }

  return {
    path,
    fileName,
    size: blob.size,
    rowCount: null,
  };
};

const loadHubReferenceData = async (hubConfig) => {
  const basePath = `/${hubConfig.processedDataPath}`;
  const locationsPath = `${basePath}/locations.csv`;
  const locations = await fetchReferenceFile(locationsPath, "locations.csv");

  try {
    const timeSeriesCsvPath = `${basePath}/time-series.csv`;
    const timeSeries = await fetchReferenceFile(
      timeSeriesCsvPath,
      "time-series.csv",
    );
    return { locations, timeSeries };
  } catch {
    const timeSeriesParquetPath = `${basePath}/time-series.parquet`;
    const timeSeries = await fetchReferenceFile(
      timeSeriesParquetPath,
      "time-series.parquet",
    );
    return { locations, timeSeries };
  }
};

const parseCsv = (text) => {
  const rows = [];
  let currentCell = "";
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  if (inQuotes) {
    throw new Error("The CSV appears to have an unmatched quote.");
  }

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ""));
};

const toObjects = (rows) => {
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0];
  const records = rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });

  return { headers, records };
};

const isDateLikeValue = (value) => {
  if (!value || !csvDateLikeRegex.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const normalizeOutputTypeId = (value) => {
  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }
  return value;
};

const validateHubverseCsv = (records) => {
  const summary = {
    totalRows: records.length,
    rowsMissingHorizon: 0,
    rowsFilteredAsNowcasts: 0,
    rowsFilteredAsSamples: 0,
    rowsFilteredByOutputTypeId: 0,
    usableRows: 0,
  };

  const errors = [];
  const sampleProblems = [];

  if (records.length === 0) {
    errors.push("The CSV has headers but no forecast rows.");
    return { ok: false, errors, summary };
  }

  const usableRows = records.filter((record, index) => {
    const target = String(record.target ?? "");
    const outputType = String(record.output_type ?? "");
    const outputTypeId = String(record.output_type_id ?? "");
    const rawHorizon = String(record.horizon ?? "");

    let horizonValue = rawHorizon;
    if (PEAK_TARGETS.has(target)) {
      horizonValue = "50";
    }

    if (horizonValue === "") {
      summary.rowsMissingHorizon += 1;
      return false;
    }

    const numericHorizon = Number(horizonValue);
    if (!Number.isInteger(numericHorizon)) {
      sampleProblems.push(
        `Row ${index + 2} has a horizon of "${rawHorizon}", which is not an integer.`,
      );
      return false;
    }

    if (numericHorizon < 0) {
      summary.rowsFilteredAsNowcasts += 1;
      return false;
    }

    if (outputType === "sample") {
      summary.rowsFilteredAsSamples += 1;
      return false;
    }

    const normalizedOutputTypeId = normalizeOutputTypeId(outputTypeId);
    const isCategorical = CATEGORICAL_OUTPUT_TYPE_IDS.has(outputTypeId);
    const isNumeric = NUMERIC_OUTPUT_TYPE_IDS.has(normalizedOutputTypeId);
    const isPeakWeekTarget = target.includes("peak week inc flu hosp");
    const isValidPeakWeekDate =
      isPeakWeekTarget && isDateLikeValue(outputTypeId);

    if (!(isCategorical || isNumeric || isValidPeakWeekDate)) {
      summary.rowsFilteredByOutputTypeId += 1;
      return false;
    }

    return true;
  });

  if (sampleProblems.length > 0) {
    errors.push(...sampleProblems.slice(0, 5));
  }

  summary.usableRows = usableRows.length;

  if (usableRows.length === 0) {
    errors.push(
      "No usable forecast rows remain after applying the same filtering rules as the Hubverse preprocessing step.",
    );
  }

  return { ok: errors.length === 0, errors, summary };
};

const getHubConfig = (slug) =>
  HUB_OPTIONS.find((hub) => hub.slug === slug) ?? null;

const ValidationSummary = ({ summary }) => (
  <Group gap="xs">
    <Badge color="blue" variant="light">
      {summary.totalRows} rows read
    </Badge>
    <Badge color="green" variant="light">
      {summary.usableRows} rows usable
    </Badge>
    {summary.rowsMissingHorizon > 0 && (
      <Badge color="yellow" variant="light">
        {summary.rowsMissingHorizon} missing horizon
      </Badge>
    )}
    {summary.rowsFilteredAsNowcasts > 0 && (
      <Badge color="yellow" variant="light">
        {summary.rowsFilteredAsNowcasts} nowcasts filtered
      </Badge>
    )}
    {summary.rowsFilteredAsSamples > 0 && (
      <Badge color="yellow" variant="light">
        {summary.rowsFilteredAsSamples} sample rows filtered
      </Badge>
    )}
    {summary.rowsFilteredByOutputTypeId > 0 && (
      <Badge color="yellow" variant="light">
        {summary.rowsFilteredByOutputTypeId} unsupported output_type_id
      </Badge>
    )}
  </Group>
);

const HubSelectionScreen = () => {
  const navigate = useNavigate();
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <>
      <Seo
        title="RespiLens | MyRespiLens"
        description="Validate and prepare Hubverse forecast CSV files for use in MyRespiLens."
        canonicalPath="/myrespilens"
      />
      <Container size="lg" py="xl">
        <Stack gap="xl" maw={900} mx="auto">
          <Stack gap="sm" ta="center">
            <Title order={1}>MyRespiLens</Title>
            <Text size="lg">
              Visualize your own forecast data by dragging and dropping.
            </Text>
            <Text c="dimmed">Select the hub your forecasts belong to:</Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {HUB_OPTIONS.map((hub) => (
              <Paper
                key={hub.slug}
                withBorder
                radius="xl"
                p="xl"
                onClick={() => navigate(`/myrespilens/${hub.slug}`)}
                style={{
                  aspectRatio: "1 / 1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  transition: "transform 160ms ease, box-shadow 160ms ease",
                }}
              >
                <Stack align="center" gap="sm">
                  <ThemeIcon size={56} radius="xl" variant="light" color="blue">
                    <IconFileText size={28} />
                  </ThemeIcon>
                  <Text fw={700} size="lg" tt="none">
                    {hub.label}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          <Group justify="center">
            <Button
              variant="light"
              color="red"
              leftSection={<IconInfoCircle size={16} />}
              onClick={toggle}
            >
              What is MyRespiLens?
            </Button>
            <Button
              component="a"
              href="/documentation"
              target="_blank"
              variant="light"
              color="blue"
              leftSection={<IconFileText size={16} />}
            >
              View documentation
            </Button>
          </Group>

          {opened && (
            <Alert
              icon={<IconInfoCircle size={16} />}
              title="About MyRespiLens"
              color="blue"
              radius="lg"
            >
              MyRespiLens lets users validate and visualize their own forecast
              data locally in the browser. In this updated flow, users first
              choose a supported hub and then upload a Hubverse-style forecast
              CSV for validation before conversion.
            </Alert>
          )}
        </Stack>
      </Container>
    </>
  );
};

const HubUploadScreen = () => {
  const navigate = useNavigate();
  const { hub } = useParams();
  const hubConfig = useMemo(() => getHubConfig(hub), [hub]);

  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [validationState, setValidationState] = useState(null);
  const [referenceDataState, setReferenceDataState] = useState({
    status: "idle",
    data: null,
    error: null,
  });

  useEffect(() => {
    setDragActive(false);
    setIsProcessing(false);
    setUploadedFileName("");
    setValidationState(null);
    setReferenceDataState({
      status: "idle",
      data: null,
      error: null,
    });
  }, [hub]);

  useEffect(() => {
    if (!hubConfig) {
      return undefined;
    }

    let isCancelled = false;

    const loadReferences = async () => {
      setReferenceDataState({
        status: "loading",
        data: null,
        error: null,
      });

      try {
        const data = await loadHubReferenceData(hubConfig);
        if (!isCancelled) {
          setReferenceDataState({
            status: "success",
            data,
            error: null,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setReferenceDataState({
            status: "error",
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Could not load the hub reference files.",
          });
        }
      }
    };

    loadReferences();

    return () => {
      isCancelled = true;
    };
  }, [hubConfig]);

  const processFile = useCallback(
    async (file) => {
      if (!hubConfig) {
        return;
      }

      if (!file.name.toLowerCase().endsWith(".csv")) {
        setValidationState({
          status: "error",
          errors: ["Please upload a Hubverse forecast file in `.csv` format."],
        });
        return;
      }

      setUploadedFileName(file.name);
      setIsProcessing(true);
      setValidationState(null);

      try {
        const text = await file.text();
        const rows = parseCsv(text);
        const { headers, records } = toObjects(rows);

        const missingColumns = FORECAST_REQUIRED_COLUMNS.filter(
          (column) => !headers.includes(column),
        );

        if (missingColumns.length > 0) {
          setValidationState({
            status: "error",
            errors: [
              `This file is missing required forecast columns: ${missingColumns.join(", ")}.`,
            ],
          });
          return;
        }

        const validation = validateHubverseCsv(records);
        if (!headers.includes("model_id")) {
          records.forEach((record) => {
            record.model_id = DEFAULT_MODEL_ID;
          });
        }

        if (!validation.ok) {
          setValidationState({
            status: "error",
            errors: validation.errors,
            summary: validation.summary,
          });
          return;
        }

        setValidationState({
          status: "success",
          summary: validation.summary,
        });
      } catch (error) {
        setValidationState({
          status: "error",
          errors: [
            error instanceof Error
              ? error.message
              : "The file could not be read as CSV.",
          ],
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [hubConfig],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (event.dataTransfer?.files?.[0]) {
        processFile(event.dataTransfer.files[0]);
      }
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (event) => {
      if (event.target.files?.[0]) {
        processFile(event.target.files[0]);
      }
    },
    [processFile],
  );

  if (!hubConfig) {
    return (
      <Container size="md" py="xl">
        <Alert
          color="red"
          title="Unknown hub"
          icon={<IconAlertCircle size={16} />}
        >
          The MyRespiLens hub route <strong>{hub}</strong> is not supported.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Seo
        title={`RespiLens | MyRespiLens | ${hubConfig.label}`}
        description={`Validate Hubverse CSV data for ${hubConfig.label} before MyRespiLens conversion.`}
        canonicalPath={`/myrespilens/${hubConfig.slug}`}
      />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate("/myrespilens")}
                px={0}
              >
                Back to hub selection
              </Button>
              <Title order={1}>{hubConfig.label}</Title>
              <Text c="dimmed">
                Drag and drop your Hubverse forecast CSV to validate it before
                conversion.
              </Text>
            </Stack>
            <Badge color="blue" variant="light" size="lg">
              {hubConfig.pathogenKey}
            </Badge>
          </Group>

          <Alert
            color="blue"
            radius="lg"
            icon={<IconInfoCircle size={16} />}
            title="Stored reference data"
          >
            This hub will later use reference files already stored in{" "}
            <code>{hubConfig.processedDataPath}</code>, so users only need to
            provide the Hubverse forecast CSV here.
          </Alert>

          {referenceDataState.status === "loading" && (
            <Alert
              color="blue"
              radius="lg"
              icon={<IconInfoCircle size={16} />}
              title="Loading hub reference files"
            >
              Fetching <code>locations.csv</code> and the hub's{" "}
              <code>time-series</code> file for{" "}
              <strong>{hubConfig.label}</strong>.
            </Alert>
          )}

          {referenceDataState.status === "success" && (
            <Alert
              color="green"
              radius="lg"
              icon={<IconCheck size={16} />}
              title="Hub reference files loaded"
            >
              <Stack gap="sm">
                <Text>
                  MyRespiLens successfully loaded the reference files for{" "}
                  <strong>{hubConfig.label}</strong>.
                </Text>
                <List spacing="xs">
                  <List.Item>
                    <code>{referenceDataState.data.locations.fileName}</code>:{" "}
                    {referenceDataState.data.locations.rowCount} data rows,{" "}
                    {formatFileSize(referenceDataState.data.locations.size)}
                  </List.Item>
                  <List.Item>
                    <code>{referenceDataState.data.timeSeries.fileName}</code>:{" "}
                    {referenceDataState.data.timeSeries.rowCount !== null
                      ? `${referenceDataState.data.timeSeries.rowCount} data rows, `
                      : ""}
                    {formatFileSize(referenceDataState.data.timeSeries.size)}
                  </List.Item>
                </List>
              </Stack>
            </Alert>
          )}

          {referenceDataState.status === "error" && (
            <Alert
              color="red"
              radius="lg"
              icon={<IconAlertCircle size={16} />}
              title="Could not load hub reference files"
            >
              {referenceDataState.error}
            </Alert>
          )}

          <Paper
            withBorder
            radius="xl"
            p="xl"
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(true);
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
            onClick={() =>
              document.getElementById("myrespi-hubverse-input")?.click()
            }
            style={{
              cursor: "pointer",
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
              <ThemeIcon
                size={84}
                radius="xl"
                variant="light"
                color={dragActive ? "blue" : "gray"}
              >
                <IconUpload size={40} />
              </ThemeIcon>
              <Stack gap="xs" ta="center">
                <Title order={2}>Drop your Hubverse CSV here</Title>
                <Text c="dimmed">
                  Required columns include <code>location</code>,{" "}
                  <code>reference_date</code>, <code>target</code>,{" "}
                  <code>horizon</code>, <code>output_type</code>,{" "}
                  <code>output_type_id</code>, <code>value</code>, and{" "}
                  <code>target_end_date</code>. If <code>model_id</code> is
                  missing, MyRespiLens will assign a default model name
                  automatically.
                </Text>
              </Stack>
              <Text size="sm" fw={600} c="blue">
                Hubverse forecast-style `.csv` files only
              </Text>
              <input
                id="myrespi-hubverse-input"
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </Stack>
          </Paper>

          {uploadedFileName && (
            <Text size="sm" c="dimmed">
              Current file: {uploadedFileName}
            </Text>
          )}

          {isProcessing && (
            <Alert
              color="blue"
              title="Validating file"
              icon={<IconInfoCircle size={16} />}
            >
              Checking the CSV structure and applying the same preprocessing
              rules used by the Python conversion pipeline.
            </Alert>
          )}

          {validationState?.status === "success" && (
            <Alert
              color="green"
              radius="lg"
              title="Validation passed"
              icon={<IconCheck size={16} />}
            >
              <Stack gap="sm">
                <Text>
                  Your Hubverse CSV passed the current MyRespiLens checks for{" "}
                  <strong>{hubConfig.label}</strong>. We can use this file in
                  the next conversion step once the JSON-building logic is
                  added.
                </Text>
                <ValidationSummary summary={validationState.summary} />
              </Stack>
            </Alert>
          )}

          {validationState?.status === "error" && (
            <Alert
              color="red"
              radius="lg"
              title="Validation failed"
              icon={<IconAlertCircle size={16} />}
            >
              <Stack gap="sm">
                <Text>
                  The uploaded CSV could not be validated yet. Please fix the
                  issues below and try again.
                </Text>
                {validationState.summary && (
                  <ValidationSummary summary={validationState.summary} />
                )}
                <List spacing="xs">
                  {validationState.errors.map((error) => (
                    <List.Item key={error}>{error}</List.Item>
                  ))}
                </List>
                <Text size="sm" c="dimmed">
                  If you want a reference for the expected Hubverse format, see
                  the{" "}
                  <Anchor
                    href="https://docs.hubverse.io/en/latest/user-guide/model-output.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hubverse model output guide
                  </Anchor>
                  .
                </Text>
              </Stack>
            </Alert>
          )}
        </Stack>
      </Container>
    </>
  );
};

const MyRespiLensDashboard = () => {
  const { hub } = useParams();

  if (hub) {
    return <HubUploadScreen />;
  }

  return <HubSelectionScreen />;
};

export default MyRespiLensDashboard;
