import {
  Group,
  Text,
  List,
  Anchor,
  Image,
  Title,
  Stack,
  Badge,
  Container,
  Grid,
  TableOfContents,
} from "@mantine/core";
import { IconBrandGithub, IconWorld } from "@tabler/icons-react";
import Seo from "./Seo";
import { NavigationHelp } from "./KeyboardShortcutsModal";

// Two type sizes only: section headings and body text. Every section heading
// carries `data-toc`, which is what the table of contents lists.
const Section = ({ title, children }) => (
  <Stack gap="sm" component="section">
    <Title order={3} data-toc style={{ scrollMarginTop: 16 }}>
      {title}
    </Title>
    {children}
  </Stack>
);

const ExternalLink = (props) => (
  <Anchor target="_blank" rel="noopener noreferrer" {...props} />
);

const Deployment = ({ badge, color, repo, site }) => (
  <List.Item>
    <Group gap="xs" wrap="wrap">
      <Badge size="sm" color={color} variant="light">
        {badge}
      </Badge>
      <ExternalLink href={`https://github.com/${repo}`}>
        <Group gap={4} wrap="nowrap">
          <IconBrandGithub size={16} />
          {repo}
        </Group>
      </ExternalLink>
      deployed to
      <ExternalLink href={`https://${site}`}>
        <Group gap={4} wrap="nowrap">
          <IconWorld size={16} />
          {site}
        </Group>
      </ExternalLink>
    </Group>
  </List.Item>
);

// Header type size, and the cap height of the system font at that size
const HEADER_SIZE = 44;
const HEADER_CAP = Math.round(HEADER_SIZE * 0.7);

