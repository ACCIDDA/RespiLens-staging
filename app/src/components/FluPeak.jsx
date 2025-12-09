import { Stack, Text } from '@mantine/core';

const FluPeak = ({ peaks, peakDates, peakModels }) => {
     // Store basic info for now
    const hasData = peakDates && peakDates.length > 0;

    return (
        <Stack gap="lg" style={{ padding: '20px' }}>
            <Text size="xl" fw={600}>
                Flu Peak Forecast Data Confirmation
            </Text>

            {hasData ? (
                <>
                    <Text size="md">
                        ✅ **Data Received.** Found {peakDates.length} total available peak forecast dates and {peakModels.length} total available models.
                    </Text>
                    
                    <Text size="sm" fw={600}>
                        Available Reference Dates:
                    </Text>
                    {/* Convert array to string for simple display */}
                    <Text>{peakDates.join(', ')}</Text>

                    <Text size="sm" fw={600}>
                        Available Models:
                    </Text>
                    <Text>{peakModels.join(', ')}</Text>
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