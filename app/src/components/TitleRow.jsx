import { Box, Text } from '@mantine/core';
import LastFetched from './LastFetched';

const TitleRow = ({ title, timestamp }) => {
  if (!title && !timestamp) return null;

  return (
    <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {title && (
        <Text size="lg" c="black" style={{ fontWeight: 400, textAlign: 'center' }}>
          {title}
        </Text>
      )}
      {timestamp && (
        <Box style={{ position: 'absolute', right: 0 }}>
          <LastFetched timestamp={timestamp} />
        </Box>
      )}
    </Box>
  );
};

export default TitleRow;
