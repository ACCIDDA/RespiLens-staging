import {
  ActionIcon,
  Alert,
  Collapse,
  Anchor,
  Container,
  Group,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFileDescription,
  IconFilter,
  IconUpload,
} from "@tabler/icons-react";
import Seo from "./Seo";

const SectionCard = ({ title, icon, children, defaultOpened = false }) => {
  const [opened, { toggle }] = useDisclosure(defaultOpened);

  return (
    <Paper withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Stack
          gap="xs"
          onClick={toggle}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          <Group justify="flex-start" align="center" gap="xs">
            <ThemeIcon size={28} radius="xl" variant="light" color="blue">
              {icon}
            </ThemeIcon>
            <Title order={2}>{title}</Title>
            <ActionIcon variant="subtle" color="gray" aria-label={title}>
              {opened ? (
                <IconChevronUp size={18} />
              ) : (
                <IconChevronDown size={18} />
              )}
            </ActionIcon>
          </Group>
        </Stack>
        <Collapse in={opened}>
          <Stack gap="md">{children}</Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
};

const Documentation = () => {
  return (
    <>
      <Seo
        title="MyRespiLens Documentation | RespiLens"
        description="Learn what MyRespiLens does, what user-uploaded forecast data must contain, what gets filtered out, and what causes upload failures."
        canonicalPath="/myrespilens/documentation"
      />
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Stack gap="sm">
            <Title order={1} c="blue">
              MyRespiLens Documentation
            </Title>
          </Stack>

          <SectionCard
            title="What is MyRespiLens?"
            icon={<IconUpload size={20} />}
            defaultOpened={true}
          >
            <Text>The current MyRespiLens workflow is:</Text>
            <List spacing="sm">
              <List.Item>
                You choose one of four supported hubs: FluSight, COVID-19
                Forecast Hub, RSV Forecast Hub, or Flu Metrocast.
              </List.Item>
              <List.Item>
                You drag and drop one or more Hubverse-style forecast{" "}
                <code>.csv</code> files.
              </List.Item>
              <List.Item>
                MyRespiLens validates and preprocesses the uploaded forecast
                rows.
              </List.Item>
              <List.Item>
                The site loads the correct hub-specific reference files
                automatically. You do not need to upload{" "}
                <code>locations.csv</code> or time-series data yourself.
              </List.Item>
              <List.Item>
                RespiLens builds projections JSON in the browser and immediately
                renders an interactive visualization dashboard.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed">
              If your uploaded targets do not appear to match the hub you
              selected, MyRespiLens may still render the dashboard but will show
              a warning.
            </Text>
          </SectionCard>

          <SectionCard
            title="What are the requirements for my data?"
            icon={<IconFileDescription size={20} />}
          >
            <Text>
              Your uploaded data must be a Hubverse-style forecast CSV.
              MyRespiLens can accept one file or multiple CSV files at once.
            </Text>
            <Text fw={600}>Required columns</Text>
            <List spacing="sm">
              <List.Item>
                <code>location</code>
              </List.Item>
              <List.Item>
                <code>reference_date</code>
              </List.Item>
              <List.Item>
                <code>target</code>
              </List.Item>
              <List.Item>
                <code>horizon</code>
              </List.Item>
              <List.Item>
                <code>output_type</code>
              </List.Item>
              <List.Item>
                <code>output_type_id</code>
              </List.Item>
              <List.Item>
                <code>value</code>
              </List.Item>
              <List.Item>
                <code>target_end_date</code>
              </List.Item>
            </List>
            <Text>
              <code>model_id</code> is optional. If it is missing, MyRespiLens
              assigns the fallback model name <code>user-uploaded-model</code>.
            </Text>
            <Text fw={600}>Expected value patterns</Text>
            <List spacing="sm">
              <List.Item>
                <code>value</code> must be numeric.
              </List.Item>
              <List.Item>
                <code>target_end_date</code> must be parseable as a date.
              </List.Item>
              <List.Item>
                <code>horizon</code> must be an integer.
              </List.Item>
              <List.Item>
                The currently supported forecast outputs are quantitative
                forecast rows that the visualization layer can render.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed">
              Hubverse formatting details are documented in the{" "}
              <Anchor
                href="https://docs.hubverse.io/en/latest/user-guide/model-output.html"
                target="_blank"
                rel="noreferrer"
              >
                Hubverse model output guide
              </Anchor>
              .
            </Text>
          </SectionCard>

          <SectionCard
            title="What is filtered out of my data?"
            icon={<IconFilter size={20} />}
          >
            <Text>
              Some uploaded rows are not treated as fatal errors. Instead,
              MyRespiLens filters them out during preprocessing and continues
              with the remaining usable rows.
            </Text>
            <List spacing="sm">
              <List.Item>
                Duplicate rows, using the combined values from the{" "}
                <code>reference_date</code>, <code>target_end_date</code>,{" "}
                <code>location</code>, <code>horizon</code>, <code>target</code>
                , <code>output_type</code>, <code>output_type_id</code>, and
                optional <code>model_id</code> columns.
              </List.Item>
              <List.Item>
                Rows where the <code>horizon</code> column is negative
                (nowcasts).
              </List.Item>
              <List.Item>
                Rows where the <code>output_type</code> column is{" "}
                <code>sample</code>.
              </List.Item>
              <List.Item>
                Rows where the <code>output_type</code> column is{" "}
                <code>quantile</code> but the <code>output_type_id</code> column
                is not a valid numeric quantile between <code>0</code> and{" "}
                <code>1</code>.
              </List.Item>
              <List.Item>
                Quantile rows whose <code>output_type_id</code> values do not
                have the matching upper or lower partner needed to form a
                prediction interval. Unpaired quantiles are filtered out, while
                paired quantiles are kept and used to build interval shading in
                the dashboard.
              </List.Item>
              <List.Item>
                Rows where the <code>output_type_id</code> column contains one
                of the currently unsupported qualitative values{" "}
                <code>decrease</code>, <code>increase</code>,{" "}
                <code>large_decrease</code>, <code>large_increase</code>, or{" "}
                <code>stable</code>.
              </List.Item>
              <List.Item>
                Rows where the <code>target</code> column is a flu peak target,
                which is currently excluded from this MyRespiLens workflow.
              </List.Item>
            </List>
            <Alert
              color="blue"
              variant="light"
              radius="lg"
              icon={<IconCheck size={16} />}
            >
              If enough usable rows remain after filtering, MyRespiLens will
              continue and build the dashboard.
            </Alert>
          </SectionCard>

          <SectionCard
            title="What will cause a failure or error?"
            icon={<IconAlertCircle size={20} />}
          >
            <Text>
              MyRespiLens will stop and show an error when it cannot safely
              continue. Common failure cases include:
            </Text>
            <List spacing="sm">
              <List.Item>No uploaded files are CSVs.</List.Item>
              <List.Item>Required columns are missing.</List.Item>
              <List.Item>The file has headers but no forecast rows.</List.Item>
              <List.Item>
                <code>target_end_date</code> cannot be parsed.
              </List.Item>
              <List.Item>
                <code>value</code> is not numeric.
              </List.Item>
              <List.Item>
                <code>horizon</code> is missing or not an integer.
              </List.Item>
              <List.Item>
                After preprocessing and filtering, no usable rows remain.
              </List.Item>
              <List.Item>
                A location in the uploaded forecast data is not present in the
                hub’s reference <code>locations.csv</code>.
              </List.Item>
              <List.Item>
                The site cannot load the hub reference files it needs
                internally.
              </List.Item>
              <List.Item>
                The projections JSON cannot be built from the uploaded rows and
                the hub reference data.
              </List.Item>
            </List>
            <Text>
              MyRespiLens may also show a non-fatal warning if the uploaded{" "}
              <code>target</code> names do not appear to match the pathogen
              implied by the hub you selected.
            </Text>
          </SectionCard>
        </Stack>
      </Container>
    </>
  );
};

export default Documentation;
