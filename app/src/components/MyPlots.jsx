import {
  Title,
  Text,
  Container,
  Paper,
  Stack,
  ThemeIcon,
  Center,
  SimpleGrid,
  Box,
} from "@mantine/core";
import { IconChartScatter } from "@tabler/icons-react";

const MyPlots = () => {
  const userSavedPlots = [];
  const hasPlots = userSavedPlots.length > 0;

  return (
    <Container size="xl" py="xl" style={{ maxWidth: "800px" }}>
      <Center style={{ minHeight: "70vh" }}>
        {!hasPlots ? (
          /* when there's no plots*/
          <Paper
            shadow="sm"
            p="xl"
            radius="lg"
            withBorder
            style={{
              width: "100%",
              maxWidth: "600px",
              border: "2px solid #2563eb",
              backgroundColor: "transparent",
            }}
          >
            <Stack align="center" gap="xl">
              <ThemeIcon size={80} variant="light" color="gray" radius="xl">
                <IconChartScatter size={40} />
              </ThemeIcon>

              <div style={{ textAlign: "center" }}>
                <Title order={2} mb="md">
                  No plots yet
                </Title>
                <Text size="sm" c="dimmed">
                  You haven't saved any visualizations yet. Click the "Add to My
                  Plots" button on any forecast to see them here.
                </Text>
              </div>

              <Text size="xs" fw={500} c="blue" style={{ opacity: 0.7 }}>
                Plots are stored locally in your browser
              </Text>
            </Stack>
          </Paper>
        ) : (
          /* plot grid -- unfinished */
          <Stack style={{ width: "100%" }} gap="md">
            <Title order={2}>My Plots</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Box
                h={200}
                style={{
                  border: "1px dashed #ced4da",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
    </Container>
  );
};

export default MyPlots;
