import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/paths';

export const useForecastData = (location, viewType) => {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    if (!location || !viewType) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      setMetadata(null); 

      try {
        const datasetMap = {
          'fludetailed': 'flusight', 'flu_ts': 'flusight',
          'covid_ts': 'covid19', 'rsv_ts': 'rsv',
          'nhsnall': 'nhsn'
        };
        const dataset = datasetMap[viewType];
        if (!dataset) throw new Error(`Unknown view type: ${viewType}`);

        const dataPath = getDataPath(`${dataset}/${location}_${dataset}.json`);
        const metadataPath = getDataPath(`${dataset}/metadata.json`);
        
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
        }

      } catch (err) {
        console.error('Error fetching forecast data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location, viewType]);

  return { data, metadata, loading, error, availableDates, models };
};