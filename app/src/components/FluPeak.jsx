import { useState, useEffect, useMemo } from 'react';
import { Stack, useMantineColorScheme } from '@mantine/core';
import Plot from 'react-plotly.js';
import ModelSelector from './ModelSelector'; 
import { MODEL_COLORS } from '../config/datasets'; 
import { CHART_CONSTANTS } from '../constants/chart'; 
import { getDataPath } from '../utils/paths';

// helper to convert Hex to RGBA for opacity control
const hexToRgba = (hex, alpha) => {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return hex; 
};

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
                .filter(key => key !== currentSeasonKey) 
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
            const rawDates = (selectedDates && selectedDates.length > 0) 
                ? selectedDates : (peakDates || []);
            const datesToCheck = [...rawDates].sort(); // Sort chronological

            selectedModels.forEach(model => {
                const xValues = [];
                const yValues = [];
                const hoverTexts = [];
                const pointColors = []; 

                // Base color for this model (Solid, used for Legend)
                const baseColorHex = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];

                datesToCheck.forEach((refDate, index) => {
                    const dateData = peaks[refDate];
                    if (!dateData) return;

                    const intensityData = dateData['peak inc flu hosp']?.[model];
                    if (!intensityData || !intensityData.predictions) return;

                    // extract confidence intervals
                    const iPreds = intensityData.predictions;
                    const getVal = (q) => {
                        const idx = iPreds.quantiles.indexOf(q);
                        return idx !== -1 ? iPreds.values[idx] : null;
                    };

                    const medianVal = getVal(0.5);
                    const low95 = getVal(0.025);
                    const high95 = getVal(0.975);
                    const low50 = getVal(0.25);
                    const high50 = getVal(0.75);

                    if (medianVal === null) return;

                    const timingData = dateData['peak week inc flu hosp']?.[model];
                    if (!timingData || !timingData.predictions) return;

                    const tPreds = timingData.predictions;
                    const dateArray = tPreds['peak week'] || tPreds['values'];
                    const probArray = tPreds['probabilities'];

                    let bestDateStr = null;
                    let lowDate95 = null, highDate95 = null;
                    let lowDate50 = null, highDate50 = null;

                    if (dateArray && probArray) {
                        let cumulativeProb = 0;
                        let medianIdx = -1, q025Idx = -1, q975Idx = -1, q25Idx = -1, q75Idx = -1;
                        for (let i = 0; i < probArray.length; i++) {
                            cumulativeProb += probArray[i];
                            
                            if (q025Idx === -1 && cumulativeProb >= 0.025) q025Idx = i;
                            if (q25Idx === -1 && cumulativeProb >= 0.25) q25Idx = i;
                            if (medianIdx === -1 && cumulativeProb >= 0.5) medianIdx = i;
                            if (q75Idx === -1 && cumulativeProb >= 0.75) q75Idx = i;
                            if (q975Idx === -1 && cumulativeProb >= 0.975) q975Idx = i;
                        }
                        if (medianIdx === -1) medianIdx = probArray.length - 1;
                        if (q975Idx === -1) q975Idx = probArray.length - 1;
                        if (q75Idx === -1) q75Idx = probArray.length - 1;

                        bestDateStr = dateArray[medianIdx];
                        lowDate95 = dateArray[q025Idx !== -1 ? q025Idx : 0];
                        highDate95 = dateArray[q975Idx];
                        lowDate50 = dateArray[q25Idx !== -1 ? q25Idx : 0];
                        highDate50 = dateArray[q75Idx];
                    } else if (dateArray && dateArray.length > 0) {
                        bestDateStr = dateArray[Math.floor(dateArray.length / 2)];
                    }
                    if (!bestDateStr) return;

                    const normalizedDate = getNormalizedDate(bestDateStr);
                    // Gradient Opacity Calculation
                    const minOpacity = 0.4;
                    const alpha = datesToCheck.length === 1 
                        ? 1.0 
                        : minOpacity + ((index / (datesToCheck.length - 1)) * (1 - minOpacity));
                    
                    const dynamicColor = hexToRgba(baseColorHex, alpha);

                    // 95% vertical whisker (hosp)
                    if (low95 !== null && high95 !== null) {
                        traces.push({
                            x: [normalizedDate, normalizedDate],
                            y: [low95, high95],
                            mode: 'lines+markers', 
                            line: { 
                                color: dynamicColor, 
                                width: 1, 
                                dash: 'dash' 
                            },
                            marker: {
                                symbol: 'line-ew', 
                                color: dynamicColor, 
                                size: 10,          
                                line: { 
                                    width: 1, 
                                    color: dynamicColor
                                }
                            },
                            legendgroup: model,
                            showlegend: false,
                            hoverinfo: 'skip'
                        });
                    }

                    // 50% vertical whisker (hosp)
                    if (low50 !== null && high50 !== null) {
                        traces.push({
                            x: [normalizedDate, normalizedDate],
                            y: [low50, high50],
                            mode: 'lines',
                            line: { 
                                color: dynamicColor, 
                                width: 4, 
                                dash: '6px, 3px' 
                            },
                            legendgroup: model,
                            showlegend: false,
                            hoverinfo: 'skip'
                        });
                    }

                    // 95% horizontal whisker (dates)
                    if (lowDate95 && highDate95) {
                        traces.push({
                            x: [getNormalizedDate(lowDate95), getNormalizedDate(highDate95)],
                            y: [medianVal, medianVal],
                            mode: 'lines+markers',
                            line: { 
                                color: dynamicColor, 
                                width: 1, 
                                dash: 'dash' 
                            },
                            marker: {
                                symbol: 'line-ns', 
                                color: dynamicColor,
                                size: 10,
                                line: { width: 1, color: dynamicColor }
                            },
                            legendgroup: model,
                            showlegend: false,
                            hoverinfo: 'skip'
                        });
                    }

                    // 50% horizontal whisker (dates)
                    if (lowDate50 && highDate50) {
                        traces.push({
                            x: [getNormalizedDate(lowDate50), getNormalizedDate(highDate50)],
                            y: [medianVal, medianVal],
                            mode: 'lines',
                            line: { 
                                color: dynamicColor, 
                                width: 4, 
                                dash: '6px, 3px' 
                            },
                            legendgroup: model,
                            showlegend: false,
                            hoverinfo: 'skip'
                        });
                    }

                    xValues.push(getNormalizedDate(bestDateStr));
                    yValues.push(medianVal);
                    pointColors.push(dynamicColor); 

                    const timing50 = `${lowDate50} - ${highDate50}`;
                    const timing95 = `${lowDate95} - ${highDate95}`;
                    const formattedMedian = Math.round(medianVal).toLocaleString();
                    const formatted50 = `${Math.round(low50).toLocaleString()} - ${Math.round(high50).toLocaleString()}`;
                    const formatted95 = `${Math.round(low95).toLocaleString()} - ${Math.round(high95).toLocaleString()}`;

                    hoverTexts.push(
                        `<b>${model}</b><br>` +
                        `<b>Peak timing:</b><br>` +
                        `Median Week: <b>${bestDateStr}</b><br>` +
                        `50% CI: [${timing50}]<br>` +
                        `95% CI: [${timing95}]<br>` +
                        `<span style="border-bottom: 1px solid #ccc; display: block; margin: 5px 0;"></span>` +
                        `<b>Peak hospitalization:</b><br>` +
                        `Median: <b>${formattedMedian}</b><br>` +
                        `50% CI: [${formatted50}]<br>` +
                        `95% CI: [${formatted95}]<br>` +
                        `<span style="color: #ffffff; font-size: 0.8em">predicted as of ${refDate}</span>`
                    );
                });

                // actual trace
                if (xValues.length > 0) {
                    traces.push({
                        x: xValues,
                        y: yValues,
                        name: model,
                        type: 'scatter',
                        mode: 'markers', 
                        marker: {
                            color: pointColors, 
                            size: 12,
                            symbol: 'circle', 
                            line: { width: 1, color: 'white' }
                        },
                        hoverlabel: {
                            font: { color: '#ffffff' }, 
                            bordercolor: '#ffffff'  // maakes border white
                        },
                        hovertemplate: '%{text}<extra></extra>',
                        text: hoverTexts,
                        showlegend: false, 
                        legendgroup: model 
                    });

                    // dummy legend
                    traces.push({
                        x: [null],
                        y: [null],
                        name: model,
                        type: 'scatter',
                        mode: 'markers',
                        marker: {
                            color: baseColorHex, 
                            size: 12,
                            symbol: 'circle',
                            line: { width: 1, color: 'white' }
                        },
                        showlegend: true, 
                        legendgroup: model 
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
        yaxis: { title: 'Flu Hospitalizations', rangemode: 'tozero' },
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
            <div style={{ borderTop: '1px solid #FFF', paddingTop: '1px', marginTop: 'auto' }}>
              <p style={{ 
                fontStyle: 'italic', 
                fontSize: '12px', 
                color: '#868e96', 
                textAlign: 'center',
                margin: 0 
              }}>
                forecasts should be interpreted with great caution and may not reliably predict rapid changes in disease trends.
              </p>
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