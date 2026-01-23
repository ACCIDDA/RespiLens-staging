import { useMemo } from 'react';
import { Stack, Text, Title, Center, Alert, Code, Group } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import LastFetched from './LastFetched';

const MetroCastView = ({ data, metadata, selectedTarget, windowSize }) => {
  // 1. Data Presence Logic
  const hasForecasts = data && data.forecasts;
  const forecastCount = hasForecasts ? Object.keys(data.forecasts).length : 0;

  // 2. Extract location name from the nested metadata object in the JSON
  // Path: data -> metadata -> location_name
  const displayName = data?.metadata?.location_name || 'Unknown';

  // 3. Prepare for Charting (Mirroring COVID19View processing)
  const groundTruth = data?.ground_truth;
  const forecasts = data?.forecasts;

  return (
    <Stack>
      {/* Consistent header with the last updated timestamp from global metadata */}
      <LastFetched timestamp={metadata?.last_updated} />

      {/* Data Pipeline Verification Alert */}
      {hasForecasts ? (
        <Alert icon={<IconCheck size="1rem" />} title="Data Pipeline Active" color="teal" variant="outline">
          <Stack gap="xs">
            <Text size="sm">
              Successfully received <b>{forecastCount}</b> forecast dates for location: <b>{displayName}</b>.
            </Text>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Current Target:</Text>
              <Code color="teal.1">{selectedTarget || 'No Target Selected'}</Code>
            </Group>
          </Stack>
        </Alert>
      ) : (
        <Alert color="red" title="Data Missing">
          <Text size="sm">The component is not receiving forecast data for this selection.</Text>
        </Alert>
      )}

      {/* Main Visualization Area */}
      <Center 
        style={{ 
          width: '100%', 
          height: Math.min(600, windowSize.height * 0.5),
          border: '1px dashed #ced4da',
          borderRadius: '8px',
          backgroundColor: 'rgba(134, 142, 150, 0.05)'
        }}
      >
        <Stack align="center" gap="xs">
          <Title order={3} c="dimmed">MetroCast Visualization</Title>
          <Text size="lg" c="dimmed" fw={500}>Currently Viewing: {displayName}</Text>
          <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 400 }}>
            {hasForecasts 
              ? `Ready to plot ground truth and ${forecastCount} forecast horizons.`
              : "Waiting for data reception..."}
          </Text>
        </Stack>
      </Center>

      {/* Standard footer disclaimer */}
      <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '8px', marginTop: 'auto' }}>
        <p style={{ 
          fontStyle: 'italic', 
          fontSize: '12px', 
          color: '#868e96', 
          textAlign: 'right',
          margin: 0 
        }}>
          Note that forecasts should be interpreted with great caution and may not reliably predict rapid changes in disease trends.
        </p>
      </div>
    </Stack>
  );
};

export default MetroCastView;