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
  useMantineColorScheme,
  Button // NEW: Imported Button component
} from '@mantine/core';
import {
  IconUpload,
  IconFileText,
  IconArrowLeft // NEW: Imported IconArrowLeft
} from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import ModelSelector from '../ModelSelector'; // Adjust path as needed
import DateSelector from '../DateSelector';   // Adjust path as needed
import { MODEL_COLORS } from '../../config/datasets'; // Adjust path as needed

const MyRespiLensDashboard = () => {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // --- State Management ---
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for the plot
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  
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

          const availableModels = data.metadata.hubverse_keys.models || [];
          const forecastDates = Object.keys(data.forecasts || {}).sort((a, b) => new Date(a) - new Date(b));
          
          setModels(availableModels);
          if (availableModels.length > 0) {
            // default model selection is whichever is first alphabetically 
            const sortedModels = [...availableModels].sort();
            setSelectedModels([sortedModels[0]]);
          } else {
            setSelectedModels([]);
          }
          
          setAvailableDates(forecastDates);
          if (forecastDates.length > 0) {
            const latestDate = forecastDates[forecastDates.length - 1];
            setSelectedDates([latestDate]);
            setActiveDate(latestDate);
          }

        } catch (error) {
          console.error("Error parsing JSON file:", error);
          alert("Could not read the file. Please ensure it is a valid JSON file.");
          setUploadedFile(null); 
          setFileData(null);
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        setIsProcessing(false);
        alert("An error occurred while reading the file.");
        console.error("FileReader error.");
      };

      reader.readAsText(uploadedFile);
    }
  }, [uploadedFile]);

  // --- Event Handlers ---
  const handleDragEnter = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

  const processFile = (file) => {
    if (file && file.name.endsWith('.json')) {
      setFileData(null);
      setUploadedFile(file);
    } else {
      alert('Please upload a .json file');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, []);
  
  // NEW: Function to reset the state and go back to the upload screen
  const handleReset = useCallback(() => {
    setUploadedFile(null);
    setFileData(null);
    // Also reset plot-specific state for a clean slate
    setModels([]);
    setSelectedModels([]);
    setAvailableDates([]);
    setSelectedDates([]);
    setActiveDate(null);
  }, []);

  // --- Main Render Logic ---
  if (isProcessing) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '70vh' }}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }
  
  if (fileData) {
    // --- Plotting Logic (runs only after file is processed) ---
    const getModelColor = (model) => {
      const index = models.indexOf(model);
      return MODEL_COLORS[index % MODEL_COLORS.length];
    };
    const target = Object.keys(fileData.ground_truth).find(k => k !== 'dates' && Array.isArray(fileData.ground_truth[k]));
    const groundTruthTrace = {
        x: fileData.ground_truth.dates || [],
        y: fileData.ground_truth[target] || [],
        type: 'scatter', mode: 'lines+markers', name: 'Observed',
        line: { color: '#8884d8', width: 2 }
    };
    const modelTraces = selectedModels.flatMap(model => {
      const modelColor = getModelColor(model);
      return selectedDates.flatMap(forecastDate => {
        const forecastData = fileData.forecasts[forecastDate]?.[target]?.[model];
        if (!forecastData || forecastData.type !== 'quantile' || !forecastData.predictions) return [];
        const predictions = Object.values(forecastData.predictions).sort((a, b) => new Date(a.date) - new Date(b.date));
        const forecastDates = predictions.map(p => p.date);
        const getQuantile = (q) => predictions.map(p => p.values[p.quantiles.indexOf(q)] ?? 0);
        return [
          { x: [...forecastDates, ...[...forecastDates].reverse()], y: [...getQuantile(0.975), ...[...getQuantile(0.025)].reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 95% CI`, hoverinfo: 'none' },
          { x: [...forecastDates, ...[...forecastDates].reverse()], y: [...getQuantile(0.75), ...[...getQuantile(0.25)].reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 50% CI`, hoverinfo: 'none' },
          { x: forecastDates, y: getQuantile(0.5), name: model, type: 'scatter', mode: 'lines+markers', line: { color: modelColor, width: 2 }, marker: { size: 6 } }
        ];
      });
    });
    const traces = [groundTruthTrace, ...modelTraces];
    const layout = {
      // title: `Weekly Incident Hospitalizations`,, maybe add a title later
      template: colorScheme === 'dark' ? 'plotly_dark' : 'plotly_white',
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: colorScheme === 'dark' ? '#c1c2c5' : '#000000' },
      height: 600,
      margin: { l: 60, r: 30, t: 50, b: 80 },
      showlegend: false,
      xaxis: { rangeslider: { thickness: 0.05 } },
      yaxis: { title: 'Hospitalizations' },
      shapes: selectedDates.map(date => ({
        type: 'line', x0: date, x1: date, y0: 0, y1: 1, yref: 'paper',
        line: { color: 'red', width: 1, dash: 'dash' }
      })),
    };

    return (
      <Container size="xl" py="xl" style={{ maxWidth: '1400px' }}>
        {/* NEW: Added the button to go back to the upload screen */}
        <Group justify="flex-start" mb="md">
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleReset}
          >
            Upload a different file
          </Button>
        </Group>

        <Title order={2} mb="xl" ta="center">
          Forecasts for {fileData.metadata.location_name}
        </Title>
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md" style={{ minHeight: '70vh' }}>
            <DateSelector
              availableDates={availableDates}
              selectedDates={selectedDates}
              setSelectedDates={setSelectedDates}
              activeDate={activeDate}
              setActiveDate={setActiveDate}
            />
            <div style={{ flex: 1, minHeight: 0 }}>
              <Plot
                data={traces}
                layout={layout}
                style={{ width: '100%' }}
                config={{ responsive: true, displaylogo: false }}
              />
            </div>
            <ModelSelector
              models={models}
              selectedModels={selectedModels}
              setSelectedModels={setSelectedModels}
              getModelColor={getModelColor}
            />
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Fallback return for the initial upload UI
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