import { useLocation, Link } from 'react-router-dom';
import { Group, Button, Image, Title, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconChartLine, IconTarget, IconDashboard, IconSun, IconMoon, IconClipboard } from '@tabler/icons-react';
import InfoOverlay from '../InfoOverlay';

const MainNavigation = () => {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const isActive = (path) => location.pathname.startsWith(path);

  const navigationItems = [
    { href: '/', label: 'Forecasts', icon: IconChartLine, active: location.pathname === '/' },
    // { href: '/narratives', label: 'Narratives', icon: IconBook, active: isActive('/narratives') },   disable narratives for now
    { href: '/forecastle', label: 'Forecastle', icon: IconTarget, active: isActive('/forecastle') },
    { href: '/dashboard', label: 'MyRespiLens', icon: IconDashboard, active: isActive('/dashboard') },
    { href: '/documentation', label: 'Documentation', icon: IconClipboard, active: isActive('/documentation')}
  ];

  return (
    <Group justify="space-between" align="center" w="100%" wrap="nowrap" gap="sm">
      {/* Logo */}
      <Group gap="sm" align="center" style={{ flexShrink: 0 }}>
        <Image src="respilens-logo.svg" alt="RespiLens Logo" h={28} w="auto" fit="contain" />
        <Title order={3} c="blue" visibleFrom="sm">
          RespiLens<sup style={{ color: 'var(--mantine-color-red-6)', fontSize: '0.75rem' }}></sup>
        </Title>
      </Group>

      {/* Desktop Navigation - Full Buttons */}
      <Group gap="xs" visibleFrom="lg">
        {navigationItems.map((item) => (
          <Button
            key={item.href}
            component={Link}
            to={item.href}
            variant={item.active ? 'filled' : 'subtle'}
            leftSection={<item.icon size={16} />}
            size="sm"
          >
            {item.label}
          </Button>
        ))}
      </Group>

      {/* Actions */}
      <Group gap="xs" style={{ flexShrink: 0 }}>
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