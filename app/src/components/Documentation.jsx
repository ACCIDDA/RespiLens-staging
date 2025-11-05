import { Helmet } from 'react-helmet-async';
import {
  Anchor,
  Container,
  Stack,
  Code,
  Paper,
  Title,
  Text,
  Group,
  ThemeIcon,
  Table,
  ActionIcon,
  Tooltip,
  Box
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconBinaryTree,
  IconClipboard,
  IconTransformFilled,
  IconCopy,
  IconCheck,
  IconTarget,
  IconBook
} from '@tabler/icons-react';
import JsonView from '@uiw/react-json-view';

const glossaryItems = [
  { term: 'forecasts', definition: 'Data that is predicted (future).'},
  { term: 'ground_truth', definition: 'Data that has actually been observed (past and present)'},
  { term: 'horizon', definition: 'Time horizon from original date, in weeks (e.g. horizon = 1 is 1 week past original date)' },
  { term: 'hubverse_keys', definition: 'Metadata for data that comes from a Hubverse hub.'},
  { term: 'hubverse data', definition: '.csv data pulled from a Hubverse hub (namely, contains hubverse columns).'},
  { term: 'model', definition: 'Name of the model used for submitted data, e.g. "CovidHub-ensemble".'},
  { term: 'projections', definition: 'A style of RespiLens JSON data used for data forecasts.' },
  { term: 'quantile', definition: 'Confidence intervals that corresponding values represent.' },
  { term: 'target/column', definition: 'A particular value to be predicted/observed, e.g. "weekly incidence of RSV hospitalization".' },
  { term: 'timeseries', definition: 'A style of RespiLens JSON data used for observed values.' }
];

