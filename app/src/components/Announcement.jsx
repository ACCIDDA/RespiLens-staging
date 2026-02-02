import { Paper, Group, Text, ThemeIcon, Stack } from '@mantine/core';
import { IconSpeakerphone, IconAlertSquareRounded } from '@tabler/icons-react';

const Announcement = ({ startDate, endDate, text, announcementType }) => {
  const currentDate = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const isVisible = currentDate >= start && currentDate <= end;

  if (!isVisible) return null;

  return (
    <Stack>
      {announcementType === 'alert' ? (
        /* Alert Banner */
        <Paper
          withBorder
          p="xs"
          radius="md"
          shadow="xs"
          style={{
            background: 'linear-gradient(45deg, #fef3c7, #fffbeb)',
            borderColor: '#f59e0b',
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <ThemeIcon variant="light" color="yellow" radius="xl" size="sm">
                <IconAlertSquareRounded size={14} />
              </ThemeIcon>
              <Text size="sm" fw={500} c="yellow.9">
                <strong>Alert:</strong> {text}
              </Text>
            </Group>
          </Group>
        </Paper>
      ) : (
        /* Update Banner */
        <Paper
          withBorder
          p="xs"
          radius="md"
          shadow="xs"
          style={{
            background: 'linear-gradient(45deg, var(--mantine-color-blue-light), var(--mantine-color-cyan-light))',
            borderColor: 'var(--mantine-color-blue-outline)',
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <ThemeIcon variant="light" color="blue" radius="xl" size="sm">
                <IconSpeakerphone size={14} />
              </ThemeIcon>
              <Text size="sm" fw={500} c="blue.9">
                <strong>New features:</strong> {text}
              </Text>
            </Group>
          </Group>
        </Paper>
      )}
    </Stack>
  );
};

export default Announcement;