import { useMemo } from 'react';
import { Stack, Button, Menu, Paper } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useView } from '../hooks/useView';
import { DATASETS } from '../config/datasets';

const ViewSelector = () => {
  const { viewType, setViewType } = useView();

  const datasetOrder = useMemo(() => ['covid', 'flu', 'rsv', 'nhsn'], []);
  const datasets = useMemo(
    () =>
      datasetOrder
        .map(key => DATASETS[key])
        .filter(Boolean),
    [datasetOrder]
  );

  const getDefaultProjectionsView = (dataset) => {
    const projectionsView = dataset.views.find(view => view.key === 'projections');
    return projectionsView?.value || dataset.defaultView || dataset.views[0]?.value;
  };

  const handleDatasetSelect = (dataset) => {
    const targetView = getDefaultProjectionsView(dataset);
    if (targetView) {
      setViewType(targetView);
    }
  };

  const handleViewSelect = (value) => {
    setViewType(value);
  };

  return (
    <Paper shadow="sm" radius="md" withBorder style={{ display: 'inline-block' }}>
      <Stack gap={0}>
        {datasets.map((dataset, index) => {
          const isActive = dataset.views.some(view => view.value === viewType);
          const isLast = index === datasets.length - 1;

          return (
            <Menu
              key={dataset.shortName}
              shadow="md"
              position="right-start"
              offset={5}
              withinPortal
              trigger="hover"
            >
              <Menu.Target>
                <Button
                  variant={isActive ? 'light' : 'subtle'}
                  color={isActive ? 'blue' : 'gray'}
                  size="sm"
                  rightSection={<IconChevronRight size={14} />}
                  radius={0}
                  fullWidth
                  onClick={() => handleDatasetSelect(dataset)}
                  styles={{
                    root: {
                      height: 36,
                      borderBottom: isLast ? 'none' : '1px solid var(--mantine-color-gray-3)'
                    },
                    inner: {
                      width: '100%',
                      justifyContent: 'space-between'
                    },
                    label: {
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }
                  }}
                >
                  {dataset.fullName}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {dataset.views.map(view => (
                  <Menu.Item
                    key={view.value}
                    onClick={() => handleViewSelect(view.value)}
                    color={view.value === viewType ? 'blue' : undefined}
                    leftSection={view.value === viewType ? <IconChevronRight size={14} /> : null}
                  >
                    {view.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default ViewSelector;
