import { Container, Stack, Text, Title } from "@mantine/core";
import Seo from "../Seo";

const MyPrivateHub = () => {
  return (
    <>
      <Seo
        title="RespiLens | Toolbox | My Private Hub"
        description="My Private Hub is under construction."
        canonicalPath="/toolbox/my-private-hub"
      />
      <Container size="lg" py="xl">
        <Stack gap="sm">
          <Title order={1}>My Private Hub</Title>
          <Text c="dimmed" size="lg">
            Under construction. Complex processing and logic will live here
            soon.
          </Text>
        </Stack>
      </Container>
    </>
  );
};

export default MyPrivateHub;
