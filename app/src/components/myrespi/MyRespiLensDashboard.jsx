import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  List,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Tooltip,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useParams } from "react-router-dom";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconFileText,
  IconBrandGithub,
  IconInfoCircle,
  IconUpload,
} from "@tabler/icons-react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js/dist/plotly";
import DateSelector from "../DateSelector";
import ModelSelector from "../ModelSelector";
import ForecastChartControls from "../controls/ForecastChartControls";
import Seo from "../Seo";
import useQuantileForecastTraces from "../../hooks/useQuantileForecastTraces";
import { MODEL_COLORS } from "../../config/datasets";
import { CHART_CONSTANTS } from "../../constants/chart";
import { extendStableModelOrder } from "../../utils/modelColorUtils";
import { buildSqrtTicks } from "../../utils/scaleUtils";

const HUB_OPTIONS = [
  {
    slug: "flusight",
    label: "FluSight Forecast Hub",
    githubUrl: "https://github.com/cdcepi/fluSight-forecast-hub",
    pathogenKey: "flu",
    processedDataPath: "processed_data/myrespi/flusight",
    fileSuffix: "flu",
    datasetLabel: "flusight forecasts",
    groundTruthMinDate: "2022-10-01",
  },
  {
    slug: "covid19forecasthub",
    label: "COVID-19 Forecast Hub",
    githubUrl: "https://github.com/CDCgov/covid19-forecast-hub",
    pathogenKey: "covid19forecasthub",
    processedDataPath: "processed_data/myrespi/covid19forecasthub",
    fileSuffix: "covid19",
    datasetLabel: "covid19 forecast hub",
    groundTruthMinDate: "2023-10-01",
  },
  {
    slug: "rsvforecasthub",
    label: "RSV Forecast Hub",
    githubUrl: "https://github.com/CDCgov/rsv-forecast-hub",
    pathogenKey: "rsvforecasthub",
    processedDataPath: "processed_data/myrespi/rsvforecasthub",
    fileSuffix: "rsv",
    datasetLabel: "rsv forecast hub",
    groundTruthMinDate: "2023-10-01",
  },
  {
    slug: "flumetrocast",
    label: "Flu Metrocast Hub",
    githubUrl: "https://github.com/reichlab/flu-metrocast",
    pathogenKey: "flumetrocast",
    processedDataPath: "processed_data/myrespi/flumetrocast",
    fileSuffix: "flu_metrocast",
    datasetLabel: "flu metrocast forecasts",
    groundTruthMinDate: "2024-08-01",
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
const DEFAULT_MODEL_ID = "user-uploaded-model";
const FLU_METROCAST_MIN_TARGET_END_DATE = "2025-11-22";
const HUB_PATHOGEN_KEYWORDS = {
  flusight: "flu",
  flumetrocast: "flu",
  covid19forecasthub: "covid",
  rsvforecasthub: "rsv",
};

const csvDateLikeRegex = /^\d{4}-\d{2}-\d{2}$/;

const countCsvDataRows = (text) => {
  const rows = parseCsv(text);
  return Math.max(0, rows.length - 1);
};

const normalizeDateString = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const buildRequiredColumnError = (fileLabel, missingColumns) =>
  `${fileLabel} is missing required columns: ${missingColumns.join(", ")}.`;

const uniqueValuesInOrder = (values) => Array.from(new Set(values));

const getFileRelativePath = (file) => file.webkitRelativePath || file.name;

const readDirectoryEntry = (entry) =>
  new Promise((resolve, reject) => {
    const reader = entry.createReader();
    const allEntries = [];

    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(allEntries);
            return;
          }
          allEntries.push(...entries);
          readBatch();
        },
        (error) => reject(error),
      );
    };

    readBatch();
  });

const fileFromEntry = (entry) =>
  new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });

const collectFilesFromEntry = async (entry) => {
  if (entry.isFile) {
    const file = await fileFromEntry(entry);
    return [file];
  }

  if (entry.isDirectory) {
    const entries = await readDirectoryEntry(entry);
    const nestedFiles = await Promise.all(
      entries.map((nestedEntry) => collectFilesFromEntry(nestedEntry)),
    );
    return nestedFiles.flat();
  }

  return [];
};

