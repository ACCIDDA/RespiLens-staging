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

    // Normalize date to a common "2000-2001" season (to put everything on one x-axis)
    const getNormalizedDate = (dateStr) => {
        const d = new Date(dateStr);
        const month = d.getUTCMonth(); 
        const baseYear = month >= 7 ? 2000 : 2001;
        d.setUTCFullYear(baseYear);
        return d;
    };

    useEffect(() => {
        if (!peakLocation) return;
        const fetchNhsnData = async () => {
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
            } 
        };
        fetchNhsnData();
    }, [peakLocation]);

    const activePeakModels = useMemo(() => {
        const activeModelSet = new Set();
        const datesToCheck = (selectedDates && selectedDates.length > 0) 
            ? selectedDates : (peakDates || []);

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

        // Historic data (NHSN)
        if (nhsnData && nhsnData.dates && nhsnData.admissions) {
            const seasons = {};
            nhsnData.dates.forEach((dateStr, index) => {
                const date = new Date(dateStr);
                const year = date.getUTCFullYear(); 
                const month = date.getUTCMonth() + 1; 
                const seasonStartYear = month >= 8 ? year : year - 1;
                const seasonKey = `${seasonStartYear}-${seasonStartYear + 1}`;
                
                if (!seasons[seasonKey]) seasons[seasonKey] = { x: [], y: [] };
                seasons[seasonKey].x.push(getNormalizedDate(dateStr));
                seasons[seasonKey].y.push(nhsnData.admissions[index]);
            });
            const currentSeasonKey = '2025-2026';
            const sortedKeys = Object.keys(seasons)
                .filter(key => key !== currentSeasonKey) // <--- THIS LINE DOES THE FILTERING
                .sort();

            // Dummy data for legend
            if (sortedKeys.length > 0) {
                const firstKey = sortedKeys[0];
                traces.push({
                    x: [seasons[firstKey].x[0]], 
                    y: [seasons[firstKey].y[0]], 
                    name: 'Historical Seasons',  
                    legendgroup: 'history',
                    showlegend: true,
                    mode: 'lines',
                    line: { color: '#d3d3d3', width: 1.5 },
                    hoverinfo: 'skip'
                });
            }

            sortedKeys.forEach(seasonKey => {
                traces.push({
                    x: seasons[seasonKey].x,
                    y: seasons[seasonKey].y,
                    name: `${seasonKey} Season`,
                    legendgroup: 'history',      
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#d3d3d3', width: 1.5 },
                    connectgaps: true,
                    showlegend: false,      
                    hoverinfo: 'name+y' 
                });
            });
        }

        // Current season (gt data)
        const targetKey = 'wk inc flu hosp';
        const SEASON_START_DATE = '2025-08-01'; 
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
                    name: 'Current season',
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: 'black', width: 2, dash: 'dash' },
                    showlegend: true,
                    marker: { size: 4, color: 'black' },
                    hovertemplate: 
                        '<b>Current Season</b><br>' +
                        'Hospitalizations: %{y}<br>' +
                        'Date: %{x|%b %d}<extra></extra>'
                });
            }
        }

        // Model peak predictions data
        if (peaks && selectedModels.length > 0) {
            const datesToCheck = (selectedDates && selectedDates.length > 0) 
                ? selectedDates : (peakDates || []);

            selectedModels.forEach(model => {
                const xValues = [];
                const yValues = [];
                const hoverTexts = [];

                datesToCheck.forEach(refDate => {
                    const dateData = peaks[refDate];
                    if (!dateData) return;

                    // Extract intensity
                    const intensityData = dateData['peak inc flu hosp']?.[model];
                    if (!intensityData || !intensityData.predictions) return;

                    const iPreds = intensityData.predictions;
                    const qIdx05 = iPreds.quantiles.indexOf(0.5);
                    if (qIdx05 === -1) return; 
                    const medianVal = iPreds.values[qIdx05];

                    // Extract timing
                    const timingData = dateData['peak week inc flu hosp']?.[model];
                    if (!timingData || !timingData.predictions) return;

                    const tPreds = timingData.predictions;
                    const dateArray = tPreds['peak week'] || tPreds['values'];
                    const probArray = tPreds['probabilities'];

                    let bestDateStr = null;

                    if (dateArray && probArray) {
                        let maxProb = -1;
                        let maxIdx = -1;
                        probArray.forEach((p, i) => {
                            if (p > maxProb) {
                                maxProb = p;
                                maxIdx = i;
                            }
                        });
                        if (maxIdx !== -1) bestDateStr = dateArray[maxIdx];
                    } else if (dateArray && dateArray.length > 0) {
                        bestDateStr = dateArray[Math.floor(dateArray.length / 2)];
                    }

                    if (!bestDateStr) return;

                    // Add to trace data
                    xValues.push(getNormalizedDate(bestDateStr));
                    yValues.push(medianVal);
                    
                    hoverTexts.push(
                        `<b>${model}</b><br>` +
                        `peak week: ${bestDateStr}<br>` +
                        `peak hosp: ${Math.round(medianVal).toLocaleString()}<br>` +
                        `<span style="color: white; font-size: 0.8em">predicted as of ${refDate}</span>`
                    );
                });

                if (xValues.length > 0) {
                    // match colors to model selector
                    const modelColor = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
                    
                    traces.push({
                        x: xValues,
                        y: yValues,
                        name: model,
                        type: 'scatter',
                        mode: 'markers', 
                        marker: {
                            color: modelColor,
                            size: 10,
                            symbol: 'diamond', 
                            line: { width: 1, color: 'white' }
                        },
                        hovertemplate: '%{text}<extra></extra>',
                        text: hoverTexts,
                        showlegend: true
                    });
                }
            });
        }

        return traces; 
    }, [groundTruth, nhsnData, peaks, selectedModels, selectedDates, peakDates]);

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
            x: 0, y: 1, xanchor: 'left', yanchor: 'top',
            bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
            borderwidth: 1,
            font: { size: 10 }
        },
        hovermode: 'closest',
        hoverlabel: { namelength: -1 },
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
            <style>{`
                .js-plotly-plot .plotly .nsewdrag {
                    cursor: default !important;
                }
            `}</style>
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