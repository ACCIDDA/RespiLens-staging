import { Stack, Text, Title, Center } from '@mantine/core';
import LastFetched from './LastFetched';

const MetroCastView = ({ metadata, windowSize }) => {
  return (
    <Stack>
      {/* Keeps the consistent header with the last updated timestamp */}
      <LastFetched timestamp={metadata?.last_updated} />

      {/* Placeholder content area */}
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
          <Title order={3} c="dimmed">MetroCast View</Title>
          <Text size="lg" c="dimmed" fw={500}>Coming Soon</Text>
          <Text size="sm" c="dimmed">
            We are currently integrating flu-metrocast hubverse datasets.
          </Text>
        </Stack>
      </Center>

      {/* Keeps the consistent footer disclaimer */}
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