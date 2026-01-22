import { useState, useEffect } from 'react';
import { Stack, ScrollArea, Button, TextInput, Text, Divider, Loader, Center, Alert } from '@mantine/core';
import { IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import { useView } from '../hooks/useView';
import ViewSelector from './ViewSelector';
import TargetSelector from './TargetSelector';
import { getDataPath } from '../utils/paths';

const StateSelector = () => {
  const { selectedLocation, handleLocationSelect, viewType} = useView();

  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [highlightedIndex, setHighlightedIndex] = useState(-1); 

  useEffect(() => {
    const controller = new AbortController(); // controller prevents issues if you click away while locs are loading
    
    setStates([]); 
    setLoading(true);

    const fetchStates = async () => {
      try {
        const directory = (viewType === 'metrocast_projs') 
          ? 'flumetrocast' 
          : 'flusight';
        
        const manifestResponse = await fetch(
          getDataPath(`${directory}/metadata.json`),
          { signal: controller.signal }
        );
        
        if (!manifestResponse.ok) {
          throw new Error(`Failed to fetch metadata: ${manifestResponse.statusText}`);
        }
        
        const metadata = await manifestResponse.json();
        
        const sortedLocations = metadata.locations.sort((a, b) => {
          const isA_Default = a.abbreviation === 'US' || a.abbreviation === 'athens';
          const isB_Default = b.abbreviation === 'US' || b.abbreviation === 'athens';
          
          if (isA_Default) return -1;
          if (isB_Default) return 1;
          return (a.location_name || '').localeCompare(b.location_name || '');
        });

        setStates(sortedLocations);
      } catch (err) {
        // Ignore errors caused by manual cancellation
        if (err.name === 'AbortError') return;
        
        console.error('Error loading locations:', err);
        setError(err.message);
      } finally {
        // Only set loading to false if we weren't aborted
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchStates();

    return () => controller.abort();
  }, [viewType]);

  useEffect(() => {
    if (states.length > 0) {
      const index = states.findIndex(state => state.abbreviation === selectedLocation);
      setHighlightedIndex(index >= 0 ? index : 0);
    }
  }, [states, selectedLocation]);


  const filteredStates = states.filter(state =>
    state.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e) => {
    const newSearchTerm = e.currentTarget.value;
    setSearchTerm(newSearchTerm);
    
    if (newSearchTerm.length > 0 && filteredStates.length > 0) {
        setHighlightedIndex(0); 
    } else if (newSearchTerm.length === 0) {
        const index = states.findIndex(state => state.abbreviation === selectedLocation);
        setHighlightedIndex(index >= 0 ? index : 0);
    }
  };

  const handleKeyDown = (event) => {
    if (filteredStates.length === 0) return;

    let newIndex = highlightedIndex;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = (highlightedIndex + 1) % filteredStates.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = (highlightedIndex - 1 + filteredStates.length) % filteredStates.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
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
          label="Search locations"
          placeholder="Search locations"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          leftSection={<IconSearch size={16} />}
          autoFocus 
          aria-label="Search locations"
        />
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap="xs">
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
                variant = 'light';
                color = 'blue';
              }

              return (
                <Button
                  key={state.location}
                  variant={variant}
                  color={color}
                  onClick={() => {
                    handleLocationSelect(state.abbreviation);
                    setSearchTerm('');
                    setHighlightedIndex(states.findIndex(s => s.abbreviation === state.abbreviation));
                  }}
                  justify="start"
                  size="sm"
                  fullWidth
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