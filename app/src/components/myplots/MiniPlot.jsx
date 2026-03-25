import { useState, useEffect } from "react";
import { Center, Loader, Text, Box, Stack } from "@mantine/core";

const MiniPlot = ({ plot }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dataUrl = `/processed_data/${plot.fullDataPath}`;

        const response = await fetch(dataUrl);

        if (!response.ok) {
          throw new Error(`Data not found at ${dataUrl}`);
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (plot?.fullDataPath) {
      fetchData();
    }
  }, [plot.fullDataPath]);

  if (loading)
    return (
      <Center h={150}>
        <Loader size="sm" variant="dots" />
      </Center>
    );

  if (error)
    return (
      <Center h={150}>
        <Stack gap={4} align="center">
          <Text size="xs" c="red" fw={500}>
            Error loading chart
          </Text>
          <Text size="center" style={{ fontSize: "10px" }} c="dimmed">
            {plot.fullDataPath}
          </Text>
        </Stack>
      </Center>
    );

  return (
    <Box h={180} style={{ overflow: "hidden", position: "relative" }}>
      {/* Plot logic will eventually go here */}
      <Center h="100%">
        <Stack gap={4} align="center">
          <Text size="xs" fw={700} c="blue">
            Data Loaded Successfully
          </Text>
          <Text size="xs" c="dimmed">
            {plot.settings.location} - {plot.settings.target}
          </Text>
          <Text size="center" style={{ fontSize: "9px", opacity: 0.6 }}>
            {data?.forecasts
              ? `${Object.keys(data.forecasts).length} dates available`
              : "No forecast keys"}
          </Text>
        </Stack>
      </Center>
    </Box>
  );
};

export default MiniPlot;
