import { useState, useEffect } from 'react';
import { Stack, ScrollArea, Button, TextInput, Text, Divider, Loader, Center, Alert } from '@mantine/core';
import { IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import { useView } from '../hooks/useView'; // 1. Import the useView hook
import ViewSelector from './ViewSelector';
import { getDataPath } from '../utils/paths';

const StateSelector = () => {
  // 2. Get the current location and the update function from our central context
  const { selectedLocation, handleLocationSelect } = useView();

  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
        const sortedLocations = metadata.locations.sort((a, b) => {
          if (a.abbreviation === 'US') return -1;
          if (b.abbreviation === 'US') return 1;
          return (a.location_name || '').localeCompare(b.location_name || '');
        });
        setStates(sortedLocations);
      } catch (err) {
        console.error('Error in data loading:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStates();
  }, []);

  const filteredStates = states.filter(state =>
    state.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Center><Loader /></Center>;
  }

  if (error) {
    return <Alert color="red" title="Error" icon={<IconAlertTriangle />}>{error}</Alert>;
  }

  // This component will live inside the AppShell's Navbar, so we return the layout directly.
  return (
    <Stack gap="md" h="100%">
      <Stack gap="xs">
        <Text fw={500} size="sm" c="dimmed">View</Text>
        <ViewSelector />
      </Stack>
      
      <Divider />
      
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
                // 3. The button's style is now driven by `selectedLocation` from the context
                variant={selectedLocation === state.abbreviation ? 'filled' : 'subtle'}
                // 4. The onClick now calls `handleLocationSelect` from the context
                onClick={() => handleLocationSelect(state.abbreviation)}
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
};

export default StateSelector;
