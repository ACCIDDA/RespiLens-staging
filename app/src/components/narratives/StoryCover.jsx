import { forwardRef } from "react";
import { Anchor, Center, Image, Stack, Text, Title } from "@mantine/core";

// A narrative's first page, across the whole width: its title, its authors
// (when it has some) and the ACCIDDA logo. The title is the page's heading,
// focused when a reader steps back to it.
const StoryCover = forwardRef(({ narrative, headingId }, ref) => (
  <Center mih="calc(100vh - 200px)">
    <Stack align="center" gap="lg" maw={820} ta="center" py="xl">
      <Title
        order={1}
        id={headingId}
        ref={ref}
        tabIndex={-1}
        fz={{ base: 32, sm: 48 }}
        lh={1.15}
        style={{ outline: "none", textWrap: "balance" }}
      >
        {narrative.title}
      </Title>
      {narrative.authors?.length > 0 && (
        <Text size="lg" c="dimmed">
          {narrative.authors.join(", ")}
        </Text>
      )}
      <Anchor
        href="https://www.accidda.org"
        target="_blank"
        rel="noopener noreferrer"
        className="respilens-accidda-logo"
        mt={48}
      >
        <Image src="/accidda-logo.png" alt="ACCIDDA" h={32} w="auto" />
      </Anchor>
    </Stack>
  </Center>
));

StoryCover.displayName = "StoryCover";

export default StoryCover;
