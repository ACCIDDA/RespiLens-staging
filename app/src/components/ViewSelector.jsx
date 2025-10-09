import { useMemo } from 'react';
import { Stack, Button, Text, Group, HoverCard } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useView } from '../hooks/useView';
import { DATASETS } from '../config/datasets';

const ViewSelector = () => {
  const { viewType, setViewType } = useView();

  const datasetOrder = useMemo(() => ['flu', 'rsv', 'covid', 'nhsn'], []);
  const datasets = useMemo(
    () =>
      datasetOrder
        .map(key => DATASETS[key])
        .filter(Boolean),
    [datasetOrder]
  );

  const getDefaultTimeseriesView = (dataset) => {
    const timeseriesView = dataset.views.find(view => view.key === 'timeseries');
    return timeseriesView?.value || dataset.defaultView || dataset.views[0]?.value;
  };

  const handleDatasetSelect = (dataset) => {
    const targetView = getDefaultTimeseriesView(dataset);
    if (targetView) {
      setViewType(targetView);
    }
  };

  const handleViewSelect = (value) => {
    setViewType(value);
  };

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="wrap">
        {datasets.map(dataset => {
          const isActive = dataset.views.some(view => view.value === viewType);

          return (
            <HoverCard key={dataset.shortName} shadow="md" withinPortal openDelay={80} closeDelay={120}>
              <HoverCard.Target>
                <Button
                  variant={isActive ? 'filled' : 'subtle'}
                  size="sm"
                  leftSection={<IconChevronRight size={14} />}
                  onClick={() => handleDatasetSelect(dataset)}
                  radius="md"
                  styles={{
                    root: {
                      minWidth: 160,
                      justifyContent: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.4rem 0.75rem'
                    }
                  }}
                >
                  {dataset.fullName}
                </Button>
              </HoverCard.Target>
              <HoverCard.Dropdown p="xs" style={{ minWidth: 220 }}>
                <Stack gap="xs">
                  {dataset.views.map(view => (
                    <Button
                      key={view.value}
                      variant={view.value === viewType ? 'filled' : 'light'}
                      size="xs"
                      leftSection={<IconChevronRight size={12} />}
                      onClick={() => handleViewSelect(view.value)}
                      styles={{
                        root: {
                          justifyContent: 'flex-start',
                          gap: '0.5rem',
                          padding: '0.35rem 0.75rem'
                        }
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm">{view.label}</Text>
                      </Group>
                    </Button>
                  ))}
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
          );
        })}
      </Group>
    </Stack>
  );
};

export default ViewSelector;
