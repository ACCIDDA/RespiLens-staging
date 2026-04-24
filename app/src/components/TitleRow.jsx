import { Box, Title } from "@mantine/core";
import LastFetched from "./LastFetched";

const TitleRow = ({ title, timestamp }) => {
  if (!title && !timestamp) return null;

  return (
    <Box
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {title && (
        <Title order={5} style={{ textAlign: "center" }}>
          {title}
        </Title>
      )}
      {timestamp && (
        <Box style={{ position: "absolute", right: 0 }}>
          <LastFetched timestamp={timestamp} />
        </Box>
      )}
    </Box>
  );
};

export default TitleRow;