const GlossaryTable = () => {
  const rows = glossaryItems.map((item) => (
    <Table.Tr key={item.term}>
      <Table.Td>{item.term}</Table.Td>
      <Table.Td>{item.definition}</Table.Td>
    </Table.Tr>
  ));
  return (
    <>
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
  "metadata": { "location": "37", "abbreviation": "NC", "location_name": "North Carolina", "population": 10488084, "dataset": "pathogen forecast hub", "series_type": "projection", "hubverse_keys": { "models": ["model_name", "another_model_name", "..."], "targets": ["target_name_1", "target_name_2"], "horizons": ["0", "1", "..."], "output_types": ["quantile", "pmf"] }},
  "ground_truth": { "dates": ["YYYY-MM-DD1", "YYYY-MM-DD2", "..."], "target_name_1": [1, 2, 3], "target_name_2": [4, 5, 6] },
  "forecasts": { "YYYY-MM-DD1": { "target_name_1": { "model_name": { "type": "quantile", "predictions": { "0": { "date": "YYYY-MM-DD1", "quantiles": [0.025, 0.25, 0.5, 0.75, 0.975], "values": [42.0, 12.3, 45.6, 78.9, 100] }, "1": { "date": "YYYY-MM-DD2", "quantiles": [0.025, 0.25, 0.5, 0.75, 0.975], "values": [42.0, 12.3, 45.6, 78.9, 100] } }}}}}
}

const timeseriesJsonData = {
  "metadata": { "location": "37", "abbreviation": "NC", "location_name": "North Carolina", "population": 10488084, "dataset": "NHSN", "series_type": "timeseries" },
  "series": { "dates": ["YYYY-MM-DD1", "YYYY-MM-DD2", "..."], "column_1": [1.0, 2.0, 3.0], "column_2": [4.0, 5.0, 6.0], "...": [0.1, 0.2, 0.3] }
}

const CopyableCodeBlock = ({ code }) => {
  const clipboard = useClipboard({ timeout: 1000 });

  return (
    <Box pos="relative">
      <Tooltip
        label={clipboard.copied ? 'Copied' : 'Copy'}
        withArrow
        position="left"
      >
        <ActionIcon
          variant="subtle"
          color={clipboard.copied ? 'teal' : 'gray'}
          onClick={() => clipboard.copy(code)}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          {clipboard.copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </ActionIcon>
      </Tooltip>
      <Code block>{code}</Code>
    </Box>
  );
};

const rScriptCommand = `Rscript external_to_projections.R \\
  --output-path <path/to/output-directory> \\
  --pathogen flu \\
  --data-path <path/to/hubverse-data.csv> \\
  --target-data-path <path/to/target-data.csv> \\
  --locations-data-path <path/to/locations.csv>`;

const pythonScriptCommand = `python external_to_projections.py \\
  --output-path <path/to/output-directory> \\
  --pathogen flu \\
  --data-path <path/to/hubverse-data.csv> \\
  --target-data-path <path/to/target-data.csv> \\
  --locations-data-path <path/to/locations.csv>`;

const Documentation = () => {
  return (
    <>
      <Helmet>
        <title>RespiLens | Documentation</title>
      </Helmet>
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
              This page details how to play the Forecastle, the standardized JSON data models for the RespiLens platform (projections and timeseries), 
              as well as scripts that can be used to convert your data to RespiLens projections format.
              You can use the collapsible views to explore the architecture of each structure. Refer to the glossary at
              the bottom of the page for frequently-used RespiLens terms.
            </Text>
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
              <JsonView value={projectionsJsonData} displayDataTypes={false} displayObjectSize={false} collapsed={1} enableClipboard={false} />
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
              <JsonView value={timeseriesJsonData} displayDataTypes={false} displayObjectSize={false} collapsed={1} enableClipboard={false} />
            )}
          </Stack>
        </Paper>

        <Paper id="convert-data" shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconTransformFilled size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>convert your data</Title>
                <Text size="sm" c="dimmed">
                  Learn how to convert your Hubverse-style .csv data to the RespiLens projections format.
                </Text>
              </div>
            </Group>
            <Text>
              The RespiLens backend framework provides both an <Code>R</Code> and <Code>python</Code> pipeline
              for converting <Anchor href="https://hubverse.io/" target="_blank" rel="noopener noreferrer"> Hubverse</Anchor> <Code>.csv</Code> data to the RespiLens projections JSON format.
              Once converted, this data can be used in the MyRespiLens feature. Running data conversion scripts assumes 
              a local clone of the <Anchor href="https://github.com/ACCIDDA/RespiLens" target="_blank" rel="noopener noreferrer"> RespiLens</Anchor> GitHub repository. 
              All scripts are located in the <Code>scripts/</Code> directory of <Code>RespiLens</Code>.
            </Text>
            <Text>
              <strong>Using <Code>external_to_projections.R</Code></strong> (run in <Code>scripts/</Code> directory):
            </Text>
            <CopyableCodeBlock code={rScriptCommand} />

            <Text>
              <strong>Using <Code>external_to_projections.py</Code></strong> (run in <Code>scripts/</Code> directory):
            </Text>
            <CopyableCodeBlock code={pythonScriptCommand} />
            
            <Stack gap={2}>
              <Text>Where:</Text>
              <Text><Code>--output-path</Code> is the absolute path to the directory where you would like converted data to be saved.</Text>
              <Text><Code>--data-path</Code> is the absolute path to <Code>.csv</Code> data to be converted. You can use your own data that complies withe the Hubverse format, or filter/use files in a hub's <Code>model-output</Code> directory.</Text>
              <Text><Code>--target-data-path</Code> is the absolute path to corresponding ground truth data. This can be found as the <Code>time-series</Code> file in a hub's <Code>target-data</Code> directory.</Text>
              <Text><Code>--locations-data-path</Code> is the absolute path to corresponding location metadata (<Code>locations.csv</Code>). This can be found in the RespiLens <Code>scripts/</Code> directory, or in a hub's <Code>auxiliary-data</Code> directory.</Text>
              <Text>and <Code>--pathogen</Code> is the pathogen the hub data describes (flu, covid, or rsv).</Text>
            </Stack>
            
            <Text>
              Once converted, individual projections JSON files can be drag-n-dropped into MyRespiLens. 
            </Text>
            <Text><strong> Note: MyRespiLens does not work for RespiLens timeseries data.</strong></Text>
          </Stack>
        </Paper>

        <Paper id="forecastle" shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconTarget size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>forecastle</Title>
                <Text size="sm" c="dimmed">
                  How to play the Forecastle.
                </Text>
              </div>
            </Group>
            <Title order={3}>the goal 🎯</Title>
            <Text>
              The objective of the Forecastle is to accurately forecast a data series (e.g., incidents of hospitalization) for a specific location, date, and pathogen combination (one unique combination = one problem).
              The Forecastle is a daily challenge, offering three problems per day. After completing a problem, you are scored based on a weighted interval score (WIS) against contributing models for that location and pathogen.
              The primary Hub ensemble model is highlighted as a benchmark. Your performance on the Forecastle over time can be viewed on the "stats" page.
            </Text>
            <Title order={3}>the interface ⚙️</Title>
            <Text>
              Each problem in the Forecastle is played in a three-step process:
            </Text>
            <Text>
              <strong>1. Set your medians</strong>
            </Text>
            <Text>First, you will be prompted to set median forecast numbers for three time horizons from the original date (one week out, two weeks out, three weeks out). You can set these either by dragging the points on the graph or by specifiying exact values using the box entries.</Text>
            <Text>
              <strong>2. Set uncertainty intervals</strong>
            </Text>
            <Text>Next, you will be asked to set uncertainty intervals for your predictions. For each horizon, there will be a 95% and 50% confidence interval to be set (again using the drag feature on the graph or by manual entry). These confidence intervals indicate what range you are 95% confident will contain the true observed values, and what range you are 50% confident will contain the true observed values.</Text>
            <Text>
              <strong>3. View scores (and see history) </strong>
            </Text>
            <Text>After submitting, RespiLens will give you your ranking for that problem (using WIS) against the contributing models. The Hub ensemble model for that pathogen will be highlighted, and WIS for each model's forecasts will be displayed. You can utilize buttons for 'Show Full History' to see all past observed values for that location/pathogen combination, 'Stats' to see your performance history with Forecastle, or the copy icon to share your scores. There are forward and backward navigation buttons at the bottom of the page to move through the game.</Text>
          </Stack>
        </Paper>

        <Paper id="glossary" shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconBook size={20} />
              </ThemeIcon>
              <div>
                <Title order={2}>glossary</Title>
                <Text size="sm" c="dimmed">
                  Learn your RespiLens words!
                </Text>
              </div>
            </Group>
            <GlossaryTable />
          </Stack>
        </Paper>

      </Stack>
    </Container>
    </>
  );
};

export default Documentation;