const collectDroppedFiles = async (dataTransfer) => {
  const items = Array.from(dataTransfer?.items ?? []);
  const directoryEntries = items
    .map((item) =>
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null,
    )
    .filter(Boolean);

  if (directoryEntries.length > 0) {
    const nestedFiles = await Promise.all(
      directoryEntries.map((entry) => collectFilesFromEntry(entry)),
    );
    return nestedFiles.flat();
  }

  return Array.from(dataTransfer?.files ?? []);
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
    const rows = parseCsv(text);
    const { headers, records } = toObjects(rows);
    return {
      path,
      fileName,
      size: blob.size,
      rowCount: countCsvDataRows(text),
      headers,
      records,
    };
  }

  return {
    path,
    fileName,
    size: blob.size,
    rowCount: null,
    headers: [],
    records: null,
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

const fetchProjectionJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load projections JSON from ${path}.`);
  }

  return response.json();
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

const isSupportedQuantileOutputTypeId = (outputType, outputTypeId) =>
  outputType === "quantile" &&
  typeof outputTypeId === "number" &&
  outputTypeId >= 0 &&
  outputTypeId <= 1;

const buildQuantileIntervalKey = (lowerQuantile, upperQuantile) =>
  `${lowerQuantile}_${upperQuantile}`;

const formatIntervalPercentage = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const getPredictionIntervalDefinitions = (locationData, target) => {
  if (!locationData?.forecasts || !target) {
    return { hasMedian: false, intervalDefinitions: [] };
  }

  const intervalMap = new Map();
  let hasMedian = false;

  Object.values(locationData.forecasts).forEach((dateData) => {
    const targetData = dateData?.[target];
    if (!targetData) {
      return;
    }

    Object.values(targetData).forEach((modelData) => {
      Object.values(modelData?.predictions || {}).forEach((prediction) => {
        const quantiles = (prediction.quantiles || []).map((value) =>
          Number(value),
        );
        const quantileSet = new Set(
          quantiles.filter((value) => !Number.isNaN(value)),
        );

        if (quantileSet.has(0.5)) {
          hasMedian = true;
        }

        quantileSet.forEach((quantile) => {
          if (quantile >= 0.5) {
            return;
          }

          const pairedQuantile = Number((1 - quantile).toFixed(10));
          if (!quantileSet.has(pairedQuantile)) {
            return;
          }

          const key = buildQuantileIntervalKey(quantile, pairedQuantile);
          if (!intervalMap.has(key)) {
            intervalMap.set(key, {
              key: `interval_${String(quantile).replace(".", "p")}_${String(
                pairedQuantile,
              ).replace(".", "p")}`,
              label: `${formatIntervalPercentage(
                (pairedQuantile - quantile) * 100,
              )}% interval`,
              lowerQuantile: quantile,
              upperQuantile: pairedQuantile,
            });
          }
        });
      });
    });
  });

  return {
    hasMedian,
    intervalDefinitions: [...intervalMap.values()].sort(
      (left, right) => left.lowerQuantile - right.lowerQuantile,
    ),
  };
};

const validateHubverseCsv = (records, hubConfig) => {
  const summary = {
    totalRows: records.length,
    rowsMissingHorizon: 0,
    rowsFilteredAsNowcasts: 0,
    rowsFilteredAsSamples: 0,
    rowsFilteredByOutputTypeId: 0,
    rowsFilteredAsPeakTargets: 0,
    rowsFilteredAsDuplicates: 0,
    usableRows: 0,
  };

  const errors = [];
  const sampleProblems = [];
  let hasFluMetrocastEarlyDate = false;

  if (records.length === 0) {
    errors.push("The CSV has headers but no forecast rows.");
    return { ok: false, errors, summary };
  }

  const usableRows = records.flatMap((record, index) => {
    const target = String(record.target ?? "");
    const outputType = String(record.output_type ?? "");
    const outputTypeId = String(record.output_type_id ?? "");
    const rawHorizon = String(record.horizon ?? "");
    const modelId = String(record.model_id ?? DEFAULT_MODEL_ID);
    const normalizedTargetEndDate = normalizeDateString(record.target_end_date);
    const numericValue = Number(record.value);

    if (hubConfig?.slug === "flusight" && PEAK_TARGETS.has(target)) {
      summary.rowsFilteredAsPeakTargets += 1;
      return [];
    }

    if (!normalizedTargetEndDate) {
      sampleProblems.push(
        `Row ${index + 2} has an invalid target_end_date of "${record.target_end_date}".`,
      );
      return [];
    }

    if (
      hubConfig?.slug === "flumetrocast" &&
      normalizedTargetEndDate < FLU_METROCAST_MIN_TARGET_END_DATE
    ) {
      hasFluMetrocastEarlyDate = true;
      return [];
    }

    if (Number.isNaN(numericValue)) {
      sampleProblems.push(
        `Row ${index + 2} has a non-numeric value of "${record.value}".`,
      );
      return [];
    }

    let horizonValue = rawHorizon;
    if (PEAK_TARGETS.has(target)) {
      horizonValue = "50";
    }

    if (horizonValue === "") {
      summary.rowsMissingHorizon += 1;
      return [];
    }

    const numericHorizon = Number(horizonValue);
    if (!Number.isInteger(numericHorizon)) {
      sampleProblems.push(
        `Row ${index + 2} has a horizon of "${rawHorizon}", which is not an integer.`,
      );
      return [];
    }

    if (numericHorizon < 0) {
      summary.rowsFilteredAsNowcasts += 1;
      return [];
    }

    if (outputType === "sample") {
      summary.rowsFilteredAsSamples += 1;
      return [];
    }

    const normalizedOutputTypeId = normalizeOutputTypeId(outputTypeId);
    const isCategorical = CATEGORICAL_OUTPUT_TYPE_IDS.has(outputTypeId);
    const isPeakWeekTarget = target.includes("peak week inc flu hosp");
    const isValidPeakWeekDate =
      isPeakWeekTarget && isDateLikeValue(outputTypeId);
    const isSupportedQuantile = isSupportedQuantileOutputTypeId(
      outputType,
      normalizedOutputTypeId,
    );

    if (isCategorical || !(isSupportedQuantile || isValidPeakWeekDate)) {
      summary.rowsFilteredByOutputTypeId += 1;
      return [];
    }

    return [
      {
        ...record,
        target,
        output_type: outputType,
        output_type_id:
          outputType === "quantile"
            ? Number(normalizedOutputTypeId)
            : outputTypeId,
        horizon: numericHorizon,
        model_id: modelId,
        value: numericValue,
        target_end_date: normalizedTargetEndDate,
        reference_date:
          normalizeDateString(record.reference_date) ?? record.reference_date,
      },
    ];
  });

  if (sampleProblems.length > 0) {
    errors.push(...sampleProblems.slice(0, 5));
  }

  if (hasFluMetrocastEarlyDate) {
    errors.push(
      "Your upload contains dates before 2025-11-22 (MyRespiLens flu-metrocast can only process target_end_dates after this day)",
    );
  }

  const seenCompositeKeys = new Set();
  const deduplicatedRows = usableRows.filter((row) => {
    const compositeKey = [
      String(row.reference_date),
      String(row.target_end_date),
      String(row.location ?? ""),
      String(row.horizon),
      String(row.target),
      String(row.output_type),
      String(row.output_type_id),
      String(row.model_id ?? DEFAULT_MODEL_ID),
    ].join("__");

    if (seenCompositeKeys.has(compositeKey)) {
      summary.rowsFilteredAsDuplicates += 1;
      return false;
    }

    seenCompositeKeys.add(compositeKey);
    return true;
  });

  summary.usableRows = deduplicatedRows.length;

  if (deduplicatedRows.length === 0) {
    errors.push("No usable forecast rows remain after preprocessing.");
  }

  return {
    ok: errors.length === 0,
    errors,
    summary,
    usableRows: deduplicatedRows,
  };
};

const buildHubPathogenWarning = (forecastRows, hubConfig) => {
  const expectedKeyword = HUB_PATHOGEN_KEYWORDS[hubConfig?.slug];

  if (!expectedKeyword || !forecastRows?.length) {
    return null;
  }

  const hasExpectedPathogen = forecastRows.some((row) =>
    String(row.target ?? "")
      .toLowerCase()
      .includes(expectedKeyword),
  );

  if (hasExpectedPathogen) {
    return null;
  }

  return `Your uploaded target names do not appear to mention "${expectedKeyword}". Please double-check your hub selection.`;
};

const buildComparisonEligibility = (forecastRows) => {
  const today = getTodayDateString();
  const hasPresentOrFutureTargets = forecastRows.some(
    (row) => String(row.target_end_date) >= today,
  );

  if (hasPresentOrFutureTargets) {
    return {
      isEligible: false,
      reason:
        "You can only compare with submitting models when your model data is for the past.",
    };
  }

  return {
    isEligible: true,
    reason: null,
  };
};

const buildGroundTruthOutput = (
  targetRows,
  hubConfig,
  allowedTargets = null,
) => {
  const requiredColumns = [
    "as_of",
    "target_end_date",
    "location",
    "observation",
    "target",
  ];
  const missingColumns = requiredColumns.filter(
    (column) => !(targetRows[0] ? column in targetRows[0] : true),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      buildRequiredColumnError("time-series data", missingColumns),
    );
  }

  const minDate = new Date(hubConfig.groundTruthMinDate);
  const latestByKey = new Map();
  const allowedTargetSet =
    allowedTargets && allowedTargets.length > 0
      ? new Set(allowedTargets)
      : null;

  targetRows.forEach((row) => {
    const normalizedTargetEndDate = normalizeDateString(row.target_end_date);
    const normalizedAsOf = normalizeDateString(row.as_of);
    const observation = Number(row.observation);
    const target = String(row.target);

    if (
      (allowedTargetSet && !allowedTargetSet.has(target)) ||
      !normalizedTargetEndDate ||
      !normalizedAsOf ||
      Number.isNaN(observation) ||
      new Date(normalizedTargetEndDate) < minDate
    ) {
      return;
    }

    const dedupeKey = `${target}__${normalizedTargetEndDate}`;
    const existing = latestByKey.get(dedupeKey);
    if (!existing || normalizedAsOf >= existing.as_of) {
      latestByKey.set(dedupeKey, {
        target,
        target_end_date: normalizedTargetEndDate,
        as_of: normalizedAsOf,
        observation,
      });
    }
  });

  const dedupedRows = Array.from(latestByKey.values()).sort((left, right) => {
    const leftTime = new Date(left.target_end_date).getTime();
    const rightTime = new Date(right.target_end_date).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.target.localeCompare(right.target);
  });

  const dates = uniqueValuesInOrder(
    dedupedRows.map((row) => row.target_end_date),
  );
  const targets = uniqueValuesInOrder(dedupedRows.map((row) => row.target));
  const groundTruth = { dates };

  targets.forEach((target) => {
    const valuesByDate = new Map(
      dedupedRows
        .filter((row) => row.target === target)
        .map((row) => [row.target_end_date, row.observation]),
    );
    groundTruth[target] = dates.map((date) =>
      valuesByDate.has(date) ? valuesByDate.get(date) : null,
    );
  });

  return groundTruth;
};

const buildForecastOutput = (forecastRows) => {
  const forecasts = {};

  forecastRows.forEach((row) => {
    const outputType = row.output_type;
    if (outputType !== "quantile" && outputType !== "pmf") {
      throw new Error(
        `Unsupported output_type "${outputType}" found while building projections JSON.`,
      );
    }

    const referenceDate = String(row.reference_date);
    const target = String(row.target);
    const modelId = String(row.model_id);
    const horizon = String(row.horizon);

    forecasts[referenceDate] ??= {};
    forecasts[referenceDate][target] ??= {};
    forecasts[referenceDate][target][modelId] ??= {
      type: outputType,
      predictions: {},
    };

    forecasts[referenceDate][target][modelId].predictions[horizon] ??= {
      date: String(row.target_end_date),
      ...(outputType === "quantile"
        ? { quantiles: [], values: [] }
        : { categories: [], probabilities: [] }),
    };

    if (outputType === "quantile") {
      forecasts[referenceDate][target][modelId].predictions[
        horizon
      ].quantiles.push(row.output_type_id);
      forecasts[referenceDate][target][modelId].predictions[
        horizon
      ].values.push(row.value);
    } else {
      forecasts[referenceDate][target][modelId].predictions[
        horizon
      ].categories.push(row.output_type_id);
      forecasts[referenceDate][target][modelId].predictions[
        horizon
      ].probabilities.push(row.value);
    }
  });

  return forecasts;
};

const buildProjectionOutputs = ({
  hubConfig,
  forecastRows,
  locationsRows,
  targetRows,
}) => {
  if (!locationsRows || !targetRows) {
    throw new Error("Reference data did not include parsed CSV records.");
  }

  const requiredLocationColumns =
    hubConfig.slug === "flumetrocast"
      ? [
          "location",
          "original_location_code",
          "state",
          "state_abb",
          "location_name",
          "population",
        ]
      : ["location", "abbreviation", "location_name", "population"];
  const missingLocationColumns = requiredLocationColumns.filter(
    (column) => !(locationsRows[0] ? column in locationsRows[0] : true),
  );
  if (missingLocationColumns.length > 0) {
    throw new Error(
      buildRequiredColumnError("locations.csv", missingLocationColumns),
    );
  }

  const locationMap = new Map(
    locationsRows.map((row) => [String(row.location), row]),
  );

  const missingLocations = forecastRows
    .map((row) => String(row.location))
    .filter((location, index, all) => all.indexOf(location) === index)
    .filter((location) => !locationMap.has(location))
    .sort();
  if (missingLocations.length > 0) {
    throw new Error(
      `The following locations are missing from locations.csv: ${missingLocations.join(", ")}.`,
    );
  }

  const outputs = {};
  const locationIds = uniqueValuesInOrder(
    forecastRows.map((row) => String(row.location)),
  );

  locationIds.forEach((locationId) => {
    const locationInfo = locationMap.get(locationId);
    const locationForecastRows = forecastRows.filter(
      (row) => String(row.location) === locationId,
    );
    const locationTargetRows = targetRows.filter(
      (row) => String(row.location) === locationId,
    );

    const metadata = {
      location:
        hubConfig.slug === "flumetrocast"
          ? String(locationInfo.original_location_code)
          : locationId,
      abbreviation:
        hubConfig.slug === "flumetrocast"
          ? String(locationInfo.location)
          : String(locationInfo.abbreviation),
      location_name: String(locationInfo.location_name),
      population: Number(locationInfo.population),
      dataset: hubConfig.datasetLabel,
      series_type: "projection",
      hubverse_keys: {
        models: uniqueValuesInOrder(
          locationForecastRows.map((row) => String(row.model_id)),
        ),
        targets: uniqueValuesInOrder(
          locationForecastRows.map((row) => String(row.target)),
        ),
        horizons: uniqueValuesInOrder(
          locationForecastRows.map((row) => String(row.horizon)),
        ),
        output_types: uniqueValuesInOrder(
          locationForecastRows.map((row) => String(row.output_type)),
        ).filter((value) => value !== "sample"),
      },
    };

    if (hubConfig.slug === "flumetrocast") {
      metadata.state = String(locationInfo.state);
      metadata.state_abb = String(locationInfo.state_abb);
      metadata.location_type = String(locationInfo.location_type ?? "");
    }

    const forecastTargets = uniqueValuesInOrder(
      locationForecastRows.map((row) => String(row.target)),
    );
    const groundTruth = buildGroundTruthOutput(
      locationTargetRows,
      hubConfig,
      forecastTargets,
    );
    const forecasts = buildForecastOutput(locationForecastRows);
    const fileName =
      hubConfig.slug === "flumetrocast"
        ? `${String(locationInfo.location)}_${hubConfig.fileSuffix}.json`
        : `${metadata.abbreviation}_${hubConfig.fileSuffix}.json`;

    outputs[fileName] = {
      metadata,
      ground_truth: groundTruth,
      forecasts,
    };
  });

  const metadataFile = {
    last_updated: new Date().toISOString(),
    models: [
      ...uniqueValuesInOrder(forecastRows.map((row) => String(row.model_id))),
    ].sort(),
    locations: locationIds.map((locationId) => {
      const row = locationMap.get(locationId);
      if (hubConfig.slug === "flumetrocast") {
        return {
          location: String(row.original_location_code),
          abbreviation: String(row.location),
          location_name: String(row.location_name),
          population: Number(row.population),
          state: String(row.state),
          state_abb: String(row.state_abb),
          location_type: String(row.location_type ?? ""),
        };
      }

      return {
        location: String(row.location),
        abbreviation: String(row.abbreviation),
        location_name: String(row.location_name),
        population: Number(row.population),
      };
    }),
  };

  outputs["metadata.json"] = metadataFile;

  return outputs;
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
    {summary.rowsFilteredAsPeakTargets > 0 && (
      <Badge color="yellow" variant="light">
        {summary.rowsFilteredAsPeakTargets} flu peak rows filtered
      </Badge>
    )}
    {summary.rowsFilteredAsDuplicates > 0 && (
      <Badge color="yellow" variant="light">
        {summary.rowsFilteredAsDuplicates} duplicate rows filtered
      </Badge>
    )}
  </Group>
);

const buildLocationOptions = (projectionOutputs) =>
  Object.entries(projectionOutputs)
    .filter(([fileName]) => fileName !== "metadata.json")
    .map(([fileName, payload]) => ({
      value: fileName,
      label:
        payload?.metadata?.location_name && payload?.metadata?.abbreviation
          ? `${payload.metadata.location_name} (${payload.metadata.abbreviation})`
          : fileName,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

const buildMetroHierarchy = (projectionOutputs) => {
  const metadataLocations =
    projectionOutputs?.["metadata.json"]?.locations ?? [];
  const statesByAbbreviation = new Map();

  metadataLocations.forEach((location) => {
    const stateAbbreviation = String(location.state_abb ?? "");
    const stateName = String(location.state ?? "");
    if (!stateAbbreviation || !stateName) {
      return;
    }
    if (!statesByAbbreviation.has(stateAbbreviation)) {
      statesByAbbreviation.set(stateAbbreviation, {
        value: stateAbbreviation,
        label: stateName,
      });
    }
  });

  const stateOptions = [...statesByAbbreviation.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );

  const locationsByState = {};

  stateOptions.forEach((state) => {
    const stateLocations = metadataLocations
      .filter((location) => location.state_abb === state.value)
      .sort((left, right) =>
        left.location_name.localeCompare(right.location_name),
      );

    const topLevelLocation = stateLocations.find(
      (location) => String(location.location_name ?? "") === state.label,
    );
    const childLocations = stateLocations.filter(
      (location) => location.abbreviation !== topLevelLocation?.abbreviation,
    );

    locationsByState[state.value] = [
      ...(topLevelLocation
        ? [
            {
              value: `${topLevelLocation.abbreviation}_flu_metrocast.json`,
              label: `${topLevelLocation.location_name} (statewide)`,
            },
          ]
        : []),
      ...childLocations.map((location) => ({
        value: `${location.abbreviation}_flu_metrocast.json`,
        label: location.location_name,
      })),
    ];
  });

  return {
    stateOptions,
    locationsByState,
  };
};

const getAllForecastDates = (projectionOutputs) => {
  const dateSet = new Set();
  Object.entries(projectionOutputs).forEach(([fileName, payload]) => {
    if (fileName === "metadata.json") return;
    Object.keys(payload?.forecasts || {}).forEach((date) => dateSet.add(date));
  });
  return [...dateSet].sort((left, right) => new Date(left) - new Date(right));
};

const getTargetOptions = (locationData) => {
  const targetSet = new Set();

  Object.values(locationData?.forecasts || {}).forEach((dateData) => {
    Object.keys(dateData || {}).forEach((target) => targetSet.add(target));
  });

  return [...targetSet]
    .map((target) => ({
      value: target,
      label: target,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
};

const getModelsForTarget = (locationData, target) => {
  if (!locationData?.forecasts || !target) return [];
  const modelSet = new Set();
  Object.values(locationData.forecasts).forEach((dateData) => {
    const targetData = dateData?.[target];
    if (!targetData) return;
    Object.keys(targetData).forEach((model) => modelSet.add(model));
  });
  return [...modelSet].sort();
};

const buildComparisonHoverText = ({
  model,
  pointDate,
  formattedMedian,
  formattedIntervals,
  issuedDate,
}) => {
  const rows = [`<b>Submitted model: ${model}</b><br>Date: ${pointDate}<br>`];

  if (formattedMedian !== null) {
    rows.push(`Median: <b>${formattedMedian}</b><br>`);
  }

  formattedIntervals.forEach((interval) => {
    rows.push(`${interval.label}: [${interval.formattedRange}]<br>`);
  });

  rows.push(
    `<span style="color: rgba(255,255,255,0.8); font-size: 0.8em">submitted as of ${issuedDate}</span><extra></extra>`,
  );

  return rows.join("");
};

const filterComparisonLocationData = (
  comparisonLocationData,
  userLocationData,
) => {
  if (!comparisonLocationData?.forecasts || !userLocationData?.forecasts) {
    return comparisonLocationData;
  }

  const filteredForecasts = {};

  Object.entries(userLocationData.forecasts).forEach(([date, targetData]) => {
    const comparisonDateData = comparisonLocationData.forecasts?.[date];
    if (!comparisonDateData) {
      return;
    }

    Object.keys(targetData || {}).forEach((target) => {
      const comparisonTargetData = comparisonDateData[target];
      if (!comparisonTargetData) {
        return;
      }

      filteredForecasts[date] ??= {};
      filteredForecasts[date][target] = comparisonTargetData;
    });
  });

  return {
    ...comparisonLocationData,
    forecasts: filteredForecasts,
  };
};

const getDefaultViewerRange = (
  groundTruthDates,
  selectedDates,
  forRangeslider = false,
) => {
  if (!groundTruthDates?.length || !selectedDates?.length) {
    return undefined;
  }

  const firstGroundTruthDate = new Date(groundTruthDates[0]);
  const lastGroundTruthDate = new Date(
    groundTruthDates[groundTruthDates.length - 1],
  );

  if (forRangeslider) {
    const sliderEnd = new Date(lastGroundTruthDate);
    sliderEnd.setDate(
      sliderEnd.getDate() + CHART_CONSTANTS.RANGESLIDER_WEEKS_AFTER * 7,
    );
    return [
      firstGroundTruthDate.toISOString().split("T")[0],
      sliderEnd.toISOString().split("T")[0],
    ];
  }

  const firstSelectedDate = new Date(selectedDates[0]);
  const lastSelectedDate = new Date(selectedDates[selectedDates.length - 1]);
  const rangeStart = new Date(firstSelectedDate);
  const rangeEnd = new Date(lastSelectedDate);
  rangeStart.setDate(
    rangeStart.getDate() - CHART_CONSTANTS.DEFAULT_WEEKS_BEFORE * 7,
  );
  rangeEnd.setDate(
    rangeEnd.getDate() + CHART_CONSTANTS.DEFAULT_WEEKS_AFTER * 7,
  );

  return [
    rangeStart.toISOString().split("T")[0],
    rangeEnd.toISOString().split("T")[0],
  ];
};

const MyRespiVisualizationPanel = ({
  projectionOutputs,
  hubConfig,
  comparisonEligibility,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const isMetrocast = hubConfig?.slug === "flumetrocast";
  const [selectedMetroState, setSelectedMetroState] = useState(null);
  const [selectedLocationFile, setSelectedLocationFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [chartScale, setChartScale] = useState("linear");
  const [intervalVisibility, setIntervalVisibility] = useState({});
  const [showLegend, setShowLegend] = useState(true);
  const [xAxisRange, setXAxisRange] = useState(null);
  const [yAxisRange, setYAxisRange] = useState(null);
  const [compareWithSubmittingModels, setCompareWithSubmittingModels] =
    useState(false);
  const [comparisonDataState, setComparisonDataState] = useState({
    status: "idle",
    data: null,
    error: null,
    locationFile: null,
  });
  const [preferredSubmittedModels, setPreferredSubmittedModels] = useState([]);
  const plotRef = useRef(null);
  const isResettingRef = useRef(false);
  const comparisonCacheRef = useRef(new Map());
  const userModelOrderRef = useRef([]);
  const submittedModelOrderRef = useRef([]);

  const locationOptions = useMemo(
    () => buildLocationOptions(projectionOutputs),
    [projectionOutputs],
  );
  const metroHierarchy = useMemo(
    () => (isMetrocast ? buildMetroHierarchy(projectionOutputs) : null),
    [isMetrocast, projectionOutputs],
  );

  useEffect(() => {
    if (!isMetrocast) {
      setSelectedMetroState(null);
      return;
    }

    const stateOptions = metroHierarchy?.stateOptions ?? [];
    if (!stateOptions.length) {
      setSelectedMetroState(null);
      return;
    }

    setSelectedMetroState((current) =>
      current && stateOptions.some((option) => option.value === current)
        ? current
        : stateOptions[0].value,
    );
  }, [isMetrocast, metroHierarchy]);

  useEffect(() => {
    if (isMetrocast) {
      const scopedOptions =
        metroHierarchy?.locationsByState?.[selectedMetroState] ?? [];
      if (!scopedOptions.length) {
        setSelectedLocationFile(null);
        return;
      }
      setSelectedLocationFile((current) =>
        current && scopedOptions.some((option) => option.value === current)
          ? current
          : scopedOptions[0].value,
      );
      return;
    }

    if (!locationOptions.length) {
      setSelectedLocationFile(null);
      return;
    }
    setSelectedLocationFile((current) =>
      current && locationOptions.some((option) => option.value === current)
        ? current
        : locationOptions[0].value,
    );
  }, [isMetrocast, locationOptions, metroHierarchy, selectedMetroState]);

  const locationData = selectedLocationFile
    ? projectionOutputs[selectedLocationFile]
    : null;
  const scopedMetroLocationOptions = useMemo(
    () => metroHierarchy?.locationsByState?.[selectedMetroState] ?? [],
    [metroHierarchy, selectedMetroState],
  );

  useEffect(() => {
    if (!comparisonEligibility?.isEligible) {
      setCompareWithSubmittingModels(false);
    }
  }, [comparisonEligibility]);

  useEffect(() => {
    if (!compareWithSubmittingModels || !selectedLocationFile) {
      setComparisonDataState({
        status: "idle",
        data: null,
        error: null,
        locationFile: selectedLocationFile,
      });
      return;
    }

    const cachedData = comparisonCacheRef.current.get(selectedLocationFile);
    if (cachedData) {
      setComparisonDataState({
        status: "success",
        data: cachedData,
        error: null,
        locationFile: selectedLocationFile,
      });
      return;
    }

    let cancelled = false;
    const comparisonPath = `/processed_data/${hubConfig.slug}/${selectedLocationFile}`;

    setComparisonDataState({
      status: "loading",
      data: null,
      error: null,
      locationFile: selectedLocationFile,
    });

    fetchProjectionJson(comparisonPath)
      .then((data) => {
        if (cancelled) {
          return;
        }

        comparisonCacheRef.current.set(selectedLocationFile, data);
        setComparisonDataState({
          status: "success",
          data,
          error: null,
          locationFile: selectedLocationFile,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setComparisonDataState({
          status: "error",
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Could not load submitted model comparison data.",
          locationFile: selectedLocationFile,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [compareWithSubmittingModels, hubConfig.slug, selectedLocationFile]);

  const comparisonLocationData =
    compareWithSubmittingModels &&
    comparisonDataState.status === "success" &&
    comparisonDataState.locationFile === selectedLocationFile
      ? comparisonDataState.data
      : null;
  const filteredComparisonLocationData = useMemo(
    () => filterComparisonLocationData(comparisonLocationData, locationData),
    [comparisonLocationData, locationData],
  );

  const targetOptions = useMemo(
    () => getTargetOptions(locationData),
    [locationData],
  );
  const { hasMedian, intervalDefinitions } = useMemo(
    () => getPredictionIntervalDefinitions(locationData, selectedTarget),
    [locationData, selectedTarget],
  );
  const intervalOptions = useMemo(
    () => [
      ...(hasMedian ? [{ value: "median", label: "Median" }] : []),
      ...intervalDefinitions.map((definition) => ({
        value: definition.key,
        label: definition.label,
      })),
    ],
    [hasMedian, intervalDefinitions],
  );

  useEffect(() => {
    if (!targetOptions.length) {
      setSelectedTarget(null);
      return;
    }
    setSelectedTarget((current) =>
      current && targetOptions.some((option) => option.value === current)
        ? current
        : targetOptions[0].value,
    );
  }, [targetOptions]);

  useEffect(() => {
    if (!intervalOptions.length) {
      setIntervalVisibility({});
      return;
    }

    setIntervalVisibility((current) => {
      const nextVisibility = {};
      intervalOptions.forEach((option) => {
        nextVisibility[option.value] =
          current?.[option.value] === undefined ? true : current[option.value];
      });
      return nextVisibility;
    });
  }, [intervalOptions]);

  const models = useMemo(
    () => getModelsForTarget(locationData, selectedTarget),
    [locationData, selectedTarget],
  );
  const submittedModels = useMemo(
    () => getModelsForTarget(filteredComparisonLocationData, selectedTarget),
    [filteredComparisonLocationData, selectedTarget],
  );

  useEffect(() => {
    if (!models.length) {
      setSelectedModels([]);
      return;
    }
    setSelectedModels((current) => {
      const stillValid = current.filter((model) => models.includes(model));
      return stillValid.length ? stillValid : [models[0]];
    });
  }, [models]);

  const selectedSubmittedModels = useMemo(() => {
    if (!submittedModels.length) {
      return [];
    }

    const stillValid = preferredSubmittedModels.filter((model) =>
      submittedModels.includes(model),
    );

    return stillValid.length ? stillValid : [submittedModels[0]];
  }, [preferredSubmittedModels, submittedModels]);

  const handleSubmittedModelSelectionChange = useCallback((nextModels) => {
    setPreferredSubmittedModels(nextModels);
  }, []);

  const stableSubmittedModelOrder = useMemo(() => {
    const nextOrder = extendStableModelOrder(
      submittedModelOrderRef.current,
      selectedSubmittedModels,
    );
    submittedModelOrderRef.current = nextOrder;
    return nextOrder;
  }, [selectedSubmittedModels]);

  const stableUserModelOrder = useMemo(() => {
    const nextOrder = extendStableModelOrder(
      userModelOrderRef.current,
      selectedModels,
    );
    userModelOrderRef.current = nextOrder;
    return nextOrder;
  }, [selectedModels]);

  const submittedModelPalette = useMemo(() => {
    const reservedColors = new Set(
      selectedModels
        .map((model) => {
          const index = stableUserModelOrder.indexOf(model);
          if (index < 0) {
            return null;
          }

          return MODEL_COLORS[index % MODEL_COLORS.length];
        })
        .filter(Boolean),
    );

    const availableColors = MODEL_COLORS.filter(
      (color) => !reservedColors.has(color),
    );

    return availableColors.length ? availableColors : MODEL_COLORS;
  }, [selectedModels, stableUserModelOrder]);

  const submittedModelColorFn = useCallback(
    (model) => {
      const index = stableSubmittedModelOrder.indexOf(model);
      if (index < 0) {
        return null;
      }

      return submittedModelPalette[index % submittedModelPalette.length];
    },
    [stableSubmittedModelOrder, submittedModelPalette],
  );

  const availableDates = useMemo(
    () => getAllForecastDates(projectionOutputs),
    [projectionOutputs],
  );

  useEffect(() => {
    if (!availableDates.length) {
      setSelectedDates([]);
      setActiveDate(null);
      return;
    }
    const latestDate = availableDates[availableDates.length - 1];
    setSelectedDates((current) =>
      current.length
        ? current.filter((date) => availableDates.includes(date))
        : [latestDate],
    );
    setActiveDate((current) =>
      current && availableDates.includes(current) ? current : latestDate,
    );
  }, [availableDates]);

  const activeModels = useMemo(() => {
    const activeModelSet = new Set();
    if (!locationData?.forecasts || !selectedTarget || !selectedDates.length) {
      return activeModelSet;
    }

    selectedDates.forEach((date) => {
      const targetData = locationData.forecasts?.[date]?.[selectedTarget];
      if (!targetData) return;
      Object.keys(targetData).forEach((model) => activeModelSet.add(model));
    });

    return activeModelSet;
  }, [locationData, selectedTarget, selectedDates]);
  const activeSubmittedModels = useMemo(() => {
    const activeModelSet = new Set();
    if (
      !filteredComparisonLocationData?.forecasts ||
      !selectedTarget ||
      !selectedDates.length
    ) {
      return activeModelSet;
    }

    selectedDates.forEach((date) => {
      const targetData =
        filteredComparisonLocationData.forecasts?.[date]?.[selectedTarget];
      if (!targetData) return;
      Object.keys(targetData).forEach((model) => activeModelSet.add(model));
    });

    return activeModelSet;
  }, [filteredComparisonLocationData, selectedTarget, selectedDates]);

  const sqrtTransform = useMemo(() => {
    if (chartScale !== "sqrt") return null;
    return (value) => Math.sqrt(Math.max(0, value));
  }, [chartScale]);

  const { traces, rawYRange } = useQuantileForecastTraces({
    groundTruth: locationData?.ground_truth,
    forecasts: locationData?.forecasts,
    selectedDates,
    selectedModels,
    target: selectedTarget,
    showLegendForFirstDate: showLegend,
    showMedian: intervalVisibility.median ?? hasMedian,
    fillMissingQuantiles: false,
    intervalDefinitions,
    intervalVisibility,
    transformY: sqrtTransform,
  });
  const {
    traces: submittedModelTraceBundle,
    rawYRange: submittedModelRawYRange,
  } = useQuantileForecastTraces({
    groundTruth: locationData?.ground_truth,
    forecasts: filteredComparisonLocationData?.forecasts,
    selectedDates,
    selectedModels: selectedSubmittedModels,
    target: selectedTarget,
    showLegendForFirstDate: showLegend,
    showMedian: true,
    show50: true,
    show95: true,
    modelColorFn: submittedModelColorFn,
    modelOrder: stableSubmittedModelOrder,
    modelHoverBuilder: buildComparisonHoverText,
    transformY: sqrtTransform,
  });
  const submittedModelTraces = useMemo(
    () => submittedModelTraceBundle.slice(1),
    [submittedModelTraceBundle],
  );
  const allTraces = useMemo(
    () => [...traces, ...submittedModelTraces],
    [submittedModelTraces, traces],
  );
  const combinedRawYRange = useMemo(() => {
    const ranges = [rawYRange, submittedModelRawYRange].filter(Boolean);
    if (!ranges.length) {
      return null;
    }

    return [
      Math.min(...ranges.map((range) => range[0])),
      Math.max(...ranges.map((range) => range[1])),
    ];
  }, [rawYRange, submittedModelRawYRange]);

  const calculateYRange = useCallback((chartData, currentXRange) => {
    if (
      !chartData ||
      !currentXRange ||
      !Array.isArray(chartData) ||
      chartData.length === 0
    ) {
      return null;
    }

    const [startX, endX] = currentXRange;
    const startDate = new Date(startX);
    const endDate = new Date(endX);
    let minY = Infinity;
    let maxY = -Infinity;

    chartData.forEach((trace) => {
      if (!trace?.x || !trace?.y) return;
      trace.x.forEach((xValue, index) => {
        const pointDate = new Date(xValue);
        const yValue = Number(trace.y[index]);
        if (
          pointDate >= startDate &&
          pointDate <= endDate &&
          !Number.isNaN(yValue)
        ) {
          minY = Math.min(minY, yValue);
          maxY = Math.max(maxY, yValue);
        }
      });
    });

    if (minY === Infinity || maxY === -Infinity) return null;
    const padding = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
    return [Math.max(0, minY - padding), maxY + padding];
  }, []);

  const defaultRange = useMemo(
    () =>
      getDefaultViewerRange(
        locationData?.ground_truth?.dates,
        selectedDates,
        false,
      ),
    [locationData, selectedDates],
  );

  useEffect(() => {
    setXAxisRange(null);
  }, [selectedLocationFile, selectedTarget]);

  useEffect(() => {
    if (chartScale === "log") {
      setYAxisRange(null);
      return;
    }
    const currentRange = xAxisRange || defaultRange;
    if (allTraces.length > 0 && currentRange) {
      setYAxisRange(calculateYRange(allTraces, currentRange));
    } else {
      setYAxisRange(null);
    }
  }, [allTraces, xAxisRange, defaultRange, calculateYRange, chartScale]);

  const sqrtTicks = useMemo(() => {
    if (chartScale !== "sqrt") return null;
    return buildSqrtTicks({ rawRange: combinedRawYRange });
  }, [chartScale, combinedRawYRange]);

  const handlePlotUpdate = useCallback((figure) => {
    if (isResettingRef.current) {
      isResettingRef.current = false;
      return;
    }
    if (figure?.["xaxis.range"]) {
      setXAxisRange(figure["xaxis.range"]);
    }
  }, []);

  const layout = useMemo(
    () => ({
      autosize: true,
      template: colorScheme === "dark" ? "plotly_dark" : "plotly_white",
      paper_bgcolor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
      plot_bgcolor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
      font: { color: colorScheme === "dark" ? "#c1c2c5" : "#000000" },
      showlegend: showLegend,
      legend: {
        x: 0,
        y: 1,
        bgcolor:
          colorScheme === "dark"
            ? "rgba(26, 27, 30, 0.8)"
            : "rgba(255,255,255,0.8)",
        font: { size: 10 },
      },
      hovermode: "closest",
      dragmode: false,
      margin: { l: 60, r: 30, t: 30, b: 30 },
      xaxis: {
        rangeslider: {
          range: getDefaultViewerRange(
            locationData?.ground_truth?.dates,
            selectedDates,
            true,
          ),
        },
        range: xAxisRange || defaultRange,
      },
      yaxis: {
        title: selectedTarget || "Value",
        range: chartScale === "log" ? undefined : yAxisRange,
        autorange: chartScale === "log" ? true : yAxisRange === null,
        type: chartScale === "log" ? "log" : "linear",
        tickmode: chartScale === "sqrt" && sqrtTicks ? "array" : undefined,
        tickvals:
          chartScale === "sqrt" && sqrtTicks ? sqrtTicks.tickvals : undefined,
        ticktext:
          chartScale === "sqrt" && sqrtTicks ? sqrtTicks.ticktext : undefined,
      },
      shapes: selectedDates.map((date) => ({
        type: "line",
        x0: date,
        x1: date,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: "red", width: 1, dash: "dash" },
      })),
    }),
    [
      colorScheme,
      showLegend,
      locationData,
      selectedDates,
      xAxisRange,
      defaultRange,
      selectedTarget,
      chartScale,
      yAxisRange,
      sqrtTicks,
    ],
  );

  const config = useMemo(
    () => ({
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      showSendToCloud: false,
      scrollZoom: false,
      modeBarButtonsToRemove: ["resetScale2d", "select2d", "lasso2d"],
      modeBarButtonsToAdd: [
        {
          name: "Reset view",
          icon: Plotly.Icons.home,
          click: (gd) => {
            const range = getDefaultViewerRange(
              locationData?.ground_truth?.dates,
              selectedDates,
              false,
            );
            const nextYRange =
              chartScale === "log" || !range
                ? null
                : calculateYRange(allTraces, range);
            isResettingRef.current = true;
            setXAxisRange(null);
            setYAxisRange(nextYRange);
            Plotly.relayout(gd, {
              "xaxis.range": range,
              "yaxis.range": nextYRange,
              "yaxis.autorange": chartScale === "log" || nextYRange === null,
            });
          },
        },
      ],
    }),
    [allTraces, locationData, selectedDates, chartScale, calculateYRange],
  );

  if ((!isMetrocast && !locationOptions.length) || !locationData) {
    return null;
  }

  return (
    <Paper withBorder radius="lg" p="lg">
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {isMetrocast ? (
            <Select
              label="State"
              data={metroHierarchy?.stateOptions ?? []}
              value={selectedMetroState}
              onChange={setSelectedMetroState}
              allowDeselect={false}
            />
          ) : (
            <Select
              label="Location"
              data={locationOptions}
              value={selectedLocationFile}
              onChange={setSelectedLocationFile}
              allowDeselect={false}
            />
          )}
          {isMetrocast ? (
            <Select
              label="Location"
              data={scopedMetroLocationOptions}
              value={selectedLocationFile}
              onChange={setSelectedLocationFile}
              allowDeselect={false}
              disabled={!scopedMetroLocationOptions.length}
            />
          ) : (
            <Select
              label="Target"
              data={targetOptions}
              value={selectedTarget}
              onChange={setSelectedTarget}
              allowDeselect={false}
              disabled={!targetOptions.length}
            />
          )}
        </SimpleGrid>

        {isMetrocast && (
          <Select
            label="Target"
            data={targetOptions}
            value={selectedTarget}
            onChange={setSelectedTarget}
            allowDeselect={false}
            disabled={!targetOptions.length}
          />
        )}

        <Paper withBorder radius="md" p="sm">
          <Stack gap="sm">
            <Text fw={600} size="sm">
              Advanced controls (your model(s))
            </Text>
            <ForecastChartControls
              chartScale={chartScale}
              setChartScale={setChartScale}
              intervalVisibility={intervalVisibility}
              setIntervalVisibility={setIntervalVisibility}
              showLegend={showLegend}
              setShowLegend={setShowLegend}
              intervalOptions={intervalOptions}
            />
          </Stack>
        </Paper>

        <DateSelector
          availableDates={availableDates}
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
        />

        <div
          style={{
            width: "100%",
            height: "min(800px, 60vh)",
            minHeight: 320,
          }}
        >
          <Plot
            ref={plotRef}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            data={allTraces}
            layout={layout}
            config={config}
            onRelayout={handlePlotUpdate}
          />
        </div>

        <ModelSelector
          models={models}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          activeModels={activeModels}
        />

        <Paper withBorder radius="md" p="sm">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">
                Compare with submitting models
              </Text>
              <Switch
                checked={compareWithSubmittingModels}
                onChange={(event) =>
                  setCompareWithSubmittingModels(event.currentTarget.checked)
                }
                disabled={!comparisonEligibility?.isEligible}
                size="sm"
              />
            </Group>
            {compareWithSubmittingModels &&
              comparisonDataState.status === "loading" && (
                <Group gap="xs">
                  <Loader size="sm" color="blue" />
                  <Text size="sm" c="dimmed">
                    Loading submitted model data for this location...
                  </Text>
                </Group>
              )}
            {compareWithSubmittingModels &&
              comparisonDataState.status === "error" && (
                <Alert
                  color="red"
                  variant="light"
                  radius="md"
                  icon={<IconAlertCircle size={16} />}
                >
                  {comparisonDataState.error}
                </Alert>
              )}
          </Stack>
        </Paper>

        {compareWithSubmittingModels &&
          comparisonDataState.status === "success" && (
            <Stack gap="xs">
              <ModelSelector
                models={submittedModels}
                selectedModels={selectedSubmittedModels}
                setSelectedModels={handleSubmittedModelSelectionChange}
                activeModels={activeSubmittedModels}
                modelColorFn={submittedModelColorFn}
              />
            </Stack>
          )}
      </Stack>
    </Paper>
  );
};

const HubSelectionScreen = () => {
  const navigate = useNavigate();
  const [opened, { toggle }] = useDisclosure(false);
  const [hoveredHub, setHoveredHub] = useState(null);

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
            <Title order={1} c="blue">
              MyRespiLens
            </Title>
            <Text size="lg">
              Select a hub and drop your data for instant visualization!
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {HUB_OPTIONS.map((hub) => (
              <Paper
                key={hub.slug}
                withBorder
                radius="xl"
                p="xl"
                onMouseEnter={() => setHoveredHub(hub.slug)}
                onMouseLeave={() => setHoveredHub(null)}
                onClick={() => navigate(`/myrespilens/${hub.slug}`)}
                style={{
                  aspectRatio: "1 / 1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  transform:
                    hoveredHub === hub.slug
                      ? "translateY(-6px)"
                      : "translateY(0)",
                  boxShadow:
                    hoveredHub === hub.slug
                      ? "0 14px 30px rgba(37, 99, 235, 0.18)"
                      : "0 4px 12px rgba(15, 23, 42, 0.06)",
                  borderColor:
                    hoveredHub === hub.slug
                      ? "var(--mantine-color-blue-4)"
                      : undefined,
                  transition: "transform 160ms ease, box-shadow 160ms ease",
                }}
              >
                <Stack align="center" gap="sm">
                  <ThemeIcon size={56} radius="xl" variant="light" color="blue">
                    <IconBrandGithub size={28} />
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
              color="blue"
              leftSection={<IconInfoCircle size={16} />}
              onClick={toggle}
            >
              What is MyRespiLens?
            </Button>
            <Button
              component="a"
              href="/myrespilens/documentation"
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
              MyRespiLens is a tool that allows you to visualize your own
              respiratory disease forecast data <b>instantly</b> and{" "}
              <b>privately.</b> Simply <b>select the hub</b> your data
              corresponds to, <b>drag 'n drop your forecast data</b>, and then{" "}
              <b>interact with your personalized visualization dashboard</b>.
              Your data will not leave your machine, which means that your
              visualizations are not shareable via URL. User-provided model data
              must be in the Hubverse <code>.csv</code> format in order to be
              visualized with MyRespiLens.
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
  const referenceDataPromiseRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);
  const [validationState, setValidationState] = useState(null);
  const [pathogenWarning, setPathogenWarning] = useState(null);
  const [projectionBuildState, setProjectionBuildState] = useState({
    status: "idle",
    outputs: null,
    error: null,
    comparisonEligibility: null,
  });
  const [referenceDataState, setReferenceDataState] = useState({
    status: "idle",
    data: null,
    error: null,
  });

  useEffect(() => {
    setDragActive(false);
    setIsUploadProcessing(false);
    setValidationState(null);
    setPathogenWarning(null);
    setProjectionBuildState({
      status: "idle",
      outputs: null,
      error: null,
      comparisonEligibility: null,
    });
    referenceDataPromiseRef.current = null;
    setReferenceDataState({
      status: "idle",
      data: null,
      error: null,
    });
  }, [hub]);

  useEffect(() => {
    if (referenceDataState.status === "error") {
      setIsUploadProcessing(false);
    }
  }, [referenceDataState.status]);

  const ensureReferenceDataLoaded = useCallback(async () => {
    if (!hubConfig) {
      throw new Error("This hub is not configured.");
    }

    if (referenceDataState.status === "success" && referenceDataState.data) {
      return referenceDataState.data;
    }

    if (referenceDataPromiseRef.current) {
      return referenceDataPromiseRef.current;
    }

    setReferenceDataState({
      status: "loading",
      data: null,
      error: null,
    });

    const loadPromise = loadHubReferenceData(hubConfig)
      .then((data) => {
        setReferenceDataState({
          status: "success",
          data,
          error: null,
        });
        return data;
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load the hub reference files.";

        setReferenceDataState({
          status: "error",
          data: null,
          error: message,
        });
        throw new Error(message);
      })
      .finally(() => {
        referenceDataPromiseRef.current = null;
      });

    referenceDataPromiseRef.current = loadPromise;
    return loadPromise;
  }, [hubConfig, referenceDataState.data, referenceDataState.status]);

  const processFiles = useCallback(
    async (incomingFiles) => {
      if (!hubConfig) {
        return;
      }

      setIsUploadProcessing(true);

      const files = Array.from(incomingFiles ?? []);
      const csvFiles = files.filter((file) =>
        file.name.toLowerCase().endsWith(".csv"),
      );

      if (csvFiles.length === 0) {
        setValidationState({
          status: "error",
          errors: [
            "Please upload at least one Hubverse forecast file in `.csv` format.",
          ],
        });
        setProjectionBuildState({
          status: "idle",
          outputs: null,
          error: null,
          comparisonEligibility: null,
        });
        setPathogenWarning(null);
        setIsUploadProcessing(false);
        return;
      }

      setValidationState(null);
      setPathogenWarning(null);
      setProjectionBuildState({
        status: "idle",
        outputs: null,
        error: null,
        comparisonEligibility: null,
      });

      try {
        const parsedFiles = await Promise.all(
          csvFiles.map(async (file) => {
            const text = await file.text();
            const rows = parseCsv(text);
            const { headers, records } = toObjects(rows);
            return {
              fileName: getFileRelativePath(file),
              headers,
              records,
            };
          }),
        );

        const missingColumnsByFile = parsedFiles
          .map((parsedFile) => ({
            fileName: parsedFile.fileName,
            missingColumns: FORECAST_REQUIRED_COLUMNS.filter(
              (column) => !parsedFile.headers.includes(column),
            ),
          }))
          .filter((entry) => entry.missingColumns.length > 0);

        if (missingColumnsByFile.length > 0) {
          setValidationState({
            status: "error",
            errors: missingColumnsByFile
              .slice(0, 5)
              .map(
                (entry) =>
                  `${entry.fileName} is missing required forecast columns: ${entry.missingColumns.join(", ")}.`,
              ),
          });
          setIsUploadProcessing(false);
          return;
        }

        const concatenatedRecords = parsedFiles.flatMap(
          (parsedFile) => parsedFile.records,
        );
        const validation = validateHubverseCsv(concatenatedRecords, hubConfig);

        if (!validation.ok) {
          setValidationState({
            status: "error",
            errors: validation.errors,
            summary: validation.summary,
          });
          setIsUploadProcessing(false);
          return;
        }

        setValidationState({
          status: "success",
          summary: validation.summary,
        });
        setPathogenWarning(
          buildHubPathogenWarning(validation.usableRows, hubConfig),
        );

        const referenceData = await ensureReferenceDataLoaded();

        if (!referenceData.timeSeries.records) {
          setIsUploadProcessing(false);
          setProjectionBuildState({
            status: "error",
            outputs: null,
            error:
              "This hub's time-series file was found, but it is not currently in a CSV format the frontend can process.",
            comparisonEligibility: null,
          });
          return;
        }

        const outputs = buildProjectionOutputs({
          hubConfig,
          forecastRows: validation.usableRows,
          locationsRows: referenceData.locations.records,
          targetRows: referenceData.timeSeries.records,
        });

        setProjectionBuildState({
          status: "success",
          outputs,
          error: null,
          comparisonEligibility: buildComparisonEligibility(
            validation.usableRows,
          ),
        });
        setIsUploadProcessing(false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The file could not be processed.";

        setIsUploadProcessing(false);
        setProjectionBuildState({
          status: "error",
          outputs: null,
          error: message,
          comparisonEligibility: null,
        });

        setValidationState((previousState) =>
          previousState?.status === "success"
            ? previousState
            : {
                status: "error",
                errors: [message],
              },
        );
      }
    },
    [ensureReferenceDataLoaded, hubConfig],
  );

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isUploadProcessing) {
        return;
      }
      setDragActive(false);
      const droppedFiles = await collectDroppedFiles(event.dataTransfer);
      if (droppedFiles.length) {
        processFiles(droppedFiles);
      }
    },
    [isUploadProcessing, processFiles],
  );

  const handleFileSelect = useCallback(
    (event) => {
      if (isUploadProcessing) {
        event.target.value = "";
        return;
      }
      if (event.target.files?.length) {
        processFiles(event.target.files);
      }
      event.target.value = "";
    },
    [isUploadProcessing, processFiles],
  );

  const handleResetUpload = useCallback(() => {
    setDragActive(false);
    setIsUploadProcessing(false);
    setValidationState(null);
    setPathogenWarning(null);
    setProjectionBuildState({
      status: "idle",
      outputs: null,
      error: null,
      comparisonEligibility: null,
    });
  }, []);

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
          <Group justify="space-between" align="center">
            <Stack gap={4}>
              <Group gap="xs" align="center">
                <Tooltip label="Back to hub selection" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    size="xl"
                    radius="xl"
                    onClick={() => navigate("/myrespilens")}
                    aria-label="Back to hub selection"
                  >
                    <IconArrowLeft size={24} stroke={2.25} />
                  </ActionIcon>
                </Tooltip>
                <Title order={1}>{hubConfig.label}</Title>
                <Tooltip label="Open hub GitHub" withArrow>
                  <ActionIcon
                    component="a"
                    href={hubConfig.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="subtle"
                    color="blue"
                    radius="xl"
                    aria-label={`Open ${hubConfig.label} GitHub`}
                  >
                    <IconBrandGithub size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Stack>
          </Group>

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

          {projectionBuildState.status === "success" && (
            <>
              {pathogenWarning && (
                <Alert
                  color="red"
                  variant="light"
                  radius="lg"
                  icon={<IconInfoCircle size={16} />}
                  title="Possible hub mismatch"
                >
                  {pathogenWarning}
                </Alert>
              )}
              <Button
                variant="subtle"
                onClick={handleResetUpload}
                px={0}
                w="fit-content"
              >
                Upload different file(s)
              </Button>
              <MyRespiVisualizationPanel
                projectionOutputs={projectionBuildState.outputs}
                hubConfig={hubConfig}
                comparisonEligibility={
                  projectionBuildState.comparisonEligibility
                }
              />
            </>
          )}

          {projectionBuildState.status !== "success" && (
            <Paper
              withBorder
              radius="xl"
              p="xl"
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (isUploadProcessing) {
                  return;
                }
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
              onClick={() => {
                if (isUploadProcessing) {
                  return;
                }
                document
                  .getElementById("myrespi-hubverse-files-input")
                  ?.click();
              }}
              style={{
                cursor: isUploadProcessing ? "progress" : "pointer",
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
                {isUploadProcessing ? (
                  <Loader color="blue" size="xl" />
                ) : (
                  <ThemeIcon
                    size={84}
                    radius="xl"
                    variant="light"
                    color={dragActive ? "blue" : "gray"}
                  >
                    <IconUpload size={40} />
                  </ThemeIcon>
                )}
                <Stack gap="xs" ta="center">
                  <Title order={2}>
                    {isUploadProcessing
                      ? "Processing your uploaded data"
                      : "Drop your Hubverse-style CSV file(s) here"}
                  </Title>
                  <Text c="dimmed">
                    {isUploadProcessing ? (
                      "This could take a moment..."
                    ) : (
                      <>
                        Visit the MyRespiLens{" "}
                        <Anchor
                          href="/myrespilens/documentation"
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          documentation
                        </Anchor>{" "}
                        page to learn more about what makes your data valid.
                      </>
                    )}
                  </Text>
                </Stack>
                <input
                  id="myrespi-hubverse-files-input"
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </Stack>
            </Paper>
          )}

          {projectionBuildState.status === "error" && (
            <Alert
              color="red"
              radius="lg"
              title="Could not create projections JSON"
              icon={<IconAlertCircle size={16} />}
            >
              {projectionBuildState.error}
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
                <Text>CSV validation failed:</Text>
                {validationState.summary && (
                  <ValidationSummary summary={validationState.summary} />
                )}

                <List spacing="xs">
                  {validationState.errors.map((error) => (
                    <List.Item key={error}>{error}</List.Item>
                  ))}
                </List>
                <Text size="sm" c="dimmed">
                  Check the MyRespiLens{" "}
                  <Anchor
                    href="/myrespilens/documentation"
                    target="_blank"
                    rel="noreferrer"
                  >
                    documentation
                  </Anchor>{" "}
                  for the expected upload format and validation rules.
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
