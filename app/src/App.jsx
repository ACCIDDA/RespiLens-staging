import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
import { ViewProvider } from './contexts/ViewContext';
import StateSelector from './components/StateSelector';
import ForecastViz from './components/ForecastViz';
import NarrativeBrowser from './components/narratives/NarrativeBrowser';
import NarrativeViewer from './components/narratives/NarrativeViewer';
import ForecastableGame from './components/forecastable/ForecastableGame';
import MyRespiLensDashboard from './components/dashboard/MyRespiLensDashboard';
import InfoOverlay from './components/InfoOverlay';
import { URLParameterManager } from './utils/urlManager';
import { AppShell, Group, Button, Image, Title, ActionIcon, useMantineColorScheme, Menu, Burger, Center, Text } from '@mantine/core';
import { IconChartLine, IconBook, IconTarget, IconDashboard, IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

const MainNavigation = () => {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  
  const isActive = (path) => location.pathname.startsWith(path);
  
  const navigationItems = [
    { href: '/', label: 'Forecasts', icon: IconChartLine, active: location.pathname === '/' },
    { href: '/narratives', label: 'Narratives', icon: IconBook, active: isActive('/narratives') },
    { href: '/forecastable', label: 'Forecastable', icon: IconTarget, active: isActive('/forecastable') },
    { href: '/dashboard', label: 'MyRespiLens', icon: IconDashboard, active: isActive('/dashboard') }
  ];
  
  return (
    <Group justify="space-between" align="center" w="100%">
      {/* Logo */}
      <Group gap="sm">
        <Image src="respilens-logo.svg" alt="RespiLens Logo" h={28} w={28} />
        <Title order={3} c="blue" visibleFrom="sm">
          RespiLens<sup style={{ color: 'red', fontSize: '0.75rem' }}>α</sup>
        </Title>
      </Group>
      
      {/* Desktop Navigation */}
      <Group gap="xs" visibleFrom="md">
        {navigationItems.map((item) => (
          <Button
            key={item.href}
            component="a"
            href={item.href}
            variant={item.active ? 'filled' : 'subtle'}
            leftSection={<item.icon size={16} />}
            size="sm"
          >
            {item.label}
          </Button>
        ))}
      </Group>

      {/* Mobile Menu */}
      <Menu 
        opened={opened} 
        onClose={close} 
        shadow="md" 
        width={200}
        hiddenFrom="md"
      >
        <Menu.Target>
          <ActionIcon
            onClick={toggle}
            variant="subtle"
            size="lg"
            hiddenFrom="md"
          >
            <IconMenu2 size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {navigationItems.map((item) => (
            <Menu.Item
              key={item.href}
              component="a"
              href={item.href}
              leftSection={<item.icon size={16} />}
              onClick={close}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      {/* Actions */}
      <Group gap="xs">
        <ActionIcon
          onClick={toggleColorScheme}
          variant="subtle"
          size="lg"
          aria-label="Toggle color scheme"
        >
          {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </ActionIcon>
        <InfoOverlay />
      </Group>
    </Group>
  );
};

const ForecastApp = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlManager = new URLParameterManager(searchParams, setSearchParams);
  
  const [selectedLocation, setSelectedLocation] = useState(() => {
    return urlManager.getLocation();
  });

  const handleStateSelect = (newLocation) => {
    urlManager.updateLocation(newLocation);
    setSelectedLocation(newLocation);
  };

  if (!selectedLocation) {
    return (
      <Group wrap="nowrap" h="100vh">
        <StateSelector onStateSelect={handleStateSelect} sidebarMode={true} />
        <Center flex={1}>
          <Text c="dimmed" size="lg">
            Select a state to view forecasts
          </Text>
        </Center>
      </Group>
    );
  }

  return <ForecastViz location={selectedLocation} handleStateSelect={handleStateSelect} />;
};

const AppContent = () => {
  const location = useLocation();
  
  useEffect(() => {
    document.title = 'RespiLens';
  }, []);

  // Don't show main navigation for dashboard (it has its own AppShell)
  const showMainNav = !location.pathname.startsWith('/dashboard');

  return (
    <>
      {showMainNav && (
        <AppShell header={{ height: 60 }} padding={0}>
          <AppShell.Header>
            <Center h="100%" px="md">
              <MainNavigation />
            </Center>
          </AppShell.Header>
          <AppShell.Main>
            <Routes>
              <Route path="/" element={<ForecastApp />} />
              <Route path="/narratives" element={<NarrativeBrowser onNarrativeSelect={(id) => window.location.href = `/narratives/${id}`} />} />
              <Route path="/narratives/:id" element={<NarrativeViewer />} />
              <Route path="/forecastable" element={<ForecastableGame />} />
            </Routes>
          </AppShell.Main>
        </AppShell>
      )}
      
      {!showMainNav && (
        <Routes>
          <Route path="/dashboard" element={<MyRespiLensDashboard />} />
        </Routes>
      )}
    </>
  );
};

const App = () => (
  <Router>
    <ViewProvider>
      <AppContent />
    </ViewProvider>
  </Router>
);

export default App;
