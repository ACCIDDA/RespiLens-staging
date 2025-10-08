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
  Loader
} from '@mantine/core';
import {
  IconUpload,
  IconFileText,
  IconCheck,
  IconMapPin // import an icon for the location
} from '@tabler/icons-react';

const MyRespiLensDashboard = () => {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams({}, { replace: true });
  }, []);

  const [dragActive, setDragActive] = useState(false);
  const [fileData, setFileData] = useState(null); // hold parsed json data
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // track if the file is being read and parsed

  // NEW: useEffect hook to read the file whenever 'uploadedFile' changes
  useEffect(() => {
    if (uploadedFile) {
      setIsProcessing(true); // Start processing
      const reader = new FileReader();

      // Define what happens when the file is successfully read
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const data = JSON.parse(content);
          setFileData(data); // Store the parsed JSON data in state
        } catch (error) {
          console.error("Error parsing JSON file:", error);
          alert("Could not read the file. Please ensure it is a valid JSON file.");
          setUploadedFile(null); // Reset on error
          setFileData(null);
        } finally {
          setIsProcessing(false); // Finish processing
        }
      };

      // Define what happens on a file read error
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("An error occurred while reading the file.");
        setIsProcessing(false);
      };

      // Start reading the file as text
      reader.readAsText(uploadedFile);
    }
  }, [uploadedFile]); // This effect depends on 'uploadedFile'

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

  const handleDrop = useCallback((e) => { // new handleDrop
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => { // new handleFileSelect
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, []);

  return (
    <Container size="xl" py="xl" style={{ maxWidth: '800px' }}>
      <Center style={{ minHeight: '70vh' }}>
        {!uploadedFile ? (
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
        ) : (
          // NEW: Updated success UI that shows processing state and final data
          <Paper shadow="sm" p="xl" radius="lg" withBorder style={{ width: '100%', maxWidth: '600px' }}>
            <Stack align="center" gap="xl">
              <ThemeIcon size={80} variant="light" color="green">
                <IconCheck size={40} />
              </ThemeIcon>
              
              <div style={{ textAlign: 'center' }}>
                <Title order={2} mb="md" c="green">
                  File Uploaded
                </Title>
                
                {isProcessing && (
                  <Group justify="center">
                    <Loader size="sm" />
                    <Text c="dimmed">Processing {uploadedFile.name}...</Text>
                  </Group>
                )}

                {fileData && !isProcessing && (
                  <Group justify="center" gap="xs">
                    <IconMapPin size={24} />
                    <Text size="xl">
                      {fileData.metadata.location_name}
                    </Text>
                  </Group>
                )}
              </div>
            </Stack>
          </Paper>
        )}
      </Center>
    </Container>
  );
};

export default MyRespiLensDashboard;