// src/components/ForecastViz.jsx

import { useState, useEffect } from 'react';
import { Stack, Container, Paper } from '@mantine/core';
import { useView } from '../contexts/ViewContext';
import DateSelector from './DateSelector';
import DataVisualization from './DataVisualization';
import ErrorBoundary from './ErrorBoundary';

const ForecastViz = () => {
  // Get EVERYTHING from the single context hook
  const {
    selectedLocation,
    data, loading, error, availableDates, models,
    selectedModels, setSelectedModels,
    selectedDates, setSelectedDates,
    activeDate, setActiveDate,
    viewType,
    currentDataset,
    selectedColumns,
    setSelectedColumns,
  } = useView();
  
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <Container size="xl" py="xl" style={{ maxWidth: '1400px' }}>
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md" style={{ minHeight: '70vh' }}>
            {currentDataset?.hasDateSelector && (
              <DateSelector
                selectedDates={selectedDates}
                setSelectedDates={setSelectedDates}
                availableDates={availableDates}
                activeDate={activeDate}
                setActiveDate={setActiveDate}
                loading={loading}
              />
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <DataVisualization
                // DataVisualization now receives all its data as props
                viewType={viewType}
                location={selectedLocation}
                data={data}
                loading={loading}
                error={error}
                availableDates={availableDates}
                models={models}
                selectedDates={selectedDates}
                selectedModels={selectedModels}
                setSelectedDates={setSelectedDates}
                setActiveDate={setActiveDate}
                setSelectedModels={setSelectedModels}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                windowSize={windowSize}
              />
            </div>
          </Stack>
        </Paper>
      </Container>
    </ErrorBoundary>
  );
};

export default ForecastViz;