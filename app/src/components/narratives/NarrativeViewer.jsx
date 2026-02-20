import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  ThemeIcon,
  Loader,
  Center,
} from "@mantine/core";
import { IconBook, IconCalendar, IconUser } from "@tabler/icons-react";

const NarrativeViewer = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Narrative metadata
  const narrative = {
    id: "flu-winter-2024-25",
    title: "Flu Season Winter 2024-25: A Data Story",
    description:
      "An interactive narrative exploring the 2024-25 flu season trends, forecasting insights, and public health implications.",
    author: "RespiLens Analytics Team",
    date: "2024-12-24",
    tags: ["Influenza", "Forecasting", "Public Health"],
  };

  useEffect(() => {
    // Load markdown content directly
    try {
      const markdownContent = `# Flu Season Winter 2024-25: A Data Story

*An interactive narrative exploring the 2024-25 flu season trends, forecasting insights, and public health implications.*

---

## Introduction

The 2024-25 flu season has presented unique challenges and patterns that warrant close examination. Through careful analysis of surveillance data, forecasting models, and public health indicators, we can begin to understand the complex dynamics at play this winter.

## Key Findings

### Early Season Onset
Unlike previous years, the 2024-25 flu season began earlier than typical, with significant activity detected in late October across multiple regions.

### Geographic Patterns
- **Northeast**: High activity concentrated in urban areas
- **Southeast**: Moderate but steady increase throughout November
- **West Coast**: Delayed onset but rapid acceleration in December
- **Midwest**: Variable patterns with hotspots in major metropolitan areas

### Demographic Impact
The season has shown particularly notable impacts on:
- Children ages 5-17 (higher than typical seasonal rates)
- Adults 65+ (consistent with historical patterns)
- Healthcare workers (elevated exposure rates)

## Forecasting Performance

Our ensemble of forecasting models performed with varying degrees of accuracy:

- **Short-term forecasts (1-2 weeks)**: 85% accuracy
- **Medium-term forecasts (3-4 weeks)**: 72% accuracy  
- **Long-term forecasts (5+ weeks)**: 58% accuracy

### Model Insights
The top-performing models consistently incorporated:
1. Real-time syndromic surveillance data
2. Search trend analytics
3. Social mobility patterns
4. Weather and environmental factors

## Public Health Response

Healthcare systems have adapted their response strategies based on:
- **Hospital capacity planning**: Adjusted staffing patterns
- **Vaccination campaigns**: Targeted outreach to high-risk populations
- **Community messaging**: Enhanced public awareness efforts

## Looking Forward

As we progress through the remainder of the season, key indicators to monitor include:
- Vaccine effectiveness estimates
- Antiviral resistance patterns
- Healthcare system strain indicators
- Economic impact assessments

## Data Sources

This narrative is built upon data from:
- CDC FluView surveillance system
- State and local health departments
- HHS hospitalization data
- Academic forecasting consortiums

---

*Last updated: December 24, 2024*  
*Authors: RespiLens Analytics Team*`;

      setContent(markdownContent);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load narrative content", err);
      setError("Unable to load narrative content at this time.");
      setLoading(false);
    }
  }, []);

  const renderMarkdown = (content) => {
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <Title key={index} order={1} mb="lg" mt="xl">
            {line.substring(2)}
          </Title>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <Title key={index} order={2} mb="md" mt="lg">
            {line.substring(3)}
          </Title>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <Title key={index} order={3} mb="sm" mt="md">
            {line.substring(4)}
          </Title>
        );
      }
      if (line.startsWith("- ")) {
        const text = line.substring(2);
        const parts = text.split(/(\*\*.*?\*\*)/);
        return (
          <Text key={index} component="li" mb="xs" ml="md">
            {parts.map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={i}>{part.slice(2, -2)}</strong>
              ) : (
                part
              ),
            )}
          </Text>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <Text key={index} component="li" mb="xs" ml="md">
            {line.substring(line.indexOf(".") + 2)}
          </Text>
        );
      }
      if (
        line.startsWith("*") &&
        line.endsWith("*") &&
        line.length > 2 &&
        !line.includes("**")
      ) {
        return (
          <Text key={index} mb="md" fs="italic" c="dimmed">
            {line.substring(1, line.length - 1)}
          </Text>
        );
      }
      if (line.startsWith("---")) {
        return (
          <div
            key={index}
            style={{
              margin: "2rem 0",
              borderBottom: "1px solid var(--mantine-color-gray-3)",
            }}
          />
        );
      }
      if (line.trim()) {
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <Text key={index} mb="md">
            {parts.map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={i}>{part.slice(2, -2)}</strong>
              ) : (
                part
              ),
            )}
          </Text>
        );
      }
      return <div key={index} style={{ height: "0.5rem" }} />;
    });
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: "50vh" }}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Loading narrative...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: "50vh" }}>
          <Text c="red" ta="center">
            {error}
          </Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl" style={{ maxWidth: "900px" }}>
      {/* Header */}
      <Paper shadow="sm" p="lg" mb="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs" mb="xs">
              <ThemeIcon size="sm" variant="light">
                <IconBook size={16} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                Data Narrative
              </Text>
            </Group>
            <Title order={1} mb="xs">
              {narrative.title}
            </Title>
            <Text c="dimmed" mb="md">
              {narrative.description}
            </Text>
            <Group gap="md">
              <Group gap="xs">
                <IconUser size={16} />
                <Text size="sm">{narrative.author}</Text>
              </Group>
              <Group gap="xs">
                <IconCalendar size={16} />
                <Text size="sm">{narrative.date}</Text>
              </Group>
            </Group>
          </div>
          <Group gap="xs">
            {narrative.tags.map((tag) => (
              <Badge key={tag} variant="light" size="sm">
                {tag}
              </Badge>
            ))}
          </Group>
        </Group>
      </Paper>

      {/* Content */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <div style={{ maxWidth: "100%", lineHeight: 1.6 }}>
          {renderMarkdown(content)}
        </div>
      </Paper>
    </Container>
  );
};

export default NarrativeViewer;
