import { useState, useEffect, useMemo } from 'react';
import { Stack, useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import { getDataPath } from '../utils/paths';
import { CHART_CONSTANTS } from '../constants/chart'; 

const FluPeak = ({ data, peaks, peakDates, peakModels, location, windowSize }) => {
    const { colorScheme } = useMantineColorScheme();
    const groundTruth = data?.ground_truth;
    const [nhsnData, setNhsnData] = useState(null);
    const [loadingNhsn, setLoadingNhsn] = useState(false);

    useEffect(() => {
        if (!location) return;
        const fetchNhsnData = async () => {
            setLoadingNhsn(true);
            try {
                const dataUrl = getDataPath(`nhsn/${location}_nhsn.json`);
                const response = await fetch(dataUrl);
                if (!response.ok) {
                    setNhsnData(null);
                    return;
                }
                const json = await response.json();
                const dates = json.series?.dates || [];
                const admissions = json.series?.['Total Influenza Admissions'] || [];

                if (dates.length > 0 && admissions.length > 0) {
                    setNhsnData({ dates, admissions });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingNhsn(false);
            }
        };
        fetchNhsnData();
    }, [location]);

    const gtPlotData = useMemo(() => {
        const targetKey = 'wk inc flu hosp';
        const SEASON_START_DATE = '2025-10-01'; // change season to season
        
        if (!groundTruth || !groundTruth[targetKey] || !groundTruth.dates) {
            return [];
        }

        const { dates, values } = groundTruth.dates.reduce((acc, date, index) => {
            if (date >= SEASON_START_DATE) {
                acc.dates.push(date);
                acc.values.push(groundTruth[targetKey][index]);
            }
            return acc;
        }, { dates: [], values: [] });
        if (dates.length === 0) return [];

        return [{
            x: groundTruth.dates,
            y: values,
            name: 'Observed',
            type: 'scatter',
            mode: 'lines+markers',
            line: { 
                color: 'black', 
                width: 2, 
                dash: 'dash' 
            },
            marker: { 
                size: 4, 
                color: 'black' 
            }
        }];
    }, [groundTruth]);

    const layout = useMemo(() => ({
        width: windowSize ? Math.min(CHART_CONSTANTS.MAX_WIDTH, windowSize.width * CHART_CONSTANTS.WIDTH_RATIO) : undefined,
        height: windowSize ? Math.min(CHART_CONSTANTS.MAX_HEIGHT, windowSize.height * 0.5) : 500, 
        autosize: true,
        template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
        paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
        plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
        font: {
            color: colorScheme === 'dark' ? '#c1c2c5' : '#000000'
        },
        margin: { l: 60, r: 30, t: 30, b: 50 },
        legend: {
            x: 0, y: 1,
            xanchor: 'left', yanchor: 'top',
            bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
            borderwidth: 1,
            font: { size: 10 }
        },
        hovermode: 'x unified',
        dragmode: 'pan', 
        xaxis: {
            title: 'Date',
            // no data ranges yet, so we can't meaningfully set rangeselectors/sliders yet
        },
        yaxis: {
            title: 'Hospitalizations',
            rangemode: 'tozero', 
        },
    }), [colorScheme, windowSize]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarPosition: 'left',
        scrollZoom: false, 
        doubleClick: 'reset',
        modeBarButtonsToRemove: ['select2d', 'lasso2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'peak_plot'
        },
    }), []);


    return (
        <Stack gap="md" style={{ padding: '20px' }}>
            <div style={{ width: '100%', minHeight: '400px' }}>
                 <Plot
                    data={gtPlotData}
                    layout={layout}
                    config={config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                />
            </div>
        </Stack>
    );
};

export default FluPeak;