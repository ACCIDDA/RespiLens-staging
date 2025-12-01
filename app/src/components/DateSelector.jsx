import { Group, Text, ActionIcon, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconX, IconPlus } from '@tabler/icons-react';

const DateSelector = ({ availableDates, selectedDates, setSelectedDates, activeDate, setActiveDate }) => {
  return (
    <Group gap={{ base: 'xs', sm: 'md' }} justify="center" wrap="wrap">
      {selectedDates.map((date) => (
        <Group key={date} gap="xs" align="center" wrap="nowrap">
          <ActionIcon
            onClick={() => {
              const sortedDates = selectedDates.slice().sort();
              const dateIndex = availableDates.indexOf(date);
              const currentPosition = sortedDates.indexOf(date);
              const prevDate = availableDates[dateIndex - 1];

              if (prevDate && (!sortedDates[currentPosition - 1] || new Date(prevDate) > new Date(sortedDates[currentPosition - 1]))) {
                const newDates = [...selectedDates];
                newDates[selectedDates.indexOf(date)] = prevDate;
                setSelectedDates(newDates.sort());
                setActiveDate(prevDate);
              }
            }}
            disabled={
              availableDates.indexOf(date) === 0 ||
              (selectedDates.includes(availableDates[availableDates.indexOf(date) - 1]))
            }
            variant="subtle"
            size={{ base: 'sm', sm: 'md' }}
            aria-label={`Previous date from ${date}`}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          
          <Group gap="xs" align="center" wrap="nowrap">
            <Text 
              fw={500} 
              c={date === activeDate ? 'blue' : 'dimmed'}
              size={{ base: 'xs', sm: 'sm' }}
              style={{ 
                minWidth: 'fit-content',
                whiteSpace: 'nowrap' 
              }}
            >
              {date}
            </Text>
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
          </Group>

          <ActionIcon
            onClick={() => {
              const sortedDates = selectedDates.slice().sort();
              const dateIndex = availableDates.indexOf(date);
              const currentPosition = sortedDates.indexOf(date);
              const nextDate = availableDates[dateIndex + 1];

              if (nextDate && (!sortedDates[currentPosition + 1] || new Date(nextDate) < new Date(sortedDates[currentPosition + 1]))) {
                const newDates = [...selectedDates];
                newDates[selectedDates.indexOf(date)] = nextDate;
                setSelectedDates(newDates.sort());
                setActiveDate(nextDate);
              }
            }}
            disabled={
              availableDates.indexOf(date) === availableDates.length - 1 ||
              (selectedDates.includes(availableDates[availableDates.indexOf(date) + 1]))
            }
            variant="subtle"
            size={{ base: 'sm', sm: 'md' }}
            aria-label={`Next date from ${date}`}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      ))}
      
      {selectedDates.length < 5 && (
        <Button
          onClick={() => {
            if (selectedDates.length >= 5) return;
            
            const sortedSelectedDates = selectedDates.slice().sort();
            const latestSelectedDate = sortedSelectedDates[sortedSelectedDates.length - 1];
            const earliestSelectedDate = sortedSelectedDates[0];
            const latestSelectedIdx = availableDates.indexOf(latestSelectedDate);
            const earliestSelectedIdx = availableDates.indexOf(earliestSelectedDate);
            
            let dateToAdd;
            
            if (latestSelectedIdx === availableDates.length - 1) {
              if (earliestSelectedIdx > 0) {
                dateToAdd = availableDates[earliestSelectedIdx - 1];
              }
            } else {
              dateToAdd = availableDates[latestSelectedIdx + 1];
            }

            if (dateToAdd && !selectedDates.includes(dateToAdd)) {
              setSelectedDates([...selectedDates, dateToAdd].sort());
              setActiveDate(dateToAdd);
            }
          }}
          disabled={selectedDates.length >= 5}
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
