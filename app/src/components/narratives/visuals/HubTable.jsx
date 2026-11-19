import { Stack, Table, Text, Title } from "@mantine/core";

// The forecast hubs a story covers, side by side: who runs each, since
// when, where and what it forecasts. Rows come from the slide's `hubs`
// ({ name, organizer, since, teams, models, resolution, forecasts }).
const HubTable = ({ story, slide }) => {
  const year = Number((story.asOf || "").slice(0, 4));
  const age = (since) => {
    const years = year - since;
    return years >= 1 ? ` (${years} year${years === 1 ? "" : "s"})` : "";
  };

  return (
    <Stack gap="md">
      <Title
        order={3}
        fz={{ base: 20, sm: 24 }}
        fw={600}
        lh={1.35}
        style={{ textWrap: "balance" }}
      >
        {slide.hubs.length} forecast hubs{" "}
        <Text span inherit c="dimmed" fw={400}>
          on RespiLens
        </Text>
      </Title>
      <Table.ScrollContainer minWidth={680}>
        <Table verticalSpacing="sm" className="respilens-hub-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Hub</Table.Th>
              <Table.Th scope="col">Since</Table.Th>
              <Table.Th scope="col">Teams</Table.Th>
              <Table.Th scope="col">Resolution</Table.Th>
              <Table.Th scope="col">Forecasts</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {slide.hubs.map((hub) => (
              <Table.Tr key={hub.name}>
                <Table.Th scope="row" fw={400}>
                  <Text fw={600} size="sm">
                    {hub.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {hub.organizer}
                  </Text>
                </Table.Th>
                <Table.Td>
                  <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                    {hub.since}
                    {age(hub.since)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                    {hub.teams} ({hub.models} models)
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{hub.resolution}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{hub.forecasts}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
};

export default HubTable;
