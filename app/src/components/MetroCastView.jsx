import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMantineColorScheme, Stack, Text, Center, SimpleGrid, Paper, Loader, Box, UnstyledButton } from '@mantine/core';
import Plot from 'react-plotly.js';
import ModelSelector from './ModelSelector';
import LastFetched from './LastFetched';
import { useView } from '../hooks/useView'; // need this so the metro area cards can link to other pages
import { MODEL_COLORS } from '../config/datasets';
import { CHART_CONSTANTS } from '../constants/chart';
import { targetDisplayNameMap, targetYAxisLabelMap } from '../utils/mapUtils';
import { getDataPath } from '../utils/paths';

const METRO_STATE_MAP = {
  'Colorado': 'CO', 'Georgia': 'GA', 'Indiana': 'IN', 'Maine': 'ME', 
  'Maryland': 'MD', 'Massachusetts': 'MA', 'Minnesota': 'MN', 
  'South Carolina': 'SC', 'Texas': 'TX', 'Utah': 'UT', 
  'Virginia': 'VA', 'North Carolina': 'NC', 'Oregon': 'OR'
};

const MetroPlotCard = ({ 
  locationData, 
  title, 
  isSmall = false, 
  colorScheme, 
  selectedTarget, 
  selectedModels, 
  selectedDates,
  getDefaultRange,
  xAxisRange,
  setXAxisRange
}) => {
  const [yAxisRange, setYAxisRange] = useState(null);
  const groundTruth = locationData?.ground_truth;
  const forecasts = locationData?.forecasts;

  const calculateYRange = useCallback((plotData, xRange) => {
    if (!plotData?.length || !xRange || !selectedTarget) return null;
    let minY = Infinity, maxY = -Infinity;
    const [startX, endX] = xRange;
    const start = new Date(startX), end = new Date(endX);

    plotData.forEach(trace => {
      if (!trace.x || !trace.y) return;
      for (let i = 0; i < trace.x.length; i++) {
        const d = new Date(trace.x[i]);
        if (d >= start && d <= end) {
          const v = Number(trace.y[i]);
          if (!isNaN(v)) { minY = Math.min(minY, v); maxY = Math.max(maxY, v); }
        }
      }
    });
    if (minY === Infinity) return null;
    const pad = maxY * (CHART_CONSTANTS.Y_AXIS_PADDING_PERCENT / 100);
    return [Math.max(0, minY - pad), maxY + pad];
  }, [selectedTarget]);

  const projectionsData = useMemo(() => {
    if (!groundTruth || !forecasts || !selectedTarget) return [];
    const gtValues = groundTruth[selectedTarget];
    if (!gtValues) return [];

    const traces = [{
      x: groundTruth.dates || [], y: gtValues, name: 'Observed', type: 'scatter',
      mode: 'lines+markers', line: { color: 'black', width: isSmall ? 1 : 2, dash: 'dash' },
      marker: { size: isSmall ? 2 : 4, color: 'black' },
      hovertemplate: '<b>Observed Data</b><br>Date: %{x}<br>Value: <b>%{y:.2f}%</b><extra></extra>'
    }];

    selectedModels.forEach(model => {
      selectedDates.forEach((date, dateIdx) => {
        const forecast = forecasts[date]?.[selectedTarget]?.[model];
        if (forecast?.type !== 'quantile') return;

        const fDates = [], median = [], q95U = [], q95L = [], q50U = [], q50L = [];
        const hoverTexts = [];

        const sorted = Object.keys(forecast.predictions || {}).sort((a, b) => Number(a) - Number(b));

        sorted.forEach(h => {
          const p = forecast.predictions[h];
          const pointDate = p.date;
          fDates.push(pointDate);

          const findQ = (q) => { 
            const i = p.quantiles.indexOf(q); 
            return i !== -1 ? p.values[i] : null; 
          };

          const v50 = findQ(0.5);
          if (v50 !== null) {
            median.push(v50);
            const v025 = findQ(0.025) ?? v50;
            const v25 = findQ(0.25) ?? v50;
            const v75 = findQ(0.75) ?? v50;
            const v975 = findQ(0.975) ?? v50;

            q95L.push(v025);
            q50L.push(v25);
            q50U.push(v75);
            q95U.push(v975);

            const formattedMedian = v50.toFixed(2);
            const formatted50 = `${v25.toFixed(2)} - ${v75.toFixed(2)}`;
            const formatted95 = `${v025.toFixed(2)} - ${v975.toFixed(2)}`;

            hoverTexts.push(
              `<b>${model}</b><br>` +
              `Date: ${pointDate}<br>` +
              `Median: <b>${formattedMedian}%</b><br>` +
              `50% CI: [${formatted50}%]<br>` +
              `95% CI: [${formatted95}%]<br>` +
              `<span style="color: #868e96; font-size: 0.8em">predicted as of ${date}</span>` +
              `<extra></extra>`
            );
          }
        });

        const color = MODEL_COLORS[selectedModels.indexOf(model) % MODEL_COLORS.length];
        traces.push(
          { x: [...fDates, ...fDates.slice().reverse()], y: [...q95U, ...q95L.slice().reverse()], fill: 'toself', fillcolor: `${color}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', legendgroup: model, hoverinfo: 'skip' },
          { x: [...fDates, ...fDates.slice().reverse()], y: [...q50U, ...q50L.slice().reverse()], fill: 'toself', fillcolor: `${color}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', legendgroup: model, hoverinfo: 'skip' },
          { 
            x: fDates, 
            y: median, 
            name: model, 
            type: 'scatter', 
            mode: 'lines+markers', 
            line: { color, width: isSmall ? 1 : 2 }, 
            marker: { size: isSmall ? 3 : 6, color }, 
            showlegend: dateIdx === 0 && !isSmall, 
            legendgroup: model,
            text: hoverTexts, 
            hovertemplate: '%{text}' 
          }
        );
      });
    });
    return traces;
  }, [groundTruth, forecasts, selectedDates, selectedModels, selectedTarget, isSmall]);

  const defRange = useMemo(() => getDefaultRange(), [getDefaultRange]);

  useEffect(() => {
    const range = xAxisRange || defRange;
    setYAxisRange(calculateYRange(projectionsData, range));
  }, [projectionsData, xAxisRange, defRange, calculateYRange]);

  const hasForecasts = projectionsData.length > 1;

  const PlotContent = (
    <>
      <Text fw={700} size={isSmall ? "xs" : "sm"} mb={5} ta="center">{title}</Text>
      
      {!hasForecasts && (
        <Box style={{ position: 'absolute', top: 40, left: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>
           <Center><Text size="xs" c="dimmed" fs="italic">No forecast data for selection</Text></Center>
        </Box>
      )}

      <Plot
        style={{ width: '100%', height: isSmall ? '240px' : '450px', opacity: hasForecasts ? 1 : 0.6 }}
        data={projectionsData}
        layout={{
          autosize: true,
          template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
          paper_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
          plot_bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
          font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000000' },
          margin: { l: isSmall ? 45 : 60, r: 20, t: 10, b: isSmall ? 25 : 80 },
          showlegend: !isSmall,
          legend: {
            x: 0, y: 1, xanchor: 'left', yanchor: 'top',
            bgcolor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            bordercolor: colorScheme === 'dark' ? '#444' : '#ccc', borderwidth: 1, font: { size: 10 }
          },
          xaxis: { 
            range: xAxisRange || defRange, 
            showticklabels: !isSmall, 
            rangeslider: { visible: !isSmall, range: getDefaultRange(true) },
            showline: true, linewidth: 1,
            linecolor: colorScheme === 'dark' ? '#aaa' : '#444'
          },
          yaxis: { 
            title: !isSmall ? {
              text: (() => {
                const longName = targetDisplayNameMap[selectedTarget];
                return targetYAxisLabelMap[longName] || longName || selectedTarget || 'Value';
              })(),
              font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000000', size: 12 }
            } : undefined,
            range: yAxisRange, 
            autorange: yAxisRange === null, 
            tickfont: { size: 9, color: colorScheme === 'dark' ? '#c1c2c5' : '#000000' },
            tickformat: '.2f',
            ticksuffix: '%'
          },
          hovermode: isSmall ? false : 'closest', 
          hoverlabel: { 
            namelength: -1,
            bgcolor: colorScheme === 'dark' ? '#1a1b1e' : '#fff',
            bordercolor: colorScheme === 'dark' ? '#444' : '#ccc',
            font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000' }
          },
          shapes: selectedDates.map(d => ({ type: 'line', x0: d, x1: d, y0: 0, y1: 1, yref: 'paper', line: { color: 'red', width: 1, dash: 'dash' } }))
        }}
        config={{ displayModeBar: !isSmall, responsive: true, displaylogo: false, staticPlot: isSmall }}
        onRelayout={(e) => {
          if (e['xaxis.range']) { setXAxisRange(e['xaxis.range']); } 
          else if (e['xaxis.autorange']) { setXAxisRange(null); }
        }}
      />
    </>
  );

  return isSmall ? (
    <Paper 
      withBorder 
      p="xs" 
      radius="md" 
      shadow="xs" 
      style={{ 
        position: 'relative',
        cursor: 'pointer',
        border: '1px solid #dee2e6'
      }}
    >
      {PlotContent}
      <Box 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          borderRadius: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.parentElement.style.transform = 'translateY(-4px)';
          e.currentTarget.parentElement.style.borderColor = '#2563eb';
          e.currentTarget.parentElement.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.parentElement.style.transform = 'translateY(0)';
          e.currentTarget.parentElement.style.borderColor = '#dee2e6';
          e.currentTarget.parentElement.style.boxShadow = 'none';
        }}
      />
    </Paper>
  ) : (
    <Box style={{ position: 'relative' }}>
      {PlotContent}
    </Box>
  );
};

const MetroCastView = ({ data, metadata, selectedDates, selectedModels, models, setSelectedModels, windowSize, getDefaultRange, selectedTarget }) => {
  const { colorScheme } = useMantineColorScheme();
  const { handleLocationSelect } = useView(); 
  const [childData, setChildData] = useState({});
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [xAxisRange, setXAxisRange] = useState(null); 

  const stateName = data?.metadata?.location_name;
  const stateCode = METRO_STATE_MAP[stateName];
  const forecasts = data?.forecasts;

  const activeModels = useMemo(() => {
    const activeModelSet = new Set();
    if (!forecasts || !selectedTarget || !selectedDates.length) return activeModelSet;
    selectedDates.forEach(date => {
      const targetData = forecasts[date]?.[selectedTarget];
      if (targetData) Object.keys(targetData).forEach(m => activeModelSet.add(m));
    });
    return activeModelSet;
  }, [forecasts, selectedDates, selectedTarget]);

  useEffect(() => { setXAxisRange(null); }, [selectedTarget]);

  useEffect(() => {
    if (!stateCode || !metadata?.locations) {
      setChildData({});
      return;
    }

    const fetchChildren = async () => {
      setLoadingChildren(true);
      const results = {};
      const cityList = metadata.locations.filter(l => l.location_name.includes(`, ${stateCode}`));

      await Promise.all(cityList.map(async (city) => {
        try {
          const res = await fetch(getDataPath(`flumetrocast/${city.abbreviation}_flu_metrocast.json`));
          if (res.ok) { results[city.abbreviation] = await res.json(); }
        } catch (e) { console.error(e); }
      }));

      setChildData(results);
      setLoadingChildren(false);
    };

    fetchChildren();
  }, [stateCode, metadata, selectedTarget]);

  if (!selectedTarget) return <Center h={300}><Text>Please select a target.</Text></Center>;

  return (
    <Stack gap="xl">
      <LastFetched timestamp={metadata?.last_updated} />
      
      <MetroPlotCard 
        locationData={data} 
        title={`${stateName}`}
        colorScheme={colorScheme}
        windowSize={windowSize}
        selectedTarget={selectedTarget}
        selectedModels={selectedModels}
        selectedDates={selectedDates}
        getDefaultRange={getDefaultRange}
        xAxisRange={xAxisRange}
        setXAxisRange={setXAxisRange}
        isSmall={false}
      />

      {stateCode && (
        <Stack gap="md">
          {loadingChildren ? (
            <Center p="xl"><Loader size="sm" /></Center>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} gap="md">
                {Object.entries(childData).map(([abbr, cityData]) => (
                  <UnstyledButton 
                    key={abbr} 
                    onClick={() => handleLocationSelect(abbr)} 
                    style={{ width: '100%' }}
                  >
                    <MetroPlotCard 
                      locationData={cityData}
                      title={cityData.metadata?.location_name}
                      isSmall={true}
                      colorScheme={colorScheme}
                      windowSize={windowSize}
                      selectedTarget={selectedTarget}
                      selectedModels={selectedModels}
                      selectedDates={selectedDates}
                      getDefaultRange={getDefaultRange}
                      xAxisRange={xAxisRange}
                      setXAxisRange={setXAxisRange}
                    />
                  </UnstyledButton>
                ))}
              </SimpleGrid>
            </>
          )}
        </Stack>
      )}
      <div style={{ borderTop: '1px solid #FFF', paddingTop: '1px', marginTop: 'auto' }}>
        <p style={{ 
          fontStyle: 'italic', 
          fontSize: '12px', 
          color: '#868e96', 
          textAlign: 'right',
          margin: 0 
        }}>
          Note that forecasts should be interpreted with great caution and may not reliably predict rapid changes in disease trends.
        </p>
      </div>
      <ModelSelector
        models={models}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        activeModels={activeModels} 
        getModelColor={(m, sel) => MODEL_COLORS[sel.indexOf(m) % MODEL_COLORS.length]}
      />
    </Stack>
  );
};

export default MetroCastView;