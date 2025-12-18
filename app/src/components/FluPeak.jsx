import { useState, useEffect } from 'react';
import { Stack, Text } from '@mantine/core';
import { getDataPath } from '../utils/paths';

const FluPeak = ({ peaks, peakDates, peakModels }) => {
    const [nhsnData, setNhsnData] = useState(null);
    const [loadingNhsn, setLoadingNhsn] = useState(false);

    useEffect(() => {
        if (!location) return;

        const fetchNhsnData = async () => {
            setLoadingNhsn(true);
            try {
                // Construct path exactly like NHSNView does
                const dataUrl = getDataPath(`nhsn/${location}_nhsn.json`);
                const response = await fetch(dataUrl);

                if (!response.ok) {
                    console.warn(`FluPeak: No NHSN data found for ${location}`);
                    setNhsnData(null);
                    return;
                }

                const json = await response.json();

                // Extract only dates and Total Influenza Admissions from NHSN data
                const dates = json.series?.dates || [];
                const admissions = json.series?.['Total Influenza Admissions'] || [];

                if (dates.length > 0 && admissions.length > 0) {
                    setNhsnData({
                        dates: dates,
                        admissions: admissions
                    });
                }

            } catch (err) {
                console.error("FluPeak: Error fetching NHSN data", err);
            } finally {
                setLoadingNhsn(false);
            }
        };

        fetchNhsnData();
    }, [location]);

    // Store basic info for now
    const hasHistoricData = nhsnData && nhsnData.dates.length > 0;
    const hasData = peakDates && peakDates.length > 0;

    return (
        <Stack gap="lg" style={{ padding: '20px' }}>
            <Text size="xl" fw={600}>
                Flu Peak Forecast Data Coming Soon! 🏗️
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
                    <Text size="xs" c="dimmed">
                        (Debug: 'peaks' object contains data for {Object.keys(peaks || {}).length} dates)
                    </Text>
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