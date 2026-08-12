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
        description="Learn how to visualize your data with MyRespiLens, what user-uploaded forecast data must contain, what gets filtered out, and what causes upload failures."
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
            <Text>
              MyRespiLens allows users to quickly visualize their forecast data
              simply by dragging and dropping CSV file(s). From the user's data
              (and location and ground truth data stored internally), a
              visualization dashboard will be built. All targets, locations,
              dates, and models found in the user's data will be available for
              selection. Additionally, a control panel is provided to modulate
              between linear, log, and square root y-axis scales, and to toggle
              which prediction intervals are visible on the plot.{" "}
            </Text>
            <Text>
              Before uploading, you will be prompted to select which hub your
              data "belongs" to.{" "}
              <b>
                You do not have to have a submitting model in order to visualize
                your data, but your data must use the same target data streams
                as the selected hub
              </b>{" "}
              (e.g., you are predicting "weekly incidence of influenza
              hospitalization" when you select FluSight). Your data must also
              comply with the MyRespiLens validation requirements, which are
              listed below.
            </Text>
            <Text>
              When you use MyRespiLens, the data does not leave your device (it
              is a private display). That is, if you navigate away from your
              visualization, you will have to re-upload your data to view it
              again.
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
            <Text fw={600}>Required columns:</Text>
            <List spacing="sm">
              <List.Item>
                <code>location</code> (FIPS code encoded as a string)
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
              assigns the fallback model name <code>user-uploaded-model</code>{" "}
              and assumes all data belongs to a single model.
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
                <code>horizon</code> must be parseable as an integer.
              </List.Item>
              <List.Item>
                The currently supported forecast outputs are quantitative
                forecast rows that the visualization layer can render.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed">
              For more information on the Hubverse format, visit the{" "}
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
              Some stipulations of user-uploaded data are not enforced with
              fatal errors. Instead, MyRespiLens filters them out during
              preprocessing and continues with the remaining usable rows. A list
              of things that will be filtered out of your data, if found:
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
                Rows where the <code>output_type</code> column value is NOT{" "}
                <code>quantile</code>.
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
                When Flu Metrocast Hub has been selected, rows where the{" "}
                <code>target_end_date</code> column is before{" "}
                <code>2025-11-22</code>.
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
              MyRespiLens will stop and show an error when it cannot resolve
              issues with the data. Common failure cases include:
            </Text>
            <List spacing="sm">
              <List.Item>No uploaded files are CSVs.</List.Item>
              <List.Item>Required columns are missing.</List.Item>
              <List.Item>
                The file has headers but no forecast rows. Or, no forecast rows
                were left after filtering described above.
              </List.Item>
              <List.Item>
                <code>target_end_date</code> cannot be parsed.
              </List.Item>
              <List.Item>
                <code>value</code> is not numeric.
              </List.Item>
              <List.Item>
                <code>horizon</code> is missing or not parseable as an integer.
              </List.Item>
              <List.Item>
                For Flu Metrocast uploads, one or more{" "}
                <code>target_end_date</code> values are before{" "}
                <code>2025-11-22</code>.
              </List.Item>
              <List.Item>
                A location in the uploaded forecast data is not present in the
                hub’s reference <code>locations.csv</code> file.
              </List.Item>
              <List.Item>
                The site cannot load the hub reference files it needs
                internally.
              </List.Item>
            </List>
            <Text>
              In attempt to prevent misleading visualization displays,
              MyRespiLens will also show a non-fatal warning if the uploaded{" "}
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
