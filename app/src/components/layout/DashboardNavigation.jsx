import React, { useState } from 'react';
import { Group, ThemeIcon, Title, ActionIcon, Menu, Avatar, Text, Stack, Button, Divider } from '@mantine/core';
import { 
  IconDashboard, 
  IconActivity, 
  IconTarget, 
  IconBookmark, 
  IconSettings, 
  IconBell, 
  IconUser, 
  IconLogout,
  IconChartLine
} from '@tabler/icons-react';

const DashboardNavigation = ({ activeTab, setActiveTab, user, inHeader = false }) => {
  if (inHeader) {
    return (
      <Group justify="space-between" align="center">
        <Group>
          <ThemeIcon size="lg" variant="light">
            <IconDashboard size={24} />
          </ThemeIcon>
          <Title order={3}>MyRespiLens</Title>
        </Group>
        
        <Group gap="xs">
          <ActionIcon variant="subtle" size="lg">
            <IconBell size={20} />
          </ActionIcon>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Group style={{ cursor: 'pointer' }}>
                <Avatar size="sm" radius="xl" />
                <Text size="sm" fw={500}>{user?.name || 'User'}</Text>
              </Group>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUser size={14} />}>
                Profile
              </Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />}>
                Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconLogout size={14} />} color="red">
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    );
  }

  return (
    <>
      <Stack gap="xs">
        <Button
          variant={activeTab === 'overview' ? 'light' : 'subtle'}
          leftSection={<IconDashboard size={16} />}
          justify="start"
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'activity' ? 'light' : 'subtle'}
          leftSection={<IconActivity size={16} />}
          justify="start"
          onClick={() => setActiveTab('activity')}
        >
          Recent Activity
        </Button>
        <Button
          variant={activeTab === 'forecastable' ? 'light' : 'subtle'}
          leftSection={<IconTarget size={16} />}
          justify="start"
          onClick={() => setActiveTab('forecastable')}
        >
          Forecastable Stats
        </Button>
        <Button
          variant={activeTab === 'bookmarks' ? 'light' : 'subtle'}
          leftSection={<IconBookmark size={16} />}
          justify="start"
          onClick={() => setActiveTab('bookmarks')}
        >
          Bookmarks
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'light' : 'subtle'}
          leftSection={<IconSettings size={16} />}
          justify="start"
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </Button>
      </Stack>

      <Divider my="md" />

      {/* Quick Actions */}
      <Stack gap="xs">
        <Text size="sm" fw={500} c="dimmed">Quick Actions</Text>
        <Button variant="light" size="xs" leftSection={<IconChartLine size={14} />} component="a" href="/">
          View Forecasts
        </Button>
        <Button variant="light" size="xs" leftSection={<IconBookmark size={14} />} component="a" href="/narratives">
          Browse Narratives
        </Button>
        <Button variant="light" size="xs" leftSection={<IconTarget size={14} />} component="a" href="/forecastable">
          Play Forecastable
        </Button>
      </Stack>
    </>
  );
};

export default DashboardNavigation;