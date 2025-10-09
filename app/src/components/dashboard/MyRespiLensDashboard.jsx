import React, { useState, useCallback, useEffect } from 'react'; 
import { useSearchParams } from 'react-router-dom'; 
import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  ThemeIcon,
  Paper,
  Center,
  Loader,
  useMantineColorScheme
} from '@mantine/core';
import {
  IconUpload,
  IconFileText,
  IconCheck,
  IconMapPin 
} from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import ModelSelector from '../ModelSelector'; // Assuming this component exists
import { MODEL_COLORS } from '../../config/datasets'; // Assuming this config exists

const MyRespiLensDashboard = () => {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams({}, { replace: true });
  }, []);

  // --- State Management ---
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // NEW: State for the plot, previously from useView
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  
  const { colorScheme } = useMantineColorScheme();

  // --- File Reading and Data Initialization ---
  useEffect(() => {
    if (uploadedFile) {
      setIsProcessing(true);
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const data = JSON.parse(content);
          setFileData(data);

          // NEW: Initialize plot state from the file's data
          const availableModels = data.metadata.hubverse_keys.models || [];
          const forecastDates = Object.keys(data.forecasts || {});
          
          setModels(availableModels);
          setSelectedModels(availableModels); // Select all models by default
          setSelectedDates(forecastDates); // Use all forecast dates from the file

        } catch (error) {
          console.error("Error parsing JSON file:", error);
          alert("Could not read the file. Please ensure it is a valid JSON file.");
          setUploadedFile(null);
          setFileData(null);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsText(uploadedFile);
    }
  }, [uploadedFile]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = (file) => {
    if (file && file.name.endsWith('.json')) {
      setFileData(null); // Reset previous data
      setUploadedFile(file); // Set the new file to trigger the useEffect
    } else {
      alert('Please upload a .json file');
    }
  };
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []);
  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  }, []);

  // Only try to render the plot if we have data
  if (fileData) {
    const getModelColor = (model) => {
      const index = models.indexOf(model);
      return MODEL_COLORS[index % MODEL_COLORS.length];
    };

    const target = Object.keys(fileData.ground_truth).find(k => k !== 'dates' && Array.isArray(fileData.ground_truth[k]));

    const groundTruthTrace = {
        x: fileData.ground_truth.dates || [],
        y: fileData.ground_truth[target] || [],
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Observed',
        line: { color: '#8884d8', width: 2 }
    };

    const modelTraces = selectedModels.flatMap(model => {
      const modelColor = getModelColor(model, models);
      return selectedDates.flatMap(forecastDate => {
        const forecastData = fileData.forecasts[forecastDate]?.[target]?.[model];
        if (!forecastData || forecastData.type !== 'quantile' || !forecastData.predictions) return [];
        
        const predictions = Object.values(forecastData.predictions).sort((a, b) => new Date(a.date) - new Date(b.date));
        const forecastDates = predictions.map(p => p.date);
        const medianValues = predictions.map(p => p.values[p.quantiles.indexOf(0.5)] ?? 0);
        const ci95Upper = predictions.map(p => p.values[p.quantiles.indexOf(0.975)] ?? 0);
        const ci95Lower = predictions.map(p => p.values[p.quantiles.indexOf(0.025)] ?? 0);
        const ci50Upper = predictions.map(p => p.values[p.quantiles.indexOf(0.75)] ?? 0);
        const ci50Lower = predictions.map(p => p.values[p.quantiles.indexOf(0.25)] ?? 0);
        
        return [
          { x: [...forecastDates, ...[...forecastDates].reverse()], y: [...ci95Upper, ...[...ci95Lower].reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 95% CI`, hoverinfo: 'none' },
          { x: [...forecastDates, ...[...forecastDates].reverse()], y: [...ci50Upper, ...[...ci50Lower].reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 50% CI`, hoverinfo: 'none' },
          { x: forecastDates, y: medianValues, name: model, type: 'scatter', mode: 'lines+markers', line: { color: modelColor, width: 2 }, marker: { size: 6 } }
        ];
      });
    });

    const traces = [groundTruthTrace, ...modelTraces];

    const layout = {
      template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000000' },
      height: 600,
      margin: { l: 60, r: 30, t: 50, b: 80 },
      showlegend: false,
      xaxis: { rangeslider: { thickness: 0.05 } },
      yaxis: { title: 'Weekly Incident Cases' },
      shapes: selectedDates.map(date => ({
        type: 'line', x0: date, x1: date, y0: 0, y1: 1, yref: 'paper',
        line: { color: 'red', width: 1, dash: 'dash' }
      })),
    };
    return (
    <Container size="xl" py="xl">
      {!uploadedFile ? (
        // --- This is the full UI for the initial upload screen ---
        <Center style={{ minHeight: '70vh' }}>
          <Paper
            shadow="sm"
            p="xl"
            radius="lg"
            withBorder
            style={{
              width: '100%',
              maxWidth: '600px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: dragActive 
                ? '2px dashed var(--mantine-primary-color-filled)' 
                : '2px dashed var(--mantine-color-gray-4)',
              backgroundColor: dragActive 
                ? 'var(--mantine-primary-color-light)' 
                : 'transparent'
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <Stack align="center" gap="xl">
              <ThemeIcon 
                size={80} 
                variant="light" 
                color={dragActive ? 'blue' : 'gray'}
                style={{ transition: 'all 0.2s ease' }}
              >
                <IconUpload size={40} />
              </ThemeIcon>
              
              <div style={{ textAlign: 'center' }}>
                <Title order={2} mb="md" c={dragActive ? 'blue' : 'dark'}>
                  Drop your RespiLens .json file here
                </Title>
                <Text size="sm" c="dimmed">
                  Upload your RespiLens data file to view your personalized dashboard
                </Text>
              </div>

              <Group gap="sm">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconFileText size={14} />
                </ThemeIcon>
                <Text size="sm" fw={500} c="blue">
                  RespiLens projections-style .json files only
                </Text>
              </Group>
            </Stack>
            
            <input
              id="file-input"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Paper>
        </Center>
      ) : (
        // --- This is the UI that displays after a file is uploaded ---
        <>
          <Title order={2} mb="xl" ta="center">
            Forecasts for {fileData.metadata.location_name}
          </Title>
          {isProcessing ? (
            <Center><Loader /></Center>
          ) : (
            <div>
              <Plot 
                data={traces} 
                layout={layout} 
                style={{ width: '100%' }} 
                config={{ responsive: true, displaylogo: false }} 
              />
              <ModelSelector 
                models={models} 
                selectedModels={selectedModels} 
                setSelectedModels={setSelectedModels} 
                getModelColor={(model) => getModelColor(model, models)} 
              />
            </div>
          )}
        </>
      )}
    </Container>
  );
  }
  // end plot rendering logic 

  return (
    <Container size="xl" py="xl" style={{ maxWidth: '800px' }}>
      <Center style={{ minHeight: '70vh' }}>
        <Paper
          shadow="sm"
          p="xl"
          radius="lg"
          withBorder
          style={{
            width: '100%',
            maxWidth: '600px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: dragActive 
              ? '2px dashed var(--mantine-primary-color-filled)' 
              : '2px dashed var(--mantine-color-gray-4)',
            backgroundColor: dragActive 
              ? 'var(--mantine-primary-color-light)' 
              : 'transparent'
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon 
              size={80} 
              variant="light" 
              color={dragActive ? 'blue' : 'gray'}
              style={{ transition: 'all 0.2s ease' }}
            >
              <IconUpload size={40} />
            </ThemeIcon>
            
            <div style={{ textAlign: 'center' }}>
              <Title order={2} mb="md" c={dragActive ? 'blue' : 'dark'}>
                Drop your RespiLens .json file here
              </Title>
              <Text size="sm" c="dimmed">
                Upload your RespiLens data file to view your personalized dashboard
              </Text>
            </div>

            <Group gap="sm">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconFileText size={14} />
              </ThemeIcon>
              <Text size="sm" fw={500} c="blue">
                RespiLens projections-style .json files only
              </Text>
            </Group>
          </Stack>
          
          <input
            id="file-input"
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Paper>
      </Center>
    </Container>
  );
};

export default MyRespiLensDashboard;