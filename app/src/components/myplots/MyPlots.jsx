import { useState, useEffect } from "react";
import {
  Title,
  Text,
  Paper,
  Stack,
  ThemeIcon,
  Center,
  SimpleGrid,
  Box,
  Badge,
  Group,
  Button,
} from "@mantine/core";
import {
  IconChartScatter,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { getSavedPlots, deletePlot } from "../../utils/plotStorage";
import MiniPlot from "./MiniPlot";

const MyPlots = () => {
  const [userSavedPlots, setUserSavedPlots] = useState([]);

  useEffect(() => {
    const plots = getSavedPlots();
    setUserSavedPlots(plots);
  }, []);

  const handleDelete = (id) => {
    if (deletePlot(id)) {
      setUserSavedPlots(getSavedPlots());
    }
  };

  const hasPlots = userSavedPlots.length > 0;

  const pageContainerStyle = {
    width: "100%",
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "var(--mantine-color-body)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px",
  };

  return (
    <Box style={pageContainerStyle}>
      {!hasPlots ? (
        <Center style={{ flex: 1, width: "100%" }}>
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
        </Center>
      ) : (
        <Stack style={{ width: "100%", maxWidth: "1400px" }} gap="xl">
          <Paper p="md" radius="md" withBorder shadow="sm">
            <Group justify="space-between" align="center">
              <div>
                <Title order={2}>My Plots</Title>
                <Text size="sm" c="dimmed">
                  Your personalized library of saved visualizations.
                </Text>
              </div>
              <Badge variant="filled" size="lg" color="blue">
                {userSavedPlots.length} Saved
              </Badge>
            </Group>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
            {userSavedPlots.map((plot) => (
              <Paper
                key={plot.id}
                p="lg"
                radius="md"
                withBorder
                shadow="md"
                style={{
                  backgroundColor: "var(--mantine-color-body)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack gap="sm" justify="space-between" h="100%">
                  <Box>
                    <Group justify="space-between" mb="xs" wrap="nowrap">
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Badge
                          color="gray"
                          variant="outline"
                          size="xs"
                          style={{ flexShrink: 0 }}
                        >
                          {plot.viewType.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                        <Text fw={700} size="sm" c="blue.7" truncate>
                          {plot.settings.location.toUpperCase()}
                        </Text>
                      </Group>

                      <Button
                        variant="subtle"
                        color="red"
                        size="compact-xs"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleDelete(plot.id)}
                        style={{ flexShrink: 0 }}
                      >
                        Remove
                      </Button>
                    </Group>
                    <Paper
                      withBorder
                      radius="sm"
                      bg="gray.0"
                      style={{ overflow: "hidden" }}
                    >
                      <MiniPlot plot={plot} />
                    </Paper>
                  </Box>

                  <Button
                    component="a"
                    href={plot.fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="light"
                    color="blue"
                    fullWidth
                    mt="xs"
                    leftSection={<IconExternalLink size={16} />}
                  >
                    Visit view
                  </Button>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Box>
  );
};

export default MyPlots;
