import { useMemo } from 'react';
import { Stack, Text, List } from '@mantine/core';

const FluPeak = ({ peaks }) => {
    
    // Extract available dates from peaks object (basic implementation)
    const availablePeakDates = useMemo(() => {
        if (!peaks || typeof peaks !== 'object') {
            return [];
        }
        return Object.keys(peaks).sort().reverse();
    }, [peaks]);

    return (
        <Stack gap="lg" style={{ padding: '20px' }}>
            <Text size="xl" fw={600}>
                Flu Peak Forecast Data Confirmation
            </Text>

            {availablePeakDates.length > 0 ? (
                <>
                    <Text size="md">
                        ✅ **Data Received.** Found {availablePeakDates.length} total available peak forecast dates (reference dates).
                    </Text>
                    
                    <Text size="sm" fw={600}>
                        Available Reference Dates (Latest First):
                    </Text>
                    
                    <List size="sm" spacing="xs" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {availablePeakDates.map(date => (
                            <List.Item key={date}>
                                {date}
                            </List.Item>
                        ))}
                    </List>
                </>
            ) : (
                <Text size="md" c="dimmed">
                    ⚠️ No peak forecast data available for this location or view type.
                </Text>
            )}
        </Stack>
    );
};

export default FluPeak;