// About RespiLens, as a page in the main area (formerly a modal)
const AboutPage = () => (
  <>
    <Seo
      title="RespiLens | About"
      description="About RespiLens, a visualization layer for US respiratory disease forecasts from the Hubverse forecast hubs."
      canonicalPath="/about"
    />
    <Container size="lg" pt="md" pb="xl">
      {/* RespiLens on the left, "by ACCIDDA" on the right, spanning the text
          column only (same span and width as the body below). The ACCIDDA
          wordmark is cropped to its letters, so its height is set to the
          RespiLens cap height; a smaller grey "by" sits between them, all on
          one baseline. */}
      <Grid gutter={48}>
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Group
            justify="space-between"
            align="baseline"
            gap="md"
            maw={720}
            fz={HEADER_SIZE}
            lh={1.1}
          >
            <Group gap="sm" wrap="nowrap" align="baseline">
              <Image
                src="/respilens-logo.svg"
                alt=""
                h={HEADER_CAP}
                w="auto"
                fit="contain"
              />
              <Title order={1} c="blue" fz="inherit" lh="inherit">
                RespiLens
              </Title>
            </Group>
            <Group gap="sm" wrap="nowrap" align="baseline">
              <Text span c="gray.7" fz={HEADER_SIZE * 0.7} lh="inherit">
                by
              </Text>
              <Anchor
                href="https://www.accidda.org"
                target="_blank"
                rel="noopener noreferrer"
                className="respilens-accidda-logo"
              >
                <Image
                  src="/accidda-logo.png"
                  alt="ACCIDDA"
                  h={HEADER_CAP}
                  w="auto"
                  fit="contain"
                />
              </Anchor>
            </Group>
          </Group>
        </Grid.Col>
      </Grid>

      <Grid gutter={48} mt="lg">
        {/* Contents: a sticky rail on the right on wide screens, above the
            text on narrow ones */}
        <Grid.Col span={{ base: 12, md: 3 }} order={{ base: 1, md: 2 }}>
          <Stack
            gap={6}
            style={{ position: "sticky", top: "var(--mantine-spacing-md)" }}
          >
            <Text fw={600}>On this page</Text>
            <TableOfContents
              variant="light"
              radius="sm"
              size="md"
              scrollSpyOptions={{ selector: "[data-toc]" }}
              getControlProps={({ data }) => ({
                onClick: () =>
                  data.getNode().scrollIntoView({ behavior: "smooth" }),
                children: data.value,
              })}
            />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }} order={{ base: 2, md: 1 }}>
          {/* Bottom room lets the last sections scroll up to the top, so
              the contents highlight follows a click on them */}
          <Stack gap="xl" maw={720} pb="35vh">
            <Stack gap="sm">
              <Text>
                RespiLens is a responsive web app to visualize respiratory
                disease forecasts in the US, focused on accessibility for state
                health departments and the general public. It is made by Emily
                Przykucki and{" "}
                <ExternalLink href="https://josephlemaitre.com">
                  Joseph Lemaitre
                </ExternalLink>{" "}
                (UNC Chapel Hill) at{" "}
                <ExternalLink href="https://www.accidda.org">
                  ACCIDDA
                </ExternalLink>
                , the Atlantic Coast Center for Infectious Disease Dynamics and
                Analytics. Key features include:
              </Text>
              <List spacing="xs">
                <List.Item>
                  URL-shareable views for specific forecast settings
                </List.Item>
                <List.Item>
                  Responsive and mobile-friendly site with frequent and
                  automatic updates
                </List.Item>
                <List.Item>Multi date, target, and model comparison</List.Item>
                <List.Item>the Forecastle game!</List.Item>
                <List.Item>
                  Forecast Checker: a safe visualization tool for your own data
                </List.Item>
                <List.Item>
                  <ExternalLink href="https://github.com/ACCIDDA/RespiLens">
                    Open source
                  </ExternalLink>
                  : we welcome contributions and reuse
                </List.Item>
              </List>
            </Stack>

            <Section title="Attribution">
              <Text>
                RespiLens exists within a landscape of other respiratory illness
                data dashboards. We rely heavily on the{" "}
                <ExternalLink href="https://hubverse.io">Hubverse</ExternalLink>{" "}
                project, which standardizes and consolidates forecast data
                formats. For each of the hubs displayed on RespiLens, the data,
                organization, and forecasts belong to their respective teams.{" "}
                <strong>
                  RespiLens is only a visualization layer, and contains no
                  original work.
                </strong>
              </Text>
            </Section>

            <Section title="Forecast hubs">
              <Text>
                You can find information (and alternative visualization) for
                each pathogen at the following locations:
              </Text>
              <List spacing="xs">
                <List.Item>
                  FluSight Forecast Hub:{" "}
                  <ExternalLink href="https://www.cdc.gov/flu-forecasting/about/index.html">
                    official CDC page
                  </ExternalLink>{" "}
                  |{" "}
                  <ExternalLink href="https://reichlab.io/flusight-dashboard/">
                    Hubverse dashboard
                  </ExternalLink>{" "}
                  |{" "}
                  <ExternalLink href="https://github.com/cdcepi/FluSight-forecast-hub">
                    official GitHub repository
                  </ExternalLink>
                </List.Item>
                <List.Item>
                  RSV Forecast Hub:{" "}
                  <ExternalLink href="https://github.com/CDCgov/rsv-forecast-hub">
                    official GitHub repository
                  </ExternalLink>
                </List.Item>
                <List.Item>
                  COVID-19 Forecast Hub:{" "}
                  <ExternalLink href="https://www.cdc.gov/cfa-modeling-and-forecasting/covid19-data-vis/index.html">
                    official CDC page
                  </ExternalLink>{" "}
                  |{" "}
                  <ExternalLink href="https://reichlab.io/covidhub-dashboard">
                    Hubverse dashboard
                  </ExternalLink>{" "}
                  |{" "}
                  <ExternalLink href="https://github.com/CDCgov/covid19-forecast-hub">
                    official GitHub repository
                  </ExternalLink>
                </List.Item>
                <List.Item>
                  Flu MetroCast Hub:{" "}
                  <ExternalLink href="https://reichlab.io/metrocast-dashboard/forecast.html?as_of=2026-01-24&interval=95%25&target_var=ILI+ED+visits+pct&xaxis_range=2025-08-01&xaxis_range=2026-07-01&yaxis_range=0.5955774343586175&yaxis_range=11.579180135033756&model=epiENGAGE-ensemble_mean&location=nyc">
                    official dashboard
                  </ExternalLink>{" "}
                  |{" "}
                  <ExternalLink href="https://reichlab.io/metrocast-dashboard/">
                    site
                  </ExternalLink>{" "}
                  |{" "}
                  <ExternalLink href="https://github.com/reichlab/flu-metrocast">
                    official GitHub repository
                  </ExternalLink>
                </List.Item>
              </List>
            </Section>

            <Section title="Deployments">
              <List spacing="xs">
                <Deployment
                  badge="Stable"
                  color="green"
                  repo="ACCIDDA/RespiLens"
                  site="respilens.com"
                />
                <Deployment
                  badge="Staging"
                  color="yellow"
                  repo="ACCIDDA/RespiLens-staging"
                  site="staging.respilens.com"
                />
              </List>
            </Section>

            <Section title="Navigating the charts">
              <Text c="dimmed">
                On chart pages. Press ? (or the red info button) there to bring
                this list up.
              </Text>
              <NavigationHelp size="md" maw={480} />
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  </>
);

export default AboutPage;
