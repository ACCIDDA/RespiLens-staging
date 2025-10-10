import { Modal, Button, Group, Text, List, Alert, Anchor, Image, Title, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle, IconBrandGithub, IconAlertTriangle } from '@tabler/icons-react';

const InfoOverlay = () => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button
        variant="subtle"
        color="red"
        size="sm"
        leftSection={<IconInfoCircle size={20} />}
        onClick={open}
        radius="xl"
      >
        Info
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={
          <Group gap="md">
            <Image src="respilens-logo.svg" alt="RespiLens logo" h={32} w={32} />
            <Title order={2} c="blue">RespiLens</Title>
            <Anchor
              href="https://github.com/ACCIDDA/RespiLens"
              target="_blank"
              rel="noopener"
              c="dimmed"
            >
              <IconBrandGithub size={24} />
            </Anchor>
          </Group>
        }
        size="lg"
        scrollAreaComponent={Modal.NativeScrollArea}
      >
        <Stack gap="md">
          <Alert
            icon={<IconAlertTriangle size={20} />}
            title="Alpha Version"
            color="yellow"
            variant="light"
          >
            <Text size="sm">
              This is an alpha version that may break unexpectedly. URL schemas and features may change.
              Everyone is welcome to use it, and if you notice something that can be improved,
              please{' '}
              <Anchor
                href="https://github.com/ACCIDDA/RespiLens/issues"
                target="_blank"
                rel="noopener"
              >
                raise an issue
              </Anchor>{' '}
              on GitHub.
            </Text>
          </Alert>

          <Text>
            A responsive web app to visualize respiratory disease forecasts in the US, focused on
            accessibility for state health departments and general public. Key features include:
          </Text>

          <List spacing="xs" size="sm">
            <List.Item>URL-shareable views for specific forecasts</List.Item>
            <List.Item>Weekly automatic updates</List.Item>
            <List.Item>Multi-pathogen and multi-view</List.Item>
            <List.Item>Multi-date comparison capability</List.Item>
            <List.Item>Flexible model comparison</List.Item>
            <List.Item>Responsive and mobile friendly (for some views)</List.Item>
          </List>

          <div>
            <Title order={4} mb="xs">On the roadmap</Title>
            <List spacing="xs" size="sm">
              <List.Item>Scoring visualization and ability to select best models</List.Item>
              <List.Item>Multi-pathogen views</List.Item>
              <List.Item>Model description on hover</List.Item>
            </List>
          </div>

          <Text size="sm">
            Made by Emily Przykucki (UNC Chapel Hill), {' '} 
            <Anchor href="https://josephlemaitre.com" target="_blank" rel="noopener">
              Joseph Lemaitre
            </Anchor>{' '}
            (UNC Chapel Hill) and others within ACCIDDA, the Atlantic Coast Center
            for Infectious Disease Dynamics and Analytics.
          </Text>

          <div>
            <Title order={4} mb="xs">About FluSight</Title>
            <Text size="sm" mb="xs">
              CDC's flu forecasting initiative helps predict future influenza activity to support
              public health planning.
            </Text>
            <Anchor
              href="https://github.com/cdcepi/FluSight-forecast-hub"
              target="_blank"
              rel="noopener"
              size="sm"
            >
              Flusight Forecast Hub
            </Anchor>
          </div>

          <div>
            <Title order={4} mb="xs">About RSV forecasting</Title>
            <Anchor
              href="https://rsvforecasthub.org"
              target="_blank"
              rel="noopener"
              size="sm"
            >
              About RSV forecast hub
            </Anchor>
          </div>

          <div>
            <Text fw={500} size="sm" mb="xs">Other Flusight viz by reichlab:</Text>
            <List spacing="xs" size="sm">
              <List.Item>
                <Anchor href="http://flusightnetwork.io" target="_blank" rel="noopener">
                  flusightnetwork.io
                </Anchor>{' '}
                (historical)
              </List.Item>
              <List.Item>
                <Anchor href="https://zoltardata.com/project/360/viz" target="_blank" rel="noopener">
                  Zoltar visualization
                </Anchor>{' '}
                (last year season)
              </List.Item>
              <List.Item>
                <Anchor href="https://reichlab.io/flusight-dashboard/" target="_blank" rel="noopener">
                  Current flusight dashboard
                </Anchor>
              </List.Item>
            </List>
          </div>
        </Stack>
      </Modal>
    </>
  );
};

export default InfoOverlay;
