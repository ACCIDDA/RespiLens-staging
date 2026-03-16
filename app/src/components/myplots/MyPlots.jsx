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
  Divider,
} from "@mantine/core";
import { IconChartScatter, IconExternalLink } from "@tabler/icons-react";
import { getSavedPlots, deletePlot } from "../../utils/plotStorage";

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
                style={{ backgroundColor: "var(--mantine-color-body)" }}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Badge color="gray" variant="outline" size="xs">
                      {plot.viewType.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      text placeholder
                    </Text>
                  </Group>
                  <Title order={3} c="blue.7">
                    {plot.settings.location.toUpperCase()}
                  </Title>
                  <Divider variant="dashed" />
                  <Stack gap={4}>
                    <Text size="xs" fw={700} c="dimmed">
                      TARGET
                    </Text>
                    <Text size="sm" lineClamp={1} fw={500}>
                      {plot.settings.target}
                    </Text>
                  </Stack>
                  {plot.settings.models && plot.settings.models.length > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={700} c="dimmed">
                        MODELS
                      </Text>
                      <Group gap={4}>
                        {plot.settings.models.slice(0, 3).map((m) => (
                          <Badge key={m} size="xs" variant="light" color="gray">
                            {m}
                          </Badge>
                        ))}
                        {plot.settings.models.length > 3 && (
                          <Text size="xs" c="dimmed">
                            +{plot.settings.models.length - 3} more
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  )}{" "}
                  {plot.settings.columns &&
                    plot.settings.columns.length > 0 && (
                      <Stack gap={4}>
                        <Text size="xs" fw={700} c="dimmed">
                          COLUMNS
                        </Text>
                        <Group gap={4}>
                          {plot.settings.columns.slice(0, 3).map((m) => (
                            <Badge
                              key={m}
                              size="xs"
                              variant="light"
                              color="gray"
                            >
                              {m}
                            </Badge>
                          ))}
                          {plot.settings.columns.length > 3 && (
                            <Text size="xs" c="dimmed">
                              +{plot.settings.columns.length - 3} more
                            </Text>
                          )}
                        </Group>
                      </Stack>
                    )}
                  <Button
                    component="a"
                    href={plot.fullUrl}
                    variant="light"
                    color="blue"
                    fullWidth
                    mt="md"
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
