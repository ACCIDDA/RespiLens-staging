import { Alert, Text } from '@mantine/core';
import { useState } from 'react'; 
import { IconAlertTriangle } from '@tabler/icons-react';

function ShutdownBanner() {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      title="Service Notification"
      color="orange"
      icon={<IconAlertTriangle size="1.1rem" />}
      withCloseButton
      onClose={() => setIsVisible(false)} 
      closeButtonLabel="Dismiss notification"
      radius={0}
    >
      <Text>
        Due to the U.S. government shutdown, forecasting hubs are not producing data. RespiLens will update with new forecasts as soon as they are available.
      </Text>
    </Alert>
  );
}

export default ShutdownBanner;