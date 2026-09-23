import {
  Button,
  Code,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import Seo from "./Seo";

/**
 * Any address that is not a page: an unknown path, a front page asked for a
 * location no hub carries (/ZZ), or a mistyped hub or state in a chart URL.
 * `title` and `detail` say which, so a stale link explains itself instead of
 * turning into the front page.
 */
const NotFoundPage = ({
  title = "Page not found",
  detail = "It may have moved, or the link may be mistyped.",
}) => {
  const { pathname, search } = useLocation();

  return (
    <>
      <Seo
        title={`RespiLens | ${title}`}
        description="This RespiLens address does not exist."
        canonicalPath="/"
        noindex
      />
      <Container size="sm" pt="xl" pb="xl">
        <Stack gap="md" align="flex-start">
          <Title order={1}>{title}</Title>
          <Text>{detail}</Text>
          <Text size="sm" c="dimmed">
            You asked for <Code>{`${pathname}${search}`}</Code>.
          </Text>
          <Group gap="sm" mt="xs">
            <Button component={Link} to="/">
              Go to the overview
            </Button>
            <Button component={Link} to="/forecasts/flusight" variant="default">
              See flu forecasts
            </Button>
          </Group>
        </Stack>
      </Container>
    </>
  );
};

export default NotFoundPage;
