import { useEffect, useMemo, useState } from 'react';

const DATASET_DEFINITIONS = [
  {
    key: 'flusight',
    label: 'Influenza Hospitalizations (FluSight)',
    dataPath: 'flusight',
    fileSuffix: 'flu.json',
    targetKey: 'wk inc flu hosp',
    defaultHorizons: [1, 2, 3],
  },
  {
    key: 'rsv',
    label: 'RSV Hospitalizations (RSV Forecast Hub)',
    dataPath: 'rsvforecasthub',
    fileSuffix: 'rsv.json',
    targetKey: 'wk inc rsv hosp',
    defaultHorizons: [1, 2, 3],
  },
  {
    key: 'covid19',
    label: 'COVID-19 Hospitalizations (COVID-19 Forecast Hub)',
    dataPath: 'covid19forecasthub',
    fileSuffix: 'covid19.json',
    targetKey: 'wk inc covid hosp',
    defaultHorizons: [1, 2, 3],
  },
];

const hashString = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
};

const createRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const pickDeterministic = (items, rng) => {
  if (!items || items.length === 0) return null;
  const index = Math.floor(rng() * items.length) % items.length;
  return items[index];
};

const fetchJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const getEasternDateKey = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

const toNumberSet = (values = []) => {
  return new Set(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value)),
  );
};

const extractPositiveHorizons = (forecastsForDate, targetKey) => {
  const horizons = new Set();
  const targetForecasts = forecastsForDate?.[targetKey];
  if (!targetForecasts) return horizons;

  Object.values(targetForecasts).forEach((modelForecast) => {
    Object.keys(modelForecast?.predictions || {}).forEach((horizonKey) => {
      const horizon = Number(horizonKey);
      if (Number.isFinite(horizon) && horizon > 0) {
        horizons.add(horizon);
      }
    });
  });
  return horizons;
};

// Deterministically select a scenario for the daily challenge.
// We only consider forecast dates/locations that contain the required
// target and horizons so the user always receives a fully-specified task.
const ensureValidScenario = async (rng, datasetMeta) => {
  const locationOptions = datasetMeta.metadata?.locations?.filter((loc) => loc?.abbreviation) || [];
  if (locationOptions.length === 0) {
    return null;
  }

  const attemptLimit = Math.min(20, locationOptions.length * 2);

  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const location = pickDeterministic(locationOptions, rng);
    if (!location) {
      continue;
    }

    const filePath = `/processed_data/${datasetMeta.definition.dataPath}/${location.abbreviation}_${datasetMeta.definition.fileSuffix}`;
    let locationData;
    try {
      locationData = await fetchJson(filePath);
    } catch (error) {
      console.warn(`Forecastle: Unable to load data file ${filePath}`, error);
      continue;
    }

    const forecastsEntries = Object.entries(locationData.forecasts || {});
    if (forecastsEntries.length === 0) {
      continue;
    }

    const validForecasts = forecastsEntries.filter(([, targets]) => {
      const horizonSet = extractPositiveHorizons(targets, datasetMeta.definition.targetKey);
      if (horizonSet.size === 0) {
        return false;
      }
      const requiredHorizons = datasetMeta.requiredHorizons;
      return requiredHorizons.every((horizon) => horizonSet.has(horizon));
    });

    if (validForecasts.length === 0) {
      continue;
    }

    const [forecastDate, forecastTargets] = pickDeterministic(validForecasts, rng) || [];
    if (!forecastDate || !forecastTargets) {
      continue;
    }

    const horizonSet = extractPositiveHorizons(forecastTargets, datasetMeta.definition.targetKey);
    const availableHorizons = Array.from(horizonSet.values()).sort((a, b) => a - b);

    const groundTruthDates = locationData.ground_truth?.dates || [];
    const groundTruthValues = locationData.ground_truth?.[datasetMeta.definition.targetKey] || [];
    const groundTruthSeries = groundTruthDates.map((date, index) => ({
      date,
      value: groundTruthValues[index] ?? null,
    }));

    const filteredSeries = groundTruthSeries.filter((entry) => entry.value !== null);
    // Only surface observations at or before the forecast date so the player
    // never sees future ground truth when making their guess.
    const forecastTimestamp = new Date(forecastDate).getTime();
    const historicalSeries = filteredSeries.filter((entry) => {
      const entryTime = new Date(entry.date).getTime();
      return Number.isFinite(entryTime) && entryTime <= forecastTimestamp;
    });

    const recentSeries = historicalSeries.slice(-26);

    if (recentSeries.length === 0) {
      continue;
    }

    return {
      dataset: datasetMeta.definition,
      metadata: datasetMeta.metadata,
      location,
      forecastDate,
      availableHorizons,
      groundTruthSeries: recentSeries,
      fullGroundTruthSeries: historicalSeries,
      dataFilePath: filePath,
    };
  }

  return null;
};

export const useForecastleScenario = () => {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const challengeDateKey = useMemo(() => getEasternDateKey(), []);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      // We reseed the RNG with the same key for everyone each day so the
      // challenge is identical across users but changes predictably at midnight
      // Eastern. At midnight, the `challengeDateKey` changes and triggers a rerun.
      setLoading(true);
      setError(null);
      try {
        const datasetMetas = await Promise.all(
          DATASET_DEFINITIONS.map(async (definition) => {
            const metadata = await fetchJson(`/processed_data/${definition.dataPath}/metadata.json`);
            const horizonSet = toNumberSet(metadata?.hubverse_keys?.horizons || []);
            const requiredHorizons = definition.defaultHorizons.filter((horizon) => horizonSet.has(horizon));
            return {
              definition,
              metadata,
              requiredHorizons: requiredHorizons.length > 0 ? requiredHorizons : definition.defaultHorizons,
            };
          }),
        );

        const seed = hashString(`forecastle-${challengeDateKey}`);
        const rng = createRng(seed);

        const attemptOrder = [...datasetMetas].sort(() => rng() - 0.5);
        let resolvedScenario = null;

        for (let i = 0; i < attemptOrder.length; i += 1) {
        const candidate = await ensureValidScenario(rng, attemptOrder[i]);
          if (candidate) {
            resolvedScenario = {
              challengeDate: challengeDateKey,
              dataset: {
                key: candidate.dataset.key,
                label: candidate.dataset.label,
                targetKey: candidate.dataset.targetKey,
                dataPath: candidate.dataset.dataPath,
              },
              location: {
                abbreviation: candidate.location.abbreviation,
                name: candidate.location.location_name,
                fips: candidate.location.location,
              },
              forecastDate: candidate.forecastDate,
              horizons: candidate.availableHorizons,
              groundTruthSeries: candidate.groundTruthSeries,
              dataFilePath: candidate.dataFilePath,
            };
            break;
          }
        }

        if (!resolvedScenario) {
          throw new Error('Unable to generate Forecastle scenario for today.');
        }

        if (!isCancelled) {
          setScenario(resolvedScenario);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Forecastle scenario error', err);
          setError(err instanceof Error ? err : new Error('Unknown error generating scenario'));
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [challengeDateKey]);

  return { scenario, loading, error };
};
