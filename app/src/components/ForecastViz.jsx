// src/components/ForecastViz.jsx

import { useState, useEffect } from 'react';
import { Stack, Container, Paper, Group, Button, Tooltip, Title, Anchor, List } from '@mantine/core';
import { useView } from '../hooks/useView';
import DateSelector from './DateSelector';
import DataVisualization from './DataVisualization';
import ErrorBoundary from './ErrorBoundary';
import AboutHubOverlay from './AboutHubOverlay';
import { IconShare, IconBrandGithub } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';

const ForecastViz = () => {
  // Get EVERYTHING from the single context hook
  const {
    selectedLocation,
    data, metadata, loading, error, availableDates, models,
    selectedModels, setSelectedModels,
    selectedDates, setSelectedDates,
    activeDate, setActiveDate,
    viewType,
    currentDataset,
    selectedColumns,
    setSelectedColumns,
  } = useView();

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const clipboard = useClipboard({ timeout: 2000 });

  // Configuration for AboutHubOverlay based on viewType
  const aboutHubConfig = {
    'covid_ts': {
      title: (
        <Group gap="sm">
          <Title order={4}>COVID-19 Forecast Hub</Title>
          <Anchor
            href="https://github.com/CDCgov/covid19-forecast-hub"
            target="_blank"
            rel="noopener noreferrer"
            c="dimmed"
          >
            <IconBrandGithub size={20} />
          </Anchor>
        </Group>
      ),
      buttonLabel: "About COVID-19 Forecast Hub",
      content: (
        <>
          <p>
            The COVID-19 Forecast Hub is a repository run by the US CDC designed to collect forecast data for two targets:
            <p></p>
            <List spacing="xs" size="sm">
              <List.Item>Weekly new hospitalizations due to COVID-19</List.Item>
              <List.Item>Weekly incident percentage of emergency department visits due to COVID-19</List.Item>
            </List>
            <p></p>
            Data for a specific target can be viewed in RespiLens by model and date, with ground truth values plotted in purple.
          </p>
          <div>
            <Title order={4} mb="xs">Forecasts</Title>
            <p>
              Models are asked to make specific quantitative forecasts about the data that will be observed in the future.
              The confidence interval for a model's forecast for a chosen date is shown on the plot with a shadow.
            </p>
          </div>
          <div>
            <Title order={4} mb="xs">Targets</Title>
            <p>
              Participating models submit forecasts for "target" data, which is plotted by selecting a model.
              Presently, RespiLens plots projections for the COVID-19 target "weekly incident of COVID-19 hospitalizations".
            </p>
          </div>
        </>
      )
    },
    'rsv_ts': {
      title: (
        <Group gap="sm">
          <Title order={4}>RSV Forecast Hub</Title>
          <Anchor
            href="https://github.com/CDCgov/rsv-forecast-hub"
            target="_blank"
            rel="noopener noreferrer"
            c="dimmed"
          >
            <IconBrandGithub size={20} />
          </Anchor>
        </Group>
      ),
      buttonLabel: "About RSV Forecast Hub",
      content: (
        <>
          <p>
            The RSV Forecast Hub is a repository run by the US CDC designed to collect forecast data for two targets:
            <p></p>
            <List spacing="xs" size="sm">
              <List.Item>Weekly new hospitalizations due to RSV</List.Item>
              <List.Item>Weekly incident percentage of emergency department visits due to RSV</List.Item>
            </List>
            <p></p>
            Data for a specific target can be viewed in RespiLens by model and date, with ground truth values plotted in purple.
          </p>
          <div>
            <Title order={4} mb="xs">Forecasts</Title>
            <p>
              Models are asked to make specific quantitative forecasts about the data that will be observed in the future.
              The confidence interval for a model's forecast for a chosen date is shown on the plot with a shadow.
            </p>
          </div>
          <div>
            <Title order={4} mb="xs">Targets</Title>
            <p>
              Participating models submit forecasts for "target" data, which is plotted by selecting a model.
              Presently, RespiLens plots projections for the RSV target "weekly incident of RSV hospitalizations".
            </p>
          </div>
        </>
      )
    },
    'flu_ts': {
      title: (
        <Group gap="sm">
          <Title order={4}>FluSight Forecast Hub</Title>
          <Anchor
            href="https://github.com/cdcepi/FluSight-forecast-hub"
            target="_blank"
            rel="noopener noreferrer"
            c="dimmed"
          >
            <IconBrandGithub size={20} />
          </Anchor>
        </Group>
      ),
      buttonLabel: "About FluSight",
      content: (
        <>
          <p>
            FluSight is a repository run by the US CDC designed to collect flu forecast data for a particular flu season.
            Data for a specific target can be viewed in RespiLens by model and date, with ground truth values plotted in purple.
          </p>
          <div>
            <Title order={4} mb="xs">Forecasts</Title>
            <p>
              Models are asked to make specific quantitative forecasts about the data that will be observed in the future.
              The confidence interval for a model's forecast for a chosen date is shown on the plot with a shadow.
            </p>
          </div>
          <div>
            <Title order={4} mb="xs">Targets</Title>
            <p>
              Participating models submit "target" data, which is plotted by selecting a model.
              Presently, RespiLens plots projections for the FluSight target "weekly incident of flu hospitalizations".
            </p>
          </div>
        </>
      )
    },
    'fludetailed': {
      title: (
        <Group gap="sm">
          <Title order={4}>FluSight Forecast Hub</Title>
          <Anchor
            href="https://github.com/cdcepi/FluSight-forecast-hub"
            target="_blank"
            rel="noopener noreferrer"
            c="dimmed"
          >
            <IconBrandGithub size={20} />
          </Anchor>
        </Group>
      ),
      buttonLabel: "About FluSight",
      content: (
        <>
          <p>
            FluSight is a repository run by the US CDC designed to collect flu forecast data for a particular flu season.
            Data for a specific target can be viewed in RespiLens by model and date, with ground truth values plotted in purple.
          </p>
          <div>
            <Title order={4} mb="xs">Forecasts</Title>
            <p>
              Models are asked to make specific quantitative forecasts about the data that will be observed in the future.
              The confidence interval for a model's forecast for a chosen date is shown on the plot with a shadow.
            </p>
          </div>
          <div>
            <Title order={4} mb="xs">Targets</Title>
            <p>
              Participating models submit "target" data, which is plotted by selecting a model.
              Presently, RespiLens plots projections for the FluSight target "weekly incident of flu hospitalizations".
            </p>
          </div>
        </>
      )
    }
  };

  const currentAboutConfig = aboutHubConfig[viewType];

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleShare = () => {
    const url = window.location.href;
    clipboard.copy(url);
  };
  
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <Container size="xl" py="xl" style={{ maxWidth: '1400px' }}>
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md" style={{ minHeight: '70vh' }}>
            <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
              {currentAboutConfig && (
                <AboutHubOverlay
                  title={currentAboutConfig.title}
                  buttonLabel={currentAboutConfig.buttonLabel}
                >
                  {currentAboutConfig.content}
                </AboutHubOverlay>
              )}
              {currentDataset?.hasDateSelector && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <DateSelector
                    selectedDates={selectedDates}
                    setSelectedDates={setSelectedDates}
                    availableDates={availableDates}
                    activeDate={activeDate}
                    setActiveDate={setActiveDate}
                    loading={loading}
                  />
                </div>
              )}
              <Tooltip label={clipboard.copied ? 'Link copied' : 'Copy link to this view'}>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconShare size={16} />}
                  onClick={handleShare}
                  style={{ alignSelf: 'center' }}
                >
                  {clipboard.copied ? 'URL Copied' : 'Share View'}
                </Button>
              </Tooltip>
            </Group>
            <div style={{ flex: 1, minHeight: 0 }}>
              <DataVisualization
                // DataVisualization now receives all its data as props
                viewType={viewType}
                location={selectedLocation}
                data={data}
                metadata={metadata}
                loading={loading}
                error={error}
                availableDates={availableDates}
                models={models}
                selectedDates={selectedDates}
                selectedModels={selectedModels}
                setSelectedDates={setSelectedDates}
                setActiveDate={setActiveDate}
                setSelectedModels={setSelectedModels}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                windowSize={windowSize}
              />
            </div>
          </Stack>
        </Paper>
      </Container>
    </ErrorBoundary>
  );
};

export default ForecastViz;
