import {
  Container,
  Stack,
  Paper,
  Title,
  Text,
  Group,
  ThemeIcon,
  Table
} from '@mantine/core';
import { IconBinaryTree, IconClipboard, IconChartScatter } from '@tabler/icons-react';
import JsonView from '@uiw/react-json-view';

const glossaryItems = [
  { term: 'forecasts', definition: 'Data that is predicted (future).'},
  { term: 'ground_truth', definition: 'Data that has actually been observed (past and present)'},
  { term: 'horizon', definition: 'Time horizon from original date, in weeks (e.g. horizon = 1 is 1 week past original date)' },
  { term: 'hubverse_keys', definition: 'Metadata for data that comes from a Hubverse hub.'},
  { term: 'model', definition: 'Name of the model used for submitted data, e.g. "CovidHub-ensemble".'},
  { term: 'projections', definition: 'A style of RespiLens JSON data used for data forecasts.' },
  { term: 'quantile', definition: 'Confidence intervals that corresponding values represent.' },
  { term: 'target/column', definition: 'A particular value to be predicted/observed, e.g. "weekly incidence of RSV hospitalization".' },
  { term: 'timeseries', definition: 'A style of RespiLens JSON data used for observed values.' }
];

const GlossaryTable = () => {
  const rows = glossaryItems.map((item) => (
    <Table.Tr key={item.term}>
      <Table.Td><strong>{item.term}</strong></Table.Td>
      <Table.Td>{item.definition}</Table.Td>
    </Table.Tr>
  ));
  return (
    <>
      <Title order={3}>Glossary</Title>
      <Table withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Term</Table.Th>
            <Table.Th>Definition</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </>
  );
};


const projectionsJsonData = {
  "metadata": {
    "location": "37",
        "abbreviation": "NC",
        "location_name": "North Carolina",
        "population": 10488084,
        "dataset": "pathogen forecast hub",
        "series_type": "projection",
        "hubverse_keys": {
            "models": [
                "model_name",
                "another_model_name",
                "..."
            ],
            "targets": ["target_name_1", "target_name_2"],
            "horizons": ["0", "1", "..."],
            "output_types": ["quantile", "pmf"]
        }
  },
  "ground_truth": {
    "dates": ["YYYY-MM-DD1", "YYYY-MM-DD2", "..."],
    "target_name_1": [1, 2, 3],
    "target_name_2": [4, 5, 6]
  },
  "forecasts": {
    "YYYY-MM-DD1": {
      "target_name_1": {
        "model_name": {
          "type": "quantile",
          "predictions": {
            "0": {
              "date": "YYYY-MM-DD1",
              "quantiles": [0.025, 0.25, 0.5, 0.75, 0.975],
              "values": [42.0, 12.3, 45.6, 78.9, 100]
            },
            "1": {}
          }
        }
      }
    }
  }
}

const timeseriesJsonData = {
  "metadata": {
    "location": "37",
        "abbreviation": "NC",
        "location_name": "North Carolina",
        "population": 10488084,
        "dataset": "NHSN",
        "series_type": "timeseries"
  },
  "series": {
    "dates": ["YYYY-MM-DD1", "YYYY-MM-DD2", "..."],
    "column_1": [1.0, 2.0, 3.0],
    "column_2": [4.0, 5.0, 6.0],
    "...": [0, 0, 0]
  }
}

const Documentation = () => {
  return (
    <Container size="xl" py="xl" style={{ maxWidth: '1100px' }}>
      <Stack gap="lg">
        
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconClipboard size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>RespiLens Documentation</Title>
              </div>
            </Group>

            <Text size="sm">
              This page details the standardized JSON data models for the RespiLens platform. 
              It covers the projections and timeseries structures. Use the collapsible views to explore 
              the architecture of each model, and refer to the glossary below for frequently-used terms.
            </Text>
            
            <GlossaryTable />
          </Stack>
        </Paper>

        <Paper id="projections" shadow="sm" p="lg" radius="md" withBorder>
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
            {projectionsJsonData && Object.keys(projectionsJsonData).length > 0 && (
              <JsonView
                value={projectionsJsonData}
                displayDataTypes={false}
                displayObjectSize={false}
                collapsed={true}
                enableClipboard={false}
              />
            )}
          </Stack>
        </Paper>

        <Paper id="timeseries" shadow="sm" p="lg" radius="md" withBorder>
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
            {timeseriesJsonData && Object.keys(timeseriesJsonData).length > 0 && (
              <JsonView 
              value={timeseriesJsonData}
              displayDataTypes={false}
              displayObjectSize={false} 
              collapsed={true}
              enableClipboard={false} 
              />
            )}
          </Stack>
        </Paper>

        <Paper id="toy plot" shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconChartScatter size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>toy plot</Title>
                <Text size="sm" c="dimmed">
                  Toggle the features of a toy RespiLens plot.
                </Text>
              </div>
            </Group>
            <Text>COMING SOON</Text>
          </Stack>
        </Paper>

      </Stack>
    </Container>
  );
};

export default Documentation;