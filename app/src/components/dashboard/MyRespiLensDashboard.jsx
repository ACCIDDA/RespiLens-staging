import { useState, useCallback, useEffect } from 'react'; 
import { useSearchParams } from 'react-router-dom'; 
import { Container, Title, Text, Group, Stack, ThemeIcon, Paper, Center } from '@mantine/core';
import { IconUpload, IconFileText, IconCheck } from '@tabler/icons-react';

const MyRespiLensDashboard = () => {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.respilens.json')) {
        setUploadedFile(file);
        // Here you would process the file
        console.log('Processing .respilens.json file:', file.name);
      } else {
        alert('Please upload a .respilens.json file');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.respilens.json')) {
        setUploadedFile(file);
        console.log('Processing .respilens.json file:', file.name);
      } else {
        alert('Please upload a .respilens.json file');
      }
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
                  Drop your .respilens.json file here
                </Title>
                <Text size="lg" c="dimmed" mb="sm">
                  or click to browse files
                </Text>
                <Text size="sm" c="dimmed">
                  Upload your RespiLens data file to view your personalized dashboard
                </Text>
              </div>

              <Group gap="sm">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconFileText size={14} />
                </ThemeIcon>
                <Text size="sm" fw={500} c="blue">
                  .respilens.json files only
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
          <Paper shadow="sm" p="xl" radius="lg" withBorder style={{ width: '100%', maxWidth: '600px' }}>
            <Stack align="center" gap="xl">
              <ThemeIcon size={80} variant="light" color="green">
                <IconCheck size={40} />
              </ThemeIcon>
              
              <div style={{ textAlign: 'center' }}>
                <Title order={2} mb="md" c="green">
                  File uploaded successfully!
                </Title>
                <Text size="lg" c="dimmed" mb="sm">
                  {uploadedFile.name}
                </Text>
                <Text size="sm" c="dimmed">
                  Processing your RespiLens data...
                </Text>
              </div>
            </Stack>
          </Paper>
        )}
      </Center>
    </Container>
  );
};

export default MyRespiLensDashboard;
