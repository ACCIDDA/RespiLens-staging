import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  Loader,
  Center,
  ThemeIcon,
  Paper
} from '@mantine/core';
import {
  IconBook,
  IconCalendar,
  IconUser,
  IconArrowRight,
  IconStar,
  IconClock
} from '@tabler/icons-react';

const NarrativeBrowser = ({ onNarrativeSelect }) => {
  const [narratives, setNarratives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sample narrative data
  const sampleNarratives = [
    {
      id: 'flu-winter-2024-25',
      title: 'Flu Season Winter 2024-25: A Data Story',
      description: 'An interactive narrative exploring the 2024-25 flu season trends, forecasting insights, and public health implications.',
      author: 'RespiLens Analytics Team',
      date: '2024-12-24',
      tags: ['Influenza', 'Forecasting', 'Public Health'],
      featured: true,
      readTime: '8 min'
    }
  ];

  useEffect(() => {
    // Simulate loading time
    setTimeout(() => {
      setNarratives(sampleNarratives);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading narratives...</Text>
        </Stack>
      </Center>
    );
  }

  const NarrativeCard = ({ narrative, featured = false }) => (
    <Card
      shadow={featured ? "md" : "sm"}
      padding="lg"
      radius="md"
      withBorder
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: featured ? '2px solid var(--mantine-primary-color-filled)' : undefined
      }}
      onClick={() => onNarrativeSelect(narrative.id)}
    >
      <Group justify="space-between" align="flex-start" mb="md">
        <div style={{ flex: 1 }}>
          <Group gap="xs" mb="xs">
            <ThemeIcon size="sm" variant="light" color={featured ? 'yellow' : 'blue'}>
              {featured ? <IconStar size={16} /> : <IconBook size={16} />}
            </ThemeIcon>
            {featured && <Badge size="xs" variant="light" color="yellow">Featured</Badge>}
          </Group>
          <Title order={3} mb="xs" lineClamp={2}>
            {narrative.title}
          </Title>
        </div>
      </Group>

      <Text size="sm" c="dimmed" mb="md" lineClamp={3}>
        {narrative.description}
      </Text>

      <Group gap="xs" mb="md" wrap="wrap">
        {narrative.tags.map(tag => (
          <Badge key={tag} size="xs" variant="light">{tag}</Badge>
        ))}
      </Group>

      <Group justify="space-between" align="center">
        <Stack gap={4}>
          <Group gap="xs">
            <IconUser size={14} />
            <Text size="xs" c="dimmed">{narrative.author}</Text>
          </Group>
          <Group gap="md">
            <Group gap="xs">
              <IconCalendar size={14} />
              <Text size="xs" c="dimmed">{narrative.date}</Text>
            </Group>
            <Group gap="xs">
              <IconClock size={14} />
              <Text size="xs" c="dimmed">{narrative.readTime}</Text>
            </Group>
          </Group>
        </Stack>

        <Button
          variant="light"
          size="xs"
          rightSection={<IconArrowRight size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onNarrativeSelect(narrative.id);
          }}
        >
          Read
        </Button>
      </Group>
    </Card>
  );

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Paper shadow="sm" p="lg" mb="xl">
        <Group align="center" mb="md">
          <ThemeIcon size="lg" variant="light">
            <IconBook size={24} />
          </ThemeIcon>
          <div>
            <Title order={1}>Data Narratives</Title>
            <Text c="dimmed">
              Explore interactive stories that bring respiratory disease data to life
            </Text>
          </div>
        </Group>

      </Paper>

      {/* Sample Narrative */}
      <Center>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          {narratives.map(narrative => (
            <NarrativeCard key={narrative.id} narrative={narrative} featured={true} />
          ))}
        </div>
      </Center>
    </Container>
  );
};

export default NarrativeBrowser;