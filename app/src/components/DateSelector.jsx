import { useEffect, useCallback, useRef } from 'react';
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
  const targetActiveDateRef = useRef(activeDate);
  const isInternalUpdateRef = useRef(false);
  const firstDateBoxRef = useRef(null);


  if (activeDate && targetActiveDateRef.current !== activeDate) {
    if (!isInternalUpdateRef.current) {
      targetActiveDateRef.current = activeDate;
    }
  }
  const hasDate = !!activeDate;
  useEffect(() => {
    if (activeDate && firstDateBoxRef.current) {
      const timeout = setTimeout(() => {
        firstDateBoxRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [hasDate, activeDate]);

  useEffect(() => {
    if (isInternalUpdateRef.current && activeDate !== targetActiveDateRef.current) {
      setActiveDate(targetActiveDateRef.current);
      isInternalUpdateRef.current = false; 
    }
  }, [activeDate, setActiveDate]);

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
      
      targetActiveDateRef.current = targetDate;
      isInternalUpdateRef.current = true;

      setSelectedDates(newDates.sort());
      setActiveDate(targetDate);
    }
  }, [availableDates, selectedDates, setSelectedDates, setActiveDate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const currentTarget = targetActiveDateRef.current;
      if (!currentTarget) return;
      
      // Safety check: ignore arrow keys if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleMove(currentTarget, -1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleMove(currentTarget, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, activeDate]);

  return (
    <Group gap={{ base: 'xs', sm: 'md' }} justify="center" wrap="wrap">
      {selectedDates.map((date, index) => (
        <Group key={date} gap="xs" align="center" wrap="nowrap">
          <ActionIcon
            onClick={() => handleMove(date, -1)}
            disabled={
              availableDates.indexOf(date) === 0 ||
              selectedDates.includes(availableDates[availableDates.indexOf(date) - 1])
            }
            variant="subtle"
            size={{ base: 'sm', sm: 'md' }}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          
          <Box 
            // Apply the auto-focus ref to the first selected date
            ref={index === 0 ? firstDateBoxRef : null}
            tabIndex={0} 
            onFocus={() => {
              targetActiveDateRef.current = date;
              setActiveDate(date);
            }}
            onClick={() => {
              targetActiveDateRef.current = date;
              setActiveDate(date);
            }}
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
                  textDecoration: date === activeDate ? 'underline' : 'none',
                  textUnderlineOffset: '4px'
                }}
              >
                {date}
              </Text>
              
              {multi && (
                <ActionIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    const newDates = selectedDates.filter(d => d !== date);
                    setSelectedDates(newDates);
                    if (date === activeDate && newDates.length > 0) {
                      setActiveDate(newDates[0]);
                    }
                  }}
                  disabled={selectedDates.length === 1}
                  variant="subtle"
                  size="xs"
                  color="red"
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