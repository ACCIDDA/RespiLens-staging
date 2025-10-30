import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/paths';

export const useForecastData = (location, viewType) => {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [models, setModels] = useState([]);
  const [availableTargets, setAvailableTargets] = useState([]);

  useEffect(() => {
    if (!location || !viewType) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      setMetadata(null);
      setAvailableTargets([])

      try {
        // Updated map to hold both the directory name and the file suffix
        const datasetMap = {
          'fludetailed': { directory: 'flusight', suffix: 'flu' },
          'flu_projs': { directory: 'flusight', suffix: 'flu' },
          'covid_projs': { directory: 'covid19forecasthub', suffix: 'covid19' },
          'rsv_projs': { directory: 'rsvforecasthub', suffix: 'rsv' },
          'nhsnall': { directory: 'nhsn', suffix: 'nhsn' }
        };

        const datasetConfig = datasetMap[viewType];
        if (!datasetConfig) throw new Error(`Unknown view type: ${viewType}`);

        // Build paths using the new directory and suffix properties
        const dataPath = getDataPath(`${datasetConfig.directory}/${location}_${datasetConfig.suffix}.json`);
        const metadataPath = getDataPath(`${datasetConfig.directory}/metadata.json`);
        
        const [dataResponse, metadataResponse] = await Promise.all([
          fetch(dataPath),
          fetch(metadataPath)
        ]);

        if (!dataResponse.ok) throw new Error(`Failed to fetch data: ${dataResponse.status}`);
        if (!metadataResponse.ok) throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);

        const jsonData = await dataResponse.json();
        const jsonMetadata = await metadataResponse.json();

        setData(jsonData);
        setMetadata(jsonMetadata);

        if (jsonData.forecasts) {
          const dates = Object.keys(jsonData.forecasts).sort();
          setAvailableDates(dates);
          
          const modelSet = new Set();
          Object.values(jsonData.forecasts).forEach(dateData => {
            Object.values(dateData).forEach(targetData => {
              Object.keys(targetData).forEach(model => modelSet.add(model));
            });
          });
          setModels(Array.from(modelSet).sort());
        };

        let targets = [];
        if (jsonData?.ground_truth) {
          targets = Object.keys(jsonData.ground_truth).filter(key => key !== 'dates');
        }
        setAvailableTargets(targets);

      } catch (err) {
        console.error('Error fetching forecast data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location, viewType]);

  return { data, metadata, loading, error, availableDates, models, availableTargets };
};