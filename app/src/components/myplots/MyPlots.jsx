import {
  Title,
  Text,
  Paper,
  Stack,
  ThemeIcon,
  Center,
  SimpleGrid,
  Box,
} from "@mantine/core";
import { IconChartScatter } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { getSavedPlots, deletePlot } from "../utils/plotStorage";

const MyPlots = () => {
  const [userSavedPlots, setUserSavedPlots] = useState([]);

  useEffect(() => {
    // Using your new utility to get validated plots
    setUserSavedPlots(getSavedPlots());
  }, []);

  const handleDelete = (id) => {
    if (deletePlot(id)) {
      setUserSavedPlots(getSavedPlots()); // Refresh list
    }
  };
  const hasPlots = userSavedPlots.length > 0;

  // filler grid pattern (for if you have no plots saved yet)
  const fullGridPattern = {
    width: "100%",
    minHeight: "calc(100vh - 80px)",
    backgroundPosition: "top left",
    backgroundImage: `
      linear-gradient(to right, var(--mantine-color-gray-2) 1px, transparent 1px),
      linear-gradient(to bottom, var(--mantine-color-gray-2) 1px, transparent 1px)
    `,
    backgroundSize: "60px 60px",
    backgroundColor: "var(--mantine-color-body)",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <Box style={fullGridPattern}>
      <Center style={{ minHeight: "100vh", padding: "40px" }}>
        {!hasPlots ? (
          /* empty state: no plots chosen yet */
          <Paper
            shadow="xl"
            p="xl"
            radius="lg"
            withBorder
            style={{
              width: "100%",
              maxWidth: "550px",
              backgroundColor: "var(--mantine-color-body)",
              border: "2px solid #2563eb",
            }}
          >
            <Stack align="center" gap="xl">
              <ThemeIcon size={80} variant="light" color="gray" radius="xl">
                <IconChartScatter size={40} />
              </ThemeIcon>

              <div style={{ textAlign: "center" }}>
                <Title order={2} mb="md">
                  No plots saved yet...
                </Title>
                <Text size="sm" c="dimmed">
                  You haven't added any visualizations to <b>My Plots</b> yet.
                  Click the "Add to My Plots" button on any plot view to see
                  them here with any editorializations you choose.
                </Text>
              </div>

              <Text size="xs" fw={500} c="blue" style={{ opacity: 0.7 }}>
                Plots are stored locally in your browser.
              </Text>
            </Stack>
          </Paper>
        ) : (
          /* render for if there are actually plots -- unfinished */
          <Stack
            style={{
              width: "100%",
              maxWidth: "1400px",
              backgroundColor: "rgba(255,255,255,0.85)",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "var(--mantine-shadow-sm)",
            }}
            gap="md"
          >
            <Title order={2}>My Plots</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              <Box
                h={220}
                style={{
                  border: "1px solid #ced4da",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--mantine-color-body)",
                }}
              >
                <Text c="dimmed" size="sm">
                  Plot Placeholder
                </Text>
              </Box>
            </SimpleGrid>
          </Stack>
        )}
      </Center>
    </Box>
  );
};

export default MyPlots;
