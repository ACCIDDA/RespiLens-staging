// src/components/ForecastViz.jsx

import { useState, useEffect } from 'react';
import { Stack, Container, Paper, Group, Button, Tooltip } from '@mantine/core';
import { useView } from '../hooks/useView';
import DateSelector from './DateSelector';
import DataVisualization from './DataVisualization';
import ErrorBoundary from './ErrorBoundary';
import { IconShare } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';

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
  const clipboard = useClipboard({ timeout: 2000 });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleShare = () => {
    const url = window.location.href;
    clipboard.copy(url);
  };
  
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <Container size="xl" py="xl" style={{ maxWidth: '1400px' }}>
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md" style={{ minHeight: '70vh' }}>
            <Group justify="flex-end">
              <Tooltip label={clipboard.copied ? 'Link copied' : 'Copy link to this view'}>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconShare size={16} />}
                  onClick={handleShare}
                >
                  {clipboard.copied ? 'Copied' : 'Share'}
                </Button>
              </Tooltip>
            </Group>
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
