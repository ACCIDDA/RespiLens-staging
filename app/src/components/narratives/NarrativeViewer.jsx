import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  Group, 
  Button, 
  Stepper, 
  Card,
  Stack,
  Badge,
  ActionIcon,
  ScrollArea,
  Divider,
  Timeline,
  ThemeIcon
} from '@mantine/core';
import { 
  IconChevronLeft, 
  IconChevronRight, 
  IconBook,
  IconCalendar,
  IconTrendingUp,
  IconMapPin,
  IconUsers,
  IconPlaylistX
} from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

const NarrativeViewer = ({ narrativeId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [narrative, setNarrative] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sample narrative data - in real implementation, this would be fetched
  const sampleNarrative = {
    id: 'flu-winter-2024-25',
    title: 'Flu Season Winter 2024-25: A Data Story',
    description: 'An interactive narrative exploring the 2024-25 flu season trends, forecasting insights, and public health implications.',
    author: 'RespiLens Analytics Team',
    date: '2024-12-24',
    tags: ['Influenza', 'Forecasting', 'Public Health'],
    steps: [
      {
        id: 'introduction',
        title: 'Introduction: The 2024-25 Flu Season',
        content: `
# Introduction: The 2024-25 Flu Season

The 2024-25 influenza season has shown unique patterns compared to previous years. This narrative will walk you through the key insights from our forecasting models and surveillance data.

## Key Highlights
- Early season onset in several regions
- Unusual strain circulation patterns  
- Model performance variations across states
- Public health response adaptations

Let's explore the data together and understand what it tells us about this flu season.
        `,
        visualization: {
          type: 'fludetailed',
          location: 'US',
          dates: ['2024-12-14', '2024-12-21'],
          models: ['FluSight-ensemble', 'CU-ensemble']
        }
      },
      {
        id: 'trends',
        title: 'National Trends and Patterns',
        content: `
# National Trends and Patterns

At the national level, we're seeing several interesting patterns emerge:

## Rising Activity
The flu activity has been steadily increasing since early December, with hospitalizations showing a steep upward trajectory. This aligns with typical seasonal patterns but with some notable accelerations.

## Model Convergence
Most forecasting models are showing good agreement on the near-term trajectory, which increases our confidence in the predictions.

## Regional Variations
While the national picture shows clear trends, there's significant variation at the state level that we'll explore next.
        `,
        visualization: {
          type: 'flutimeseries',
          location: 'US',
          dates: ['2024-11-30', '2024-12-07', '2024-12-14', '2024-12-21'],
          models: ['FluSight-ensemble', 'CU-ensemble', 'CMU-TimeSeries']
        }
      },
      {
        id: 'regional',
        title: 'Regional Spotlight: Northeast vs. Southeast',
        content: `
# Regional Spotlight: Northeast vs. Southeast

Let's compare two regions with contrasting patterns:

## Northeast (New York)
- Early season onset
- High model confidence
- Rapid trajectory changes

## Southeast (Florida)  
- Delayed but accelerating growth
- Higher uncertainty in forecasts
- Weather pattern influences

This comparison highlights how local factors can significantly impact disease dynamics and forecasting accuracy.
        `,
        visualization: {
          type: 'fludetailed', 
          location: 'NY',
          dates: ['2024-12-14', '2024-12-21'],
          models: ['FluSight-ensemble', 'CU-ensemble']
        }
      },
      {
        id: 'implications',
        title: 'Public Health Implications',
        content: `
# Public Health Implications

Based on our analysis, several key implications emerge for public health decision-making:

## Timing of Interventions
The early onset in some regions suggests that intervention timing needs to be region-specific rather than following a national schedule.

## Resource Allocation
States showing rapid acceleration may need additional resource allocation for the coming weeks.

## Forecasting Insights
The good model agreement provides confidence for short-term planning, though longer-term uncertainty remains elevated.

## Recommendations
1. Enhanced surveillance in high-trajectory states
2. Early communication about vaccine importance
3. Flexible resource distribution strategies
        `,
        visualization: {
          type: 'fludetailed',
          location: 'FL', 
          dates: ['2024-12-14', '2024-12-21'],
          models: ['FluSight-ensemble', 'CU-ensemble', 'CMU-TimeSeries']
        }
      }
    ]
  };

  useEffect(() => {
    // Initialize from URL parameters
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const stepIndex = sampleNarrative.steps.findIndex(s => s.id === stepParam);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
      }
    }

    setNarrative(sampleNarrative);
    setLoading(false);
  }, [searchParams]);

  const handleStepChange = (stepIndex) => {
    setCurrentStep(stepIndex);
    const step = narrative.steps[stepIndex];
    setSearchParams({ step: step.id });
  };

  const nextStep = () => {
    if (currentStep < narrative.steps.length - 1) {
      handleStepChange(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      handleStepChange(currentStep - 1);
    }
  };

  const renderMarkdown = (content) => {
    // Simple markdown parser for basic formatting
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <Title key={index} order={2} mb="md">{line.substring(2)}</Title>;
        }
        if (line.startsWith('## ')) {
          return <Title key={index} order={3} mb="sm">{line.substring(3)}</Title>;
        }
        if (line.startsWith('- ')) {
          return <Text key={index} component="li" mb="xs">{line.substring(2)}</Text>;
        }
        if (line.match(/^\d+\./)) {
          return <Text key={index} component="li" mb="xs">{line.substring(line.indexOf('.') + 2)}</Text>;
        }
        if (line.trim()) {
          return <Text key={index} mb="md">{line}</Text>;
        }
        return <div key={index} style={{ height: '1rem' }} />;
      });
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Text ta="center">Loading narrative...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Text c="red" ta="center">Error loading narrative: {error}</Text>
      </Container>
    );
  }

  const currentStepData = narrative.steps[currentStep];

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Paper shadow="sm" p="md" mb="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs" mb="xs">
              <ThemeIcon size="sm" variant="light">
                <IconBook size={16} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Narrative</Text>
            </Group>
            <Title order={1} mb="xs">{narrative.title}</Title>
            <Text c="dimmed" mb="md">{narrative.description}</Text>
            <Group gap="md">
              <Group gap="xs">
                <IconUsers size={16} />
                <Text size="sm">{narrative.author}</Text>
              </Group>
              <Group gap="xs">
                <IconCalendar size={16} />
                <Text size="sm">{narrative.date}</Text>
              </Group>
            </Group>
          </div>
          <Group gap="xs">
            {narrative.tags.map(tag => (
              <Badge key={tag} variant="light" size="sm">{tag}</Badge>
            ))}
          </Group>
        </Group>
      </Paper>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1rem' }}>
        {/* Main Content */}
        <div>
          <Paper shadow="sm" p="lg" mb="md">
            <ScrollArea h={600}>
              {renderMarkdown(currentStepData.content)}
            </ScrollArea>
            
            <Divider my="md" />
            
            <Group justify="space-between">
              <Button
                variant="subtle"
                leftSection={<IconChevronLeft size={16} />}
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              <Text size="sm" c="dimmed">
                Step {currentStep + 1} of {narrative.steps.length}
              </Text>
              
              <Button
                variant="filled"
                rightSection={<IconChevronRight size={16} />}
                onClick={nextStep}
                disabled={currentStep === narrative.steps.length - 1}
              >
                Next
              </Button>
            </Group>
          </Paper>
        </div>

        {/* Sidebar Navigation */}
        <div>
          <Card shadow="sm" p="md">
            <Title order={4} mb="md">Navigation</Title>
            <Timeline active={currentStep} bulletSize={24} lineWidth={2}>
              {narrative.steps.map((step, index) => (
                <Timeline.Item
                  key={step.id}
                  bullet={
                    <ThemeIcon
                      size={20}
                      variant={index === currentStep ? 'filled' : 'light'}
                      radius="xl"
                    >
                      {index + 1}
                    </ThemeIcon>
                  }
                  title={
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      onClick={() => handleStepChange(index)}
                      style={{ 
                        fontWeight: index === currentStep ? 600 : 400,
                        color: index === currentStep ? 'var(--mantine-primary-color-filled)' : 'inherit'
                      }}
                    >
                      {step.title}
                    </Button>
                  }
                />
              ))}
            </Timeline>
          </Card>

          {/* Visualization Info */}
          {currentStepData.visualization && (
            <Card shadow="sm" p="md" mt="md">
              <Title order={5} mb="md">Current View</Title>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconMapPin size={16} />
                  <Text size="sm">{currentStepData.visualization.location}</Text>
                </Group>
                <Group gap="xs">
                  <IconTrendingUp size={16} />
                  <Text size="sm">{currentStepData.visualization.type}</Text>
                </Group>
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text size="sm">{currentStepData.visualization.dates?.length || 0} dates</Text>
                </Group>
              </Stack>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
};

export default NarrativeViewer;