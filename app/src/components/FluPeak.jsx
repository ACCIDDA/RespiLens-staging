import { useState, useEffect, useMemo } from 'react';
import { Stack, useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import ModelSelector from './ModelSelector'; 
import { MODEL_COLORS } from '../config/datasets'; 
import { CHART_CONSTANTS } from '../constants/chart'; 
import { getDataPath } from '../utils/paths';

const FluPeak = ({ 
    data, 
    peaks, 
    peakDates, 
    peakModels, 
    peakLocation, 
    windowSize,
    selectedModels,    
    setSelectedModels,  
    selectedDates        
}) => {
    const { colorScheme } = useMantineColorScheme();
    const groundTruth = data?.ground_truth;
    const [nhsnData, setNhsnData] = useState(null);
    const [loadingNhsn, setLoadingNhsn] = useState(false);
    const getNormalizedDate = (dateStr) => {
        const d = new Date(dateStr);
        // get month from each season so it can be plotted on month-only xaxis
        const baseYear = d.getUTCMonth() >= 7 ? 2000 : 2001;
        d.setUTCFullYear(baseYear);
        return d;
    };

    useEffect(() => {
        if (!peakLocation) return;
        const fetchNhsnData = async () => {
            setLoadingNhsn(true);
            try {
                const dataUrl = getDataPath(`nhsn/${peakLocation}_nhsn.json`);
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
    }, [peakLocation]);

    const activePeakModels = useMemo(() => {
        const activeModelSet = new Set();
        const datesToCheck = (selectedDates && selectedDates.length > 0) 
            ? selectedDates 
            : (peakDates || []);

        if (!peaks || !datesToCheck.length) return activeModelSet;

        datesToCheck.forEach(date => {
            const dateData = peaks[date];
            if (!dateData) return;
            Object.values(dateData).forEach(metricData => {
                if (!metricData) return;
                Object.keys(metricData).forEach(model => activeModelSet.add(model));
            });
        });
        return activeModelSet;
    }, [peaks, selectedDates, peakDates]);

    const plotData = useMemo(() => {
        const traces = [];

        // Historic seasons (NHSN data)
        if (nhsnData && nhsnData.dates && nhsnData.admissions) {
            const seasons = {};

            nhsnData.dates.forEach((dateStr, index) => {
                const date = new Date(dateStr);
                const year = date.getUTCFullYear(); 
                const month = date.getUTCMonth() + 1; 
                // Season definition: Starts Aug 1
                const seasonStartYear = month >= 8 ? year : year - 1;
                const seasonKey = `${seasonStartYear}-${seasonStartYear + 1}`;
                if (!seasons[seasonKey]) {
                    seasons[seasonKey] = { x: [], y: [] };
                }
                seasons[seasonKey].x.push(getNormalizedDate(dateStr));
                seasons[seasonKey].y.push(nhsnData.admissions[index]);
            });

            Object.keys(seasons).sort().forEach(seasonKey => {
                traces.push({
                    x: seasons[seasonKey].x,
                    y: seasons[seasonKey].y,
                    name: `Season ${seasonKey}`, 
                    type: 'scatter',
                    mode: 'lines',
                    line: { 
                        color: '#d3d3d3', 
                        width: 1.5 
                    },
                    connectgaps: true,
                    showlegend: true, 
                    hoverinfo: 'name+y' 
                });
            });
        }

        // Current season gt data
        const targetKey = 'wk inc flu hosp';
        const SEASON_START_DATE = '2025-08-01'; // changes season to season (could make dynamic by pulling current year??)
        if (groundTruth && groundTruth[targetKey] && groundTruth.dates) {
            const { dates, values } = groundTruth.dates.reduce((acc, date, index) => {
                if (date >= SEASON_START_DATE) {
                    acc.dates.push(getNormalizedDate(date));
                    acc.values.push(groundTruth[targetKey][index]);
                }
                return acc;
            }, { dates: [], values: [] });
            
            if (dates.length > 0) {
                traces.push({
                    x: dates, 
                    y: values,
                    name: 'Observed',
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: 'black', width: 2, dash: 'dash' },
                    showlegend: true,
                    marker: { size: 4, color: 'black' }
                });
            }
        }

        return traces; 
    }, [groundTruth, nhsnData]);

    const layout = useMemo(() => ({
        width: windowSize ? Math.min(CHART_CONSTANTS.MAX_WIDTH, windowSize.width * CHART_CONSTANTS.WIDTH_RATIO) : undefined,
        height: windowSize ? Math.min(CHART_CONSTANTS.MAX_HEIGHT, windowSize.height * 0.5) : 500, 
        autosize: true,
        template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
        paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
        plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
        font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000000' },
        margin: { l: 60, r: 30, t: 30, b: 50 },
        legend: {
            x: 0,
            y: 1,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
            borderwidth: 1,
            font: {
                size: 10
            }
        },
        hovermode: 'x unified',
        dragmode: false, 
        xaxis: { 
            title: 'Month', 
            tickformat: '%b' 
        },
        yaxis: { title: 'Hospitalizations', rangemode: 'tozero' },
    }), [colorScheme, windowSize]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarPosition: 'left',
        scrollZoom: false, 
        doubleClick: 'reset',
        modeBarButtonsToRemove: ['select2d', 'lasso2d'],
        toImageButtonOptions: { format: 'png', filename: 'peak_plot' },
    }), []);

    return (
        <Stack gap="md" style={{ padding: '20px' }}>
            <div style={{ width: '100%', minHeight: '400px' }}>
                 <Plot
                    data={plotData}
                    layout={layout}
                    config={config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                />
            </div>
            
            <ModelSelector 
                models={peakModels} 
                selectedModels={selectedModels}
                setSelectedModels={setSelectedModels}
                activeModels={activePeakModels} 
                getModelColor={(model, currentSelected) => {
                    const index = currentSelected.indexOf(model);
                    return MODEL_COLORS[index % MODEL_COLORS.length];
                }}
            />
        </Stack>
    );
};

export default FluPeak;