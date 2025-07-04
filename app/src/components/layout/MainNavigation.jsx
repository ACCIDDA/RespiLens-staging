import React from 'react';
import { useLocation } from 'react-router-dom';
import { Group, Button, Image, Title, ActionIcon, useMantineColorScheme, Menu } from '@mantine/core';
import { IconChartLine, IconBook, IconTarget, IconDashboard, IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import InfoOverlay from '../InfoOverlay';

const MainNavigation = () => {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  
  const isActive = (path) => location.pathname.startsWith(path);
  
  const navigationItems = [
    { href: '/', label: 'Forecasts', icon: IconChartLine, active: location.pathname === '/' },
    { href: '/narratives', label: 'Narratives', icon: IconBook, active: isActive('/narratives') },
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

export default MainNavigation;