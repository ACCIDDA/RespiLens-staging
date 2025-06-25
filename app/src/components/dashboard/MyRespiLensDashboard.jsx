import React, { useState, useEffect } from 'react';
import {
  AppShell,
  Container,
  SimpleGrid,
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  ThemeIcon,
  Progress,
  Avatar,
  Menu,
  ActionIcon,
  Alert,
  Paper,
  Tabs,
  Table,
  RingProgress,
  Center,
  Timeline,
  Anchor,
  Divider
} from '@mantine/core';
import {
  IconDashboard,
  IconChartLine,
  IconBookmark,
  IconTarget,
  IconSettings,
  IconBell,
  IconUser,
  IconLogout,
  IconTrendingUp,
  IconTrendingDown,
  IconEye,
  IconShare,
  IconDownload,
  IconCalendar,
  IconMapPin,
  IconAward,
  IconChevronRight,
  IconActivity,
  IconAlertTriangle,
  IconInfoCircle
} from '@tabler/icons-react';

const MyRespiLensDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [user] = useState({
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@health.state.gov',
    role: 'State Epidemiologist',
    organization: 'New York State Health Department',
    joinDate: '2023-08-15',
    avatar: null
  });

  const [dashboardData] = useState({
    favoriteLocations: ['US', 'NY', 'CA', 'FL'],
    recentViews: [
      { id: 1, type: 'forecast', location: 'NY', pathogen: 'Flu', date: '2024-12-24 09:30' },
      { id: 2, type: 'narrative', title: 'Flu Season Winter 2024-25', date: '2024-12-23 14:22' },
      { id: 3, type: 'forecast', location: 'US', pathogen: 'RSV', date: '2024-12-23 11:15' },
      { id: 4, type: 'game', title: 'Forecastable Daily Challenge', date: '2024-12-22 16:45' }
    ],
    forecastableStats: {
      totalGames: 45,
      averageScore: 72,
      bestStreak: 8,
      currentStreak: 3,
      accuracy: 76
    },
    bookmarks: [
      { id: 1, title: 'NY Flu Detailed View', url: '/forecast?location=NY&view=fludetailed', date: '2024-12-20' },
      { id: 2, title: 'Multi-Pathogen Narrative', url: '/narratives/multi-pathogen-dynamics', date: '2024-12-18' },
      { id: 3, title: 'US RSV Time Series', url: '/forecast?location=US&view=rsvdetailed', date: '2024-12-15' }
    ],
    alerts: [
      { id: 1, type: 'warning', title: 'Flu Activity Surge in NY', message: 'Hospitalizations increased 45% this week', date: '2024-12-24' },
      { id: 2, type: 'info', title: 'New Narrative Available', message: 'RSV Pediatric Surge analysis is now live', date: '2024-12-23' }
    ],
    usage: {
      totalSessions: 128,
      avgSessionTime: '12m 34s',
      mostViewedPathogen: 'Influenza',
      mostViewedLocation: 'New York'
    }
  });

  const StatCard = ({ title, value, change, icon, color = 'blue' }) => (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="sm" fw={500} tt="uppercase">
            {title}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
          {change && (
            <Group gap={4} mt={5}>
              <ThemeIcon size="sm" color={change > 0 ? 'green' : 'red'} variant="light">
                {change > 0 ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
              </ThemeIcon>
              <Text size="sm" c={change > 0 ? 'green' : 'red'}>
                {change > 0 ? '+' : ''}{change}%
              </Text>
            </Group>
          )}
        </div>
        <ThemeIcon color={color} size={38} radius="md" variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );

  const ActivityItem = ({ item }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'forecast': return <IconChartLine size={16} />;
        case 'narrative': return <IconBookmark size={16} />;
        case 'game': return <IconTarget size={16} />;
        default: return <IconEye size={16} />;
      }
    };

    const getTitle = () => {
      if (item.type === 'forecast') {
        return `${item.location} ${item.pathogen} Forecast`;
      }
      return item.title;
    };

    return (
      <Group gap="sm" p="xs">
        <ThemeIcon size="sm" variant="light">
          {getIcon()}
        </ThemeIcon>
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>{getTitle()}</Text>
          <Text size="xs" c="dimmed">{item.date}</Text>
        </div>
        <ActionIcon size="sm" variant="subtle">
          <IconChevronRight size={14} />
        </ActionIcon>
      </Group>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Paper 
        style={{ 
          width: 250, 
          minWidth: 250, 
          height: '100vh',
          borderRadius: 0,
          borderRight: '1px solid var(--mantine-color-gray-3)'
        }} 
        p="md"
      >
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
          <Button variant="light" size="xs" leftSection={<IconChartLine size={14} />}>
            View Forecasts
          </Button>
          <Button variant="light" size="xs" leftSection={<IconBookmark size={14} />}>
            Browse Narratives
          </Button>
          <Button variant="light" size="xs" leftSection={<IconTarget size={14} />}>
            Play Forecastable
          </Button>
        </Stack>
      </Paper>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper 
          style={{ 
            height: 60, 
            borderRadius: 0,
            borderBottom: '1px solid var(--mantine-color-gray-3)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem'
          }}
        >
          <Group justify="space-between" w="100%">
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
                    <Text size="sm" fw={500}>{user.name}</Text>
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
        </Paper>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          <Container size="xl">
          {activeTab === 'overview' && (
            <Stack gap="md">
              {/* Welcome Section */}
              <Paper shadow="sm" p="lg" radius="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Title order={2} mb="xs">Welcome back, {user.name.split(' ')[1]}!</Title>
                    <Text c="dimmed">
                      {user.role} at {user.organization}
                    </Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      Member since {new Date(user.joinDate).toLocaleDateString()}
                    </Text>
                  </div>
                  <Badge variant="light" size="lg">
                    Active User
                  </Badge>
                </Group>
              </Paper>

              {/* Alerts */}
              {dashboardData.alerts.length > 0 && (
                <div>
                  <Title order={3} mb="md">Alerts</Title>
                  <Stack gap="xs">
                    {dashboardData.alerts.map(alert => (
                      <Alert
                        key={alert.id}
                        icon={alert.type === 'warning' ? <IconAlertTriangle size={16} /> : <IconInfoCircle size={16} />}
                        title={alert.title}
                        color={alert.type === 'warning' ? 'orange' : 'blue'}
                        variant="light"
                      >
                        <Group justify="space-between">
                          <Text size="sm">{alert.message}</Text>
                          <Text size="xs" c="dimmed">{alert.date}</Text>
                        </Group>
                      </Alert>
                    ))}
                  </Stack>
                </div>
              )}

              {/* Stats Overview */}
              <div>
                <Title order={3} mb="md">Usage Statistics</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                  <StatCard
                    title="Total Sessions"
                    value={dashboardData.usage.totalSessions}
                    change={12}
                    icon={<IconActivity size={20} />}
                    color="blue"
                  />
                  <StatCard
                    title="Avg Session Time"
                    value={dashboardData.usage.avgSessionTime}
                    change={8}
                    icon={<IconCalendar size={20} />}
                    color="green"
                  />
                  <StatCard
                    title="Forecastable Score"
                    value={dashboardData.forecastableStats.averageScore}
                    change={5}
                    icon={<IconTarget size={20} />}
                    color="orange"
                  />
                  <StatCard
                    title="Current Streak"
                    value={dashboardData.forecastableStats.currentStreak}
                    change={-2}
                    icon={<IconAward size={20} />}
                    color="purple"
                  />
                </SimpleGrid>
              </div>

              {/* Quick Overview Grid */}
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {/* Recent Activity */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="md">
                    <Title order={4}>Recent Activity</Title>
                    <Button variant="subtle" size="xs">View All</Button>
                  </Group>
                  <Stack gap="xs">
                    {dashboardData.recentViews.slice(0, 4).map(item => (
                      <ActivityItem key={item.id} item={item} />
                    ))}
                  </Stack>
                </Card>

                {/* Favorite Locations */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="md">
                    <Title order={4}>Favorite Locations</Title>
                    <Button variant="subtle" size="xs">Manage</Button>
                  </Group>
                  <SimpleGrid cols={2} spacing="xs">
                    {dashboardData.favoriteLocations.map(location => (
                      <Button
                        key={location}
                        variant="light"
                        size="sm"
                        leftSection={<IconMapPin size={14} />}
                      >
                        {location}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Card>
              </SimpleGrid>
            </Stack>
          )}

          {activeTab === 'forecastable' && (
            <Stack gap="md">
              <Title order={2}>Forecastable Statistics</Title>
              
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Center>
                    <RingProgress
                      size={120}
                      thickness={12}
                      sections={[
                        { value: dashboardData.forecastableStats.accuracy, color: 'blue' }
                      ]}
                      label={
                        <Center>
                          <div style={{ textAlign: 'center' }}>
                            <Text fw={700} size="lg">{dashboardData.forecastableStats.accuracy}%</Text>
                            <Text size="xs" c="dimmed">Accuracy</Text>
                          </div>
                        </Center>
                      }
                    />
                  </Center>
                </Card>

                <StatCard
                  title="Games Played"
                  value={dashboardData.forecastableStats.totalGames}
                  icon={<IconTarget size={20} />}
                />
                <StatCard
                  title="Average Score"
                  value={dashboardData.forecastableStats.averageScore}
                  icon={<IconTrendingUp size={20} />}
                />
                <StatCard
                  title="Best Streak"
                  value={dashboardData.forecastableStats.bestStreak}
                  icon={<IconAward size={20} />}
                />
              </SimpleGrid>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Recent Games</Title>
                <Text c="dimmed">Game history and detailed performance metrics coming soon...</Text>
              </Card>
            </Stack>
          )}

          {activeTab === 'bookmarks' && (
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={2}>Bookmarks</Title>
                <Button leftSection={<IconBookmark size={16} />}>
                  Add Bookmark
                </Button>
              </Group>
              
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  {dashboardData.bookmarks.map(bookmark => (
                    <Group key={bookmark.id} justify="space-between">
                      <div>
                        <Anchor fw={500} size="sm">{bookmark.title}</Anchor>
                        <Text size="xs" c="dimmed">{bookmark.date}</Text>
                      </div>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" size="sm">
                          <IconShare size={14} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" size="sm">
                          <IconDownload size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Card>
            </Stack>
          )}

          {activeTab === 'settings' && (
            <Stack gap="md">
              <Title order={2}>Settings</Title>
              
              <Tabs defaultValue="profile">
                <Tabs.List>
                  <Tabs.Tab value="profile">Profile</Tabs.Tab>
                  <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
                  <Tabs.Tab value="preferences">Preferences</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="profile" pt="md">
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="md">Profile Information</Title>
                    <Text c="dimmed">Profile management features coming soon...</Text>
                  </Card>
                </Tabs.Panel>

                <Tabs.Panel value="notifications" pt="md">
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="md">Notification Preferences</Title>
                    <Text c="dimmed">Notification settings coming soon...</Text>
                  </Card>
                </Tabs.Panel>

                <Tabs.Panel value="preferences" pt="md">
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="md">App Preferences</Title>
                    <Text c="dimmed">Preference settings coming soon...</Text>
                  </Card>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          )}
          </Container>
        </div>
      </div>
    </div>
  );
};

export default MyRespiLensDashboard;