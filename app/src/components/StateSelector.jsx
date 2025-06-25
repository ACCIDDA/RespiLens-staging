import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Center, 
  Loader, 
  Text, 
  Alert, 
  List, 
  Group, 
  Image, 
  Title, 
  TextInput,
  Stack,
  ScrollArea,
  Card,
  SimpleGrid,
  NavLink,
  Paper,
  Divider
} from '@mantine/core';
import { IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import ViewSelector from './ViewSelector';
import { getDataPath } from '../utils/paths';

const StateSelector = ({ onStateSelect, currentLocation = null, sidebarMode = false }) => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStates = states.filter(state =>
    state.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const manifestResponse = await fetch(getDataPath('flusight/metadata.json'));
        if (!manifestResponse.ok) {
          throw new Error(`Failed to fetch metadata: ${manifestResponse.statusText}`);
        }

        const metadata = await manifestResponse.json();

        if (!metadata.locations || !Array.isArray(metadata.locations)) {
          throw new Error('Invalid metadata format');
        }

        const sortedLocations = metadata.locations
          .sort((a, b) => {
            if (a.abbreviation === 'US') return -1;
            if (b.abbreviation === 'US') return 1;
            return (a.location_name || '').localeCompare(b.location_name || '');
          });

        setStates(sortedLocations);
        setLoading(false);
      } catch (err) {
        console.error('Error in data loading:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading locations...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="md" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Error Loading Data"
          color="red"
          variant="light"
        >
          <Text mb="md">Error: {error}</Text>
          <Text size="sm" c="dimmed">
            Please ensure that:
          </Text>
          <List size="sm" spacing="xs" mt="xs">
            <List.Item>The process_flusight_data.py script has been run</List.Item>
            <List.Item>Data files are present in app/public/processed_data/</List.Item>
            <List.Item>manifest.json contains valid location data</List.Item>
          </List>
        </Alert>
      </Container>
    );
  }

  if (sidebarMode) {
    return (
      <Paper 
        style={{ 
          width: 'min(256px, 85vw)', 
          minWidth: 'min(256px, 85vw)', 
          height: '100vh',
          borderRadius: 0,
          borderRight: '1px solid var(--mantine-color-gray-3)'
        }} 
        p="md"
      >
        <Stack gap="md" h="100%">
          {/* View Selection Section */}
          <Stack gap="md">
            <Text fw={500} size="sm" c="dimmed">Select View</Text>
            <ViewSelector />
          </Stack>
          
          <Divider />
          
          {/* Location Selection Section */}
          <Stack gap="md" flex={1} style={{ overflow: 'hidden' }}>
            <Text fw={500} size="sm" c="dimmed">Select Location</Text>
            <TextInput
              placeholder="Search states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
            <ScrollArea flex={1}>
              <Stack gap={2}>
                {filteredStates.map((state) => (
                  <NavLink
                    key={state.location}
                    label={state.location_name}
                    onClick={() => onStateSelect(state.abbreviation)}
                    active={currentLocation === state.abbreviation}
                    styles={{
                      root: {
                        borderRadius: 'var(--mantine-radius-sm)',
                      }
                    }}
                  />
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Center mb="xl">
        <Group gap="md">
          <Image src="respilens-logo.svg" alt="RespiLens Logo" h={56} w={56} />
          <Title order={1} c="blue">
            RespiLens<sup style={{ color: 'red', fontSize: '0.75rem' }}>α</sup>
          </Title>
        </Group>
      </Center>
      
      <SimpleGrid 
        cols={{ base: 1, sm: 2, lg: 3 }} 
        spacing="md" 
        style={{ maxWidth: 1200, margin: '0 auto' }}
      >
        {states.map((state) => (
          <Card
            key={state.location}
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            style={{ cursor: 'pointer' }}
            onClick={() => onStateSelect(state.abbreviation)}
          >
            <Title order={3} mb="xs">{state.location_name || state.location}</Title>
            {state.population && (
              <Text size="sm" c="dimmed">
                Population: {state.population.toLocaleString()}
              </Text>
            )}
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default StateSelector;
