import { useState, useCallback, useEffect } from 'react';
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
  Button,
  Modal,
  Anchor
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUpload, IconFileText, IconArrowLeft, IconInfoCircle, IconDashboard } from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import ModelSelector from '../ModelSelector';
import DateSelector from '../DateSelector';
import { MODEL_COLORS } from '../../config/datasets';

const MyRespiLensDashboard = () => {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const [opened, { open, close }] = useDisclosure(false);

  const { colorScheme } = useMantineColorScheme();

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);

  useEffect(() => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        const data = JSON.parse(content);
        setFileData(data);

        const availableModels = data.metadata?.hubverse_keys?.models || [];
        const forecastDates = Object.keys(data.forecasts || {}).sort((a, b) => new Date(a) - new Date(b));

        setModels(availableModels);
        if (availableModels.length > 0) {
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
        } else {
          setSelectedDates([]);
          setActiveDate(null);
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('Could not read the file. Please ensure it is a valid JSON file.');
        setUploadedFile(null);
        setFileData(null);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      alert('An error occurred while reading the file.');
      console.error('FileReader error.');
    };

    reader.readAsText(uploadedFile);
  }, [uploadedFile]);

  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const processFile = useCallback((file) => {
    if (file && file.name.endsWith('.json')) {
      setFileData(null);
      setUploadedFile(file);
    } else {
      alert('Please upload a .json file');
    }
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (event.dataTransfer?.files?.[0]) {
        processFile(event.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (event) => {
      if (event.target.files?.[0]) {
        processFile(event.target.files[0]);
      }
    },
    [processFile]
  );

  const handleReset = useCallback(() => {
    setUploadedFile(null);
    setFileData(null);
    setModels([]);
    setSelectedModels([]);
    setAvailableDates([]);
    setSelectedDates([]);
    setActiveDate(null);
  }, []);

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
    const getModelColor = (model) => {
      const index = models.indexOf(model);
      return MODEL_COLORS[index % MODEL_COLORS.length];
    };
    const target = Object.keys(fileData.ground_truth || {}).find(key => key !== 'dates' && Array.isArray(fileData.ground_truth[key]));

    const groundTruthTrace = {
      x: fileData.ground_truth?.dates || [],
      y: target ? fileData.ground_truth?.[target] || [] : [],
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Observed',
      line: { color: '#8884d8', width: 2 }
    };

    const modelTraces = selectedModels.flatMap(model => {
      const modelColor = getModelColor(model);
      return selectedDates.flatMap(forecastDate => {
        const forecastData = fileData.forecasts?.[forecastDate]?.[target]?.[model];
        if (!forecastData || forecastData.type !== 'quantile' || !forecastData.predictions) {
          return [];
        }

        const predictions = Object.values(forecastData.predictions || {}).sort((a, b) => new Date(a.date) - new Date(b.date));
        const forecastDates = predictions.map(pred => pred.date);
        const getQuantile = (q) => predictions.map(pred => {
          if (!pred.quantiles || !pred.values) return 0;
          const index = pred.quantiles.indexOf(q);
          return index !== -1 ? (pred.values[index] ?? 0) : 0;
        });

        return [
          {
            x: [...forecastDates, ...[...forecastDates].reverse()],
            y: [...getQuantile(0.975), ...[...getQuantile(0.025)].reverse()],
            fill: 'toself',
            fillcolor: `${modelColor}10`,
            line: { color: 'transparent' },
            showlegend: false,
            type: 'scatter',
            name: `${model} 95% CI`,
            hoverinfo: 'none'
          },
          {
            x: [...forecastDates, ...[...forecastDates].reverse()],
            y: [...getQuantile(0.75), ...[...getQuantile(0.25)].reverse()],
            fill: 'toself',
            fillcolor: `${modelColor}30`,
            line: { color: 'transparent' },
            showlegend: false,
            type: 'scatter',
            name: `${model} 50% CI`,
            hoverinfo: 'none'
          },
          {
            x: forecastDates,
            y: getQuantile(0.5),
            name: model,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: modelColor, width: 2 },
            marker: { size: 6 }
          }
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
      yaxis: { title: 'Hospitalizations' },
      shapes: selectedDates.map(date => ({
        type: 'line',
        x0: date,
        x1: date,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: 'red', width: 1, dash: 'dash' }
      }))
    };

    return (
      <Container size="xl" py="xl" style={{ maxWidth: '1400px' }}>
        <Group justify="flex-start" mb="md">
          <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={handleReset}>
            Upload a different file
          </Button>
        </Group>

        <Title order={2} mb="xl" ta="center">
          Forecasts for {fileData.metadata?.location_name || 'Selected Location'}
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
              <Plot data={traces} layout={layout} style={{ width: '100%' }} config={{ responsive: true, displaylogo: false }} />
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

  return (
    <Container size="xl" py="xl" style={{ maxWidth: '800px' }}>
      <Center style={{ minHeight: '70vh' }}>
        <Stack align="center" gap="xl" style={{ width: '100%', maxWidth: '600px' }}>
          <Modal 
            opened={opened} 
            onClose={close} 
            title={
              <Group gap="xs">
                <IconDashboard color="var(--mantine-color-blue-6)" />
                <Text fw={700} size="lg">MyRespiLens</Text>
              </Group>
            } 
            centered
          >
            <Stack>
              <Title order={4}>About</Title>
              <Text>
                MyRespiLens is a secure feature within the RespiLens platform that allows users to 
                visualize their own public health data directly in their browser. All processing happens locally on
                your machine, meaning your data is never uploaded or shared. This ensures privacy and removes
                the need for data-sharing agreements.
              </Text>
              <Title order={4}>Data Structure</Title>
              <Text>MyRespiLens expects uploaded data to be valid JSON and in RespiLens projections format.</Text>
              <Text fw={700}>
                RespiLens projections format is the internally-defined JSON style for
                forecast data. JSON schema for this format can be found in the 
                <Anchor href="https://github.com/ACCIDDA/RespiLens-staging/blob/main/scripts/schemas/RespiLens_projections.schema.json" target="_blank" rel="noopener noreferrer"> RespiLens GitHub repository</Anchor>.
                You can convert your .csv Hubverse-style data to .json RespiLens projections-style data using either:
              </Text>
              <Text><code>external_to_projections.py</code> using python, or</Text>
              <Text><code>external_to_projections.R</code> using R.</Text>
              <Text>
                Both files can be found in the <code>scripts/</code> directory of the RespiLens GitHub repository,
                and have functionality documented  
                <Anchor href="https://github.com/ACCIDDA/RespiLens-staging/tree/main/scripts#readme" target="_blank" rel="noopener noreferrer"> here.</Anchor>
              </Text>
            </Stack>
          </Modal>

          <Group justify="center" style={{ width: '100%' }}>
            <Button
              variant="light"
              size="xs"
              color='red'
              onClick={open}
              leftSection={<IconInfoCircle size={16} />}
            >
              What is MyRespiLens?
            </Button>
          </Group>

          <Paper
            shadow="sm"
            p="xl"
            radius="lg"
            withBorder
            style={{
              width: '100%',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: dragActive ? '2px dashed var(--mantine-primary-color-filled)' : '2px dashed var(--mantine-color-gray-4)',
              backgroundColor: dragActive ? 'var(--mantine-primary-color-light)' : 'transparent'
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Stack align="center" gap="xl">
              <ThemeIcon size={80} variant="light" color={dragActive ? 'blue' : 'gray'} style={{ transition: 'all 0.2s ease' }}>
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

            <input id="file-input" type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileSelect} />
          </Paper>
        </Stack>
      </Center>
    </Container>
  );
};

export default MyRespiLensDashboard;
