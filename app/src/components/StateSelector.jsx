import React, { useState, useEffect } from 'react';
import { 
  Center, 
  Loader, 
  Text, 
  Alert, 
  List, 
  TextInput,
  Stack,
  ScrollArea,
  Button,
  Paper,
  Divider
} from '@mantine/core';
import { IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import ViewSelector from './ViewSelector';
import { getDataPath } from '../utils/paths';

const StateSelector = ({ onStateSelect, currentLocation = null, sidebarMode = false, appShellMode = false }) => {
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

  if (sidebarMode || appShellMode) {
    const sidebarContent = (
      <Stack gap="md" h="100%">
        {/* View Selection Section */}
        <Stack gap="xs">
          <Text fw={500} size="sm" c="dimmed">View</Text>
          <ViewSelector />
        </Stack>
        
        <Divider />
        
        {/* Location Selection Section */}
        <Stack gap="xs" flex={1} style={{ overflow: 'hidden' }}>
          <Text fw={500} size="sm" c="dimmed">Location</Text>
          <TextInput
            placeholder="Search states..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
          />
          <ScrollArea flex={1}>
            <Stack gap="xs">
              {filteredStates.map((state) => (
                <Button
                  key={state.location}
                  variant={currentLocation === state.abbreviation ? 'light' : 'subtle'}
                  onClick={() => onStateSelect(state.abbreviation)}
                  justify="start"
                  size="sm"
                  fullWidth
                >
                  {state.location_name}
                </Button>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Stack>
    );

    // If appShellMode, return content without Paper wrapper (AppShell.Navbar handles styling)
    if (appShellMode) {
      return sidebarContent;
    }

    // If sidebarMode, wrap in Paper for standalone use
    return (
      <Paper 
        w="min(256px, 85vw)"
        miw="min(256px, 85vw)"
        h="100vh"
        radius={0}
        style={{ borderRight: '1px solid var(--mantine-color-gray-3)' }}
        p="md"
      >
        {sidebarContent}
      </Paper>
    );
  }

  // Card-based selector is no longer used since we moved to AppShell navbar
  return null;
};

export default StateSelector;
