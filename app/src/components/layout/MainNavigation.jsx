import { useLocation } from 'react-router-dom';
import { Group, Button, Image, Title, ActionIcon, useMantineColorScheme, Menu } from '@mantine/core';
import { IconChartLine, IconTarget, IconDashboard, IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import InfoOverlay from '../InfoOverlay';

const MainNavigation = () => {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  
  const isActive = (path) => location.pathname.startsWith(path);
  
  const navigationItems = [
    { href: '/', label: 'Forecasts', icon: IconChartLine, active: location.pathname === '/' },
    // { href: '/narratives', label: 'Narratives', icon: IconBook, active: isActive('/narratives') },   disable narratives for now
    { href: '/forecastle', label: 'Forecastle', icon: IconTarget, active: isActive('/forecastle') },
    { href: '/dashboard', label: 'MyRespiLens', icon: IconDashboard, active: isActive('/dashboard') }
  ];
  
  return (
    <Group justify="space-between" align="center" w="100%">
      {/* Logo */}
      <Group gap="sm" align="center">
        <Image src="respilens-logo.svg" alt="RespiLens Logo" h={28} w="auto" fit="contain" />
        <Title order={3} c="blue" visibleFrom="sm">
          RespiLens<sup style={{ color: 'var(--mantine-color-red-6)', fontSize: '0.75rem' }}>α</sup>
        </Title>
      </Group>
      
      {/* Desktop Navigation - Full Buttons */}
      <Group gap="xs" visibleFrom="lg">
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

      {/* Tablet/Mobile Navigation - Icon Only */}
      <Group gap="xs" hiddenFrom="lg">
        {navigationItems.map((item) => (
          <ActionIcon
            key={item.href}
            component="a"
            href={item.href}
            variant={item.active ? 'filled' : 'subtle'}
            size="lg"
            aria-label={item.label}
            title={item.label}
          >
            <item.icon size={18} />
          </ActionIcon>
        ))}
      </Group>

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

export default MainNavigation;