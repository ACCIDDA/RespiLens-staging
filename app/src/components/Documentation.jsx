import {
  Badge,
  Container,
  Stack,
  Paper,
  Title,
  Text,
  Group,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { IconBinaryTree } from '@tabler/icons-react';
import JsonView from '@uiw/react-json-view';
import { useScrollIntoView } from '@mantine/hooks';

const exampleJsonData = {
  "example_data": "RespiLens",
  "types": {
    "projections": ['MyRespiLens', 'flu', 'COVID-19', 'RSV'],
    "timeseries": ['NHSN', 'ground_truth keys'],
    "metadata": ["everything"]
  },
  "isCool": true,
};

const Documentation = () => {
  const { scrollIntoView: scrollProjections, targetRef: projectionsRef } = useScrollIntoView({ offset: 60 });
  const { scrollIntoView: scrollTimeseries, targetRef: timeseriesRef } = useScrollIntoView({ offset: 60 });
  const { scrollIntoView: scrollMetadata, targetRef: metadataRef } = useScrollIntoView({ offset: 60 });
  return (
    <Container size="xl" py="xl" style={{ maxWidth: '1100px' }}>
      <Stack gap="lg">
        
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconBinaryTree size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>RespiLens Data Structure</Title>
              </div>
            </Group>

            <Text size="sm">
              This page details the standardized JSON data models for the RespiLens platform. 
              It covers the projections and timeseries structures, as well as the metadata.json 
              file generated with each data export. Use the collapsible views below to explore 
              the architecture of each model – practice with the example below or jump to a specific structure.
            </Text>
            <Group gap="s">
              <UnstyledButton onClick={() => scrollProjections()}>
                <Badge variant="light" color="blue" size="lg">
                  projections
                </Badge>
              </UnstyledButton>
              <UnstyledButton onClick={() => scrollTimeseries()}>
                <Badge variant="light" color="blue" size="lg">
                  timeseries
                </Badge>
              </UnstyledButton>
              <UnstyledButton onClick={() => scrollMetadata()}>
                <Badge variant="light" color="blue" size="lg">
                  metadata file
                </Badge>
              </UnstyledButton>
            </Group>
            <JsonView
              value={exampleJsonData}
              displayDataTypes={true}
              displayObjectSize={false}
              collapsed={true}
              enableClipboard={false}
            />
          </Stack>
        </Paper>

        <Paper ref={projectionsRef} shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconBinaryTree size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>projections</Title>
                <Text size="sm" c="dimmed">
                  Used for MyRespiLens and flu, COVID-19, and RSV views.
                </Text>
              </div>
            </Group>
          </Stack>
        </Paper>

        <Paper ref={timeseriesRef} shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconBinaryTree size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>timeseries</Title>
                <Text size="sm" c="dimmed">
                  Used for the NHSN view (and all the ground_truth keys of projections data!).
                </Text>
              </div>
            </Group>
          </Stack>
        </Paper>

        <Paper ref={metadataRef} shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconBinaryTree size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>metadata file</Title>
                <Text size="sm" c="dimmed">
                  Generated with every data pull for a (one per pathogen).
                </Text>
              </div>
            </Group>
          </Stack>
        </Paper>

      </Stack>
    </Container>
  );
};

export default Documentation;