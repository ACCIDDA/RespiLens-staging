import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/paths';

export const useForecastData = (location, viewType) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    if (!location || !viewType) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Determine the data path based on view type
        const datasetMap = {
          'fludetailed': 'flusight',
          'flutimeseries': 'flusight', 
          'rsvdetailed': 'rsv',
          'nhsnall': 'nhsn'
        };

        const dataset = datasetMap[viewType];
        if (!dataset) {
          throw new Error(`Unknown view type: ${viewType}`);
        }

        console.log('ForecastViz useEffect triggered:', { viewType, location });
        const dataPath = getDataPath(`${dataset}/${location}_${dataset}.json`);
        console.log('Attempting to fetch:', dataPath);

        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const rawText = await response.text();
        console.log('Raw response text:', rawText.substring(0, 200) + '...');

        const jsonData = JSON.parse(rawText);
        console.log('Parsed JSON structure:', {
          hasMetadata: !!jsonData.metadata,
          hasGroundTruth: !!jsonData.ground_truth,
          topLevelKeys: Object.keys(jsonData)
        });

        setData(jsonData);

        // Extract available dates and models
        if (jsonData.forecasts) {
          const dates = Object.keys(jsonData.forecasts).sort();
          setAvailableDates(dates);
          
          // Make available dates accessible globally for reset functionality
          window.availableDates = dates;

          // Extract models from the data
          const modelSet = new Set();
          Object.values(jsonData.forecasts).forEach(dateData => {
            Object.values(dateData).forEach(targetData => {
              Object.keys(targetData).forEach(model => {
                modelSet.add(model);
              });
            });
          });

          const modelList = Array.from(modelSet).sort();
          setModels(modelList);

          console.log('Extracted models from data:', {
            modelList,
            dates
          });
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

  return {
    data,
    loading,
    error,
    availableDates,
    models
  };
};