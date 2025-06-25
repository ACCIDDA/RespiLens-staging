import React, { useState, useEffect } from 'react';
import {
  Container,
  SimpleGrid,
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  TextInput,
  Select,
  Loader,
  Center,
  ThemeIcon,
  Paper
} from '@mantine/core';
import {
  IconSearch,
  IconBook,
  IconCalendar,
  IconUser,
  IconTags,
  IconArrowRight,
  IconStar,
  IconClock
} from '@tabler/icons-react';

const NarrativeBrowser = ({ onNarrativeSelect }) => {
  const [narratives, setNarratives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterTag, setFilterTag] = useState('');

  // Sample narratives data
  const sampleNarratives = [
    {
      id: 'flu-winter-2024-25',
      title: 'Flu Season Winter 2024-25: A Data Story',
      description: 'An interactive narrative exploring the 2024-25 flu season trends, forecasting insights, and public health implications.',
      author: 'RespiLens Analytics Team',
      date: '2024-12-24',
      tags: ['Influenza', 'Forecasting', 'Public Health'],
      featured: true,
      readTime: '8 min',
      steps: 4
    },
    {
      id: 'rsv-pediatric-surge',
      title: 'RSV Pediatric Surge: Understanding the 2024 Pattern',
      description: 'Analyzing the unexpected RSV surge in pediatric populations and its implications for hospital capacity planning.',
      author: 'ACCIDDA Research Team',
      date: '2024-12-20',
      tags: ['RSV', 'Pediatric', 'Hospital Capacity'],
      featured: false,
      readTime: '6 min',
      steps: 5
    },
    {
      id: 'multi-pathogen-dynamics',
      title: 'Multi-Pathogen Dynamics in Fall 2024',
      description: 'Exploring the complex interactions between flu, RSV, and COVID-19 circulation patterns.',
      author: 'Multi-Hub Collaborative',
      date: '2024-12-18',
      tags: ['Multi-pathogen', 'Surveillance', 'Modeling'],
      featured: true,
      readTime: '12 min',
      steps: 6
    },
    {
      id: 'regional-forecasting-accuracy',
      title: 'Regional Forecasting Accuracy: Lessons from 2023-24',
      description: 'A retrospective analysis of forecasting model performance across different US regions.',
      author: 'FluSight Consortium',
      date: '2024-12-15',
      tags: ['Forecasting', 'Model Evaluation', 'Regional Analysis'],
      featured: false,
      readTime: '10 min',
      steps: 7
    },
    {
      id: 'climate-respiratory-health',
      title: 'Climate Change and Respiratory Disease Patterns',
      description: 'How changing climate patterns are affecting respiratory disease seasonality and geographic distribution.',
      author: 'Climate-Health Initiative',
      date: '2024-12-10',
      tags: ['Climate Change', 'Seasonality', 'Geographic Analysis'],
      featured: false,
      readTime: '15 min',
      steps: 8
    }
  ];

  useEffect(() => {
    // Simulate loading time
    setTimeout(() => {
      setNarratives(sampleNarratives);
      setLoading(false);
    }, 1000);
  }, []);

  const allTags = [...new Set(narratives.flatMap(n => n.tags))];

  const filteredNarratives = narratives
    .filter(narrative => {
      const matchesSearch = narrative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           narrative.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           narrative.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !filterTag || narrative.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'readTime':
          return parseInt(a.readTime) - parseInt(b.readTime);
        default:
          return 0;
      }
    });

  const featuredNarratives = filteredNarratives.filter(n => n.featured);
  const regularNarratives = filteredNarratives.filter(n => !n.featured);

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

        {/* Search and Filters */}
        <Group grow>
          <TextInput
            placeholder="Search narratives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
          />
          <Select
            placeholder="Filter by tag"
            value={filterTag}
            onChange={setFilterTag}
            data={[
              { value: '', label: 'All tags' },
              ...allTags.map(tag => ({ value: tag, label: tag }))
            ]}
            clearable
          />
          <Select
            placeholder="Sort by"
            value={sortBy}
            onChange={setSortBy}
            data={[
              { value: 'date', label: 'Date (newest first)' },
              { value: 'title', label: 'Title (A-Z)' },
              { value: 'author', label: 'Author (A-Z)' },
              { value: 'readTime', label: 'Read time (shortest first)' }
            ]}
          />
        </Group>
      </Paper>

      {/* Featured Narratives */}
      {featuredNarratives.length > 0 && (
        <>
          <Title order={2} mb="md">Featured Narratives</Title>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
            {featuredNarratives.map(narrative => (
              <NarrativeCard key={narrative.id} narrative={narrative} featured={true} />
            ))}
          </SimpleGrid>
        </>
      )}

      {/* All Narratives */}
      <Title order={2} mb="md">
        {featuredNarratives.length > 0 ? 'More Narratives' : 'All Narratives'}
      </Title>
      
      {regularNarratives.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {regularNarratives.map(narrative => (
            <NarrativeCard key={narrative.id} narrative={narrative} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed">No narratives found matching your criteria.</Text>
        </Paper>
      )}
    </Container>
  );
};

export default NarrativeBrowser;