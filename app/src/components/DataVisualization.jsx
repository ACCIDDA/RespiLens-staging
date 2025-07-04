import React from 'react';
import { Center, Stack, Loader, Text, Alert, Button } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import FluView from './FluView';
import RSVDefaultView from './RSVDefaultView';
import NHSNRawView from './NHSNRawView';
import { CHART_CONSTANTS, RATE_CHANGE_CATEGORIES } from '../constants/chart';
import { MODEL_COLORS, getModelColor } from '../config/datasets';

/**
 * Component that handles rendering different data visualization types
 */
const DataVisualization = ({
  viewType,
  location,
  data,
  loading,
  error,
  availableDates,
  models,
  selectedDates,
  selectedModels,
  setSelectedDates,
  setActiveDate,
  setSelectedModels,
  activeDate,
  windowSize,
  searchParams
}) => {
  // Show loading state
  if (loading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading forecast data...</Text>
        </Stack>
      </Center>
    );
  }

  // Show error state
  if (error) {
    return (
      <Center h="100%">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Unable to Load Data"
          color="red"
          variant="light"
          style={{ maxWidth: 400 }}
        >
          <Stack gap="md">
            <Text size="sm">{error}</Text>
            <Button
              onClick={() => window.location.reload()}
              leftSection={<IconRefresh size={16} />}
              variant="light"
              color="red"
            >
              Retry
            </Button>
          </Stack>
        </Alert>
      </Center>
    );
  }

  // Create default range function for chart components
  const getDefaultRange = (forRangeslider = false) => {
    if (!data?.ground_truth || !selectedDates.length) return undefined;
    
    const firstGroundTruthDate = new Date(data.ground_truth.dates?.[0] || selectedDates[0]);
    const lastGroundTruthDate = new Date(data.ground_truth.dates?.slice(-1)[0] || selectedDates[0]);
    
    if (forRangeslider) {
      const rangesliderEnd = new Date(lastGroundTruthDate);
      rangesliderEnd.setDate(rangesliderEnd.getDate() + (CHART_CONSTANTS.RANGESLIDER_WEEKS_AFTER * 7));
      return [firstGroundTruthDate, rangesliderEnd];
    }
    
    const firstDate = new Date(selectedDates[0]);
    const lastDate = new Date(selectedDates[selectedDates.length - 1]);
    
    const startDate = new Date(firstDate);
    const endDate = new Date(lastDate);
    
    startDate.setDate(startDate.getDate() - (CHART_CONSTANTS.DEFAULT_WEEKS_BEFORE * 7));
    endDate.setDate(endDate.getDate() + (CHART_CONSTANTS.DEFAULT_WEEKS_AFTER * 7));
    
    return [startDate, endDate];
  };

  // Render appropriate view based on viewType
  switch (viewType) {
    case 'fludetailed':
    case 'flutimeseries':
      return (
        <FluView
          data={data}
          selectedDates={selectedDates}
          selectedModels={selectedModels}
          models={models}
          setSelectedModels={setSelectedModels}
          viewType={viewType}
          windowSize={windowSize}
          getDefaultRange={getDefaultRange}
        />
      );

    case 'rsvdetailed':
      return (
        <RSVDefaultView
          location={location}
          selectedDates={selectedDates}
          availableDates={availableDates}
          setSelectedDates={setSelectedDates}
          setActiveDate={setActiveDate}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          searchParams={searchParams}
        />
      );

    case 'nhsnall':
      return (
        <NHSNRawView 
          location={location}
        />
      );

    default:
      return (
        <Center h="100%">
          <Stack align="center" gap="md">
            <Text size="lg" fw={600}>Unknown View Type</Text>
            <Text c="dimmed" ta="center">
              The requested view type "{viewType}" is not supported.
            </Text>
          </Stack>
        </Center>
      );
  }
};

export default DataVisualization;