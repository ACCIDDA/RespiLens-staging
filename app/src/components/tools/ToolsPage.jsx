import { Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconClock, IconTools } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const tools = [
  {
    title: 'Reporting delay explorer',
    description:
      'Upload an EpiNowcast-style CSV to build reporting triangles, delay distributions, and a nowcast recommendation.',
    icon: IconClock,
    href: '/reporting-delay',
    badge: 'Nowcasting',
  },
];

const ToolsPage = () => {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group align="center">
          <IconTools size={28} />
          <Title order={1}>Tools</Title>
        </Group>
        <Text c="dimmed" size="lg">
          Browse lightweight utilities for data QA, reporting delays, and operational decisions.
        </Text>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {tools.map((tool) => (
            <Card key={tool.title} withBorder radius="md" padding="lg">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group>
                    <tool.icon size={22} />
                    <Title order={3}>{tool.title}</Title>
                  </Group>
                  <Badge variant="light">{tool.badge}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {tool.description}
                </Text>
                <Button component={Link} to={tool.href} size="sm" w="fit-content">
                  Open tool
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default ToolsPage;
