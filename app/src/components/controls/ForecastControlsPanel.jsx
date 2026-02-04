import { useState } from 'react';
import { Drawer, Button, Stack } from '@mantine/core';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import ForecastChartControls from './ForecastChartControls';

const ForecastControlsPanel = ({
  chartScale,
  setChartScale,
  intervalVisibility,
  setIntervalVisibility,
  showLegend,
  setShowLegend,
  defaultOpen = false,
  label = 'Advanced controls'
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconAdjustmentsHorizontal size={14} />}
        onClick={() => setOpen(true)}
        style={{ alignSelf: 'flex-start' }}
      >
        {label}
      </Button>
      <Drawer
        opened={open}
        onClose={() => setOpen(false)}
        title={label}
        position="left"
        size="sm"
        padding="md"
      >
        <Stack gap="sm">
          <ForecastChartControls
            chartScale={chartScale}
            setChartScale={setChartScale}
            intervalVisibility={intervalVisibility}
            setIntervalVisibility={setIntervalVisibility}
            showLegend={showLegend}
            setShowLegend={setShowLegend}
          />
        </Stack>
      </Drawer>
    </>
  );
};

export default ForecastControlsPanel;
