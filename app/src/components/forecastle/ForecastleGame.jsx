import React from 'react';
import { Container, Paper, Title, Text, Stack, ThemeIcon, Center } from '@mantine/core';
import { IconTarget } from '@tabler/icons-react';

const ForecastleGame = () => {
  return (
    <Container size="xl" py="xl" style={{ maxWidth: '800px' }}>
      <Center style={{ minHeight: '70vh' }}>
        <Paper shadow="sm" p="xl" radius="lg" withBorder style={{ width: '100%', maxWidth: '600px' }}>
          <Stack align="center" gap="xl">
            <ThemeIcon size={80} variant="light" color="blue">
              <IconTarget size={40} />
            </ThemeIcon>
            
            <div style={{ textAlign: 'center' }}>
              <Title order={2} mb="md">
                Forecastle
              </Title>
              <Text size="lg" c="dimmed" mb="sm">
                Coming Soon
              </Text>
              <Text size="md" c="dimmed" style={{ maxWidth: '400px', lineHeight: 1.6 }}>
                Wordle type game that will ask for forecast against flusight model
              </Text>
            </div>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
};

export default ForecastleGame;