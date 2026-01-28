import { useEffect, useCallback } from 'react';
import { Group, Text, ActionIcon, Button, Box } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconX, IconPlus } from '@tabler/icons-react';

const DateSelector = ({ 
  availableDates, 
  selectedDates, 
  setSelectedDates, 
  activeDate, 
  setActiveDate, 
  multi = true 
}) => {
  const handleMove = useCallback((dateToMove, direction) => {
    if (!dateToMove) return;

    const sortedDates = [...selectedDates].sort();
    const dateIndex = availableDates.indexOf(dateToMove);
    const currentPositionInSelected = sortedDates.indexOf(dateToMove);
    
    const targetDate = availableDates[dateIndex + direction];

    if (!targetDate) return;

    const isBlocked = direction === -1 
      ? (currentPositionInSelected > 0 && targetDate === sortedDates[currentPositionInSelected - 1])
      : (currentPositionInSelected < sortedDates.length - 1 && targetDate === sortedDates[currentPositionInSelected + 1]);

    if (!isBlocked) {
      const newDates = [...selectedDates];
      const indexInOriginal = selectedDates.indexOf(dateToMove);
      newDates[indexInOriginal] = targetDate;
      
      setSelectedDates(newDates.sort());
      setActiveDate(targetDate);
    }
  }, [availableDates, selectedDates, setSelectedDates, setActiveDate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (selectedDates.length !== 1) return;
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleMove(activeDate, -1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleMove(activeDate, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDate, handleMove, selectedDates.length]);

  return (
    <Group gap={{ base: 'xs', sm: 'md' }} justify="center" wrap="wrap">
      {selectedDates.map((date) => (
        <Group key={date} gap="xs" align="center" wrap="nowrap">
          <ActionIcon
            onClick={() => handleMove(date, -1)}
            disabled={
              availableDates.indexOf(date) === 0 ||
              selectedDates.includes(availableDates[availableDates.indexOf(date) - 1])
            }
            variant="subtle"
            size={{ base: 'sm', sm: 'md' }}
            aria-label={`Previous date from ${date}`}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          
          <Box 
            tabIndex={0} 
            onFocus={() => setActiveDate(date)}
            style={{ outline: 'none', cursor: 'pointer' }}
          >
            <Group gap="xs" align="center" wrap="nowrap">
              <Text 
                fw={500} 
                c={date === activeDate ? 'blue' : 'dimmed'}
                size={{ base: 'xs', sm: 'sm' }}
                style={{ 
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap',
                }}
              >
                {date}
              </Text>
              
              {multi && (
                <ActionIcon
                  onClick={() => setSelectedDates(dates => dates.filter(d => d !== date))}
                  disabled={selectedDates.length === 1}
                  variant="subtle"
                  size="xs"
                  color="red"
                  aria-label={`Remove date ${date}`}
                >
                  <IconX size={10} />
                </ActionIcon>
              )}
            </Group>
          </Box>

          <ActionIcon
            onClick={() => handleMove(date, 1)}
            disabled={
              availableDates.indexOf(date) === availableDates.length - 1 ||
              selectedDates.includes(availableDates[availableDates.indexOf(date) + 1])
            }
            variant="subtle"
            size={{ base: 'sm', sm: 'md' }}
            aria-label={`Next date from ${date}`}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      ))}
      
      {multi && selectedDates.length < 5 && (
        <Button
          onClick={() => {
            const sorted = [...selectedDates].sort();
            const latestIdx = availableDates.indexOf(sorted[sorted.length - 1]);
            const earliestIdx = availableDates.indexOf(sorted[0]);
            
            let dateToAdd;
            if (latestIdx < availableDates.length - 1) {
              dateToAdd = availableDates[latestIdx + 1];
            } else if (earliestIdx > 0) {
              dateToAdd = availableDates[earliestIdx - 1];
            }

            if (dateToAdd && !selectedDates.includes(dateToAdd)) {
              setSelectedDates([...selectedDates, dateToAdd].sort());
              setActiveDate(dateToAdd);
            }
          }}
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
        >
          Add Date
        </Button>
      )}
    </Group>
  );
};

export default DateSelector;