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
    'covid_projs': {
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
    'rsv_projs': {
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
    'flu_projs': {
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
    },
    'nhsnall': {
      title: (
        <Group gap="sm">
          <Title order={4}>National Healthcare Safety Network (NHSN)</Title>
        </Group>
      ),
      buttonLabel: "About NHSN Data",
      content: (
        <>
          <p>
            Data for the RespiLens NHSN view comes from the CDC's <a href="https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Data-HRD-Metrics-by-Ju/ua7e-t2fy/about_data" target="_blank" rel="noopener noreferrer">National Healthcare Safety Network</a> weekly "Hospital Respiratory Data" (HRD) dataset.
            This dataset represents metrics aggregated to national and state/territory levels beginning in August 2020. To plot data, you can select
            NHSN column(s).
          </p>
          <div>
            <Title order={4} mb="xs">Columns</Title>
            <p>
              The NHSN dataset contains ~300 columns for plotting data with a variety of scales, including hospitalization admission counts, percent of
              admissions by pathogen, hospitalization rates, number of hospitals reporting, raw bed capacity numbers, bed capacity percents, and absolute
              percentage of change. Presently on RespiLens, you are only able to plot NHSN columns relating to raw patient counts.
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowSize.width > 800 ? 'auto 1fr auto' : '1fr',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gridColumn: windowSize.width > 800 ? 'auto' : '1'
              }}>
                {currentAboutConfig && (
                  <AboutHubOverlay
                    title={currentAboutConfig.title}
                    buttonLabel={currentAboutConfig.buttonLabel}
                  >
                    {currentAboutConfig.content}
                  </AboutHubOverlay>
                )}
                {windowSize.width <= 800 && (
                  <Tooltip label={clipboard.copied ? 'Link copied' : 'Copy link to this view'}>
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconShare size={16} />}
                      onClick={handleShare}
                    >
                      {clipboard.copied ? 'URL Copied' : 'Share View'}
                    </Button>
                  </Tooltip>
                )}
              </div>
              {currentDataset?.hasDateSelector && windowSize.width > 800 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
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
              {windowSize.width > 800 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip label={clipboard.copied ? 'Link copied' : 'Copy link to this view'}>
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconShare size={16} />}
                      onClick={handleShare}
                    >
                      {clipboard.copied ? 'URL Copied' : 'Share View'}
                    </Button>
                  </Tooltip>
                </div>
              )}
              {currentDataset?.hasDateSelector && windowSize.width <= 800 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
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
            </div>
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
