import { useState, useEffect } from 'react';
import { Stack, ScrollArea, Button, TextInput, Text, Divider, Loader, Center, Alert } from '@mantine/core';
import { IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import { useView } from '../hooks/useView';
import ViewSelector from './ViewSelector';
import TargetSelector from './TargetSelector';
import { getDataPath } from '../utils/paths';

const StateSelector = () => {
  const { selectedLocation, handleLocationSelect } = useView();

  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // default highlighted will be set to 0 later (US)

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

  // This ensures the keyboard focus starts on the dark blue selected item.
  useEffect(() => {
    if (states.length > 0 && selectedLocation) {
        const index = states.findIndex(state => state.abbreviation === selectedLocation);
        setHighlightedIndex(index);
    }
  }, [states, selectedLocation]);


  const filteredStates = states.filter(state =>
    state.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e) => {
    const newSearchTerm = e.currentTarget.value;
    setSearchTerm(newSearchTerm);
    
    // Reset highlight to the first filtered item only if we are typing.
    if (newSearchTerm.length > 0 && filteredStates.length > 0) {
        setHighlightedIndex(0); 
    } else if (newSearchTerm.length === 0) {
        // If search is cleared, reset highlight to the currently selected item (US on load)
        const index = states.findIndex(state => state.abbreviation === selectedLocation);
        setHighlightedIndex(index);
    }
  };

  const handleKeyDown = (event) => {
    if (filteredStates.length === 0) return;

    let newIndex = highlightedIndex;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      // Use filteredStates length here for wrapping
      newIndex = (highlightedIndex + 1) % filteredStates.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = (highlightedIndex - 1 + filteredStates.length) % filteredStates.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // Use the filteredStates array to get the state abbreviation based on the current highlight index
      const selectedState = filteredStates[highlightedIndex];
      
      if (selectedState) {
        handleLocationSelect(selectedState.abbreviation);
        setSearchTerm(''); 
        setHighlightedIndex(states.findIndex(s => s.abbreviation === selectedState.abbreviation));
        event.currentTarget.blur();
      }
      return; // Exit early if Enter is pressed
    }
    
    setHighlightedIndex(newIndex);
  };
  
  // NOTE: The previous useEffect to handle out-of-bounds index is no longer strictly needed 
  // because we calculate the index based on filteredStates length in handleKeyDown, 
  // and reset it when the search term changes.

  if (loading) {
    return <Center><Loader /></Center>;
  }

  if (error) {
    return <Alert color="red" title="Error" icon={<IconAlertTriangle />}>{error}</Alert>;
  }

  return (
    <Stack gap="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack gap="xs" style={{ flexShrink: 0 }}>
        <Text fw={500} size="sm" c="dimmed">View</Text>
        <ViewSelector />
      </Stack>

      <Divider />

      <Stack>
        <Text fw={500} size="sm" c="dimmed">Target</Text>
        <TargetSelector />
      </Stack>

      <Stack gap="xs" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Text fw={500} size="sm" c="dimmed">Location</Text>
        <TextInput
          placeholder="Search states..."
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          leftSection={<IconSearch size={16} />}
          autoFocus 
        />
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap="xs">
            {/* Map over filteredStates but still need the index */}
            {filteredStates.map((state, index) => {
              const isSelected = selectedLocation === state.abbreviation;
              const isKeyboardHighlighted = (searchTerm.length > 0 || index === highlightedIndex) && 
                                              index === highlightedIndex && 
                                              !isSelected;

              let variant = 'subtle';
              let color = 'blue';

              if (isSelected) {
                variant = 'filled';
                color = 'blue';
              } else if (isKeyboardHighlighted) {
                // Style for the keyboard-highlighted state (light blue) only during search/nav
                variant = 'light';
                color = 'blue';
              }

              return (
                <Button
                  key={state.location}
                  // We need to match the highlight index to the index within the *filtered* array
                  // The previous highlight index calculation assumes the *filtered* array
                  variant={variant}
                  color={color}
                  onClick={() => {
                    handleLocationSelect(state.abbreviation);
                    // Also clear search term and reset highlight on click
                    setSearchTerm('');
                    setHighlightedIndex(states.findIndex(s => s.abbreviation === state.abbreviation));
                  }}
                  justify="start"
                  size="sm"
                  fullWidth
                  // Only update highlight index on mouse hover if searching is active
                  onMouseEnter={() => {
                    if (searchTerm.length > 0) {
                      setHighlightedIndex(index);
                    }
                  }} 
                >
                  {state.location_name}
                </Button>
              );
            })}
            {filteredStates.length === 0 && (
              <Center p="md">
                <Text c="dimmed">No locations found.</Text>
              </Center>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Stack>
  );
};

export default StateSelector;