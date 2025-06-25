import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, Center } from '@mantine/core';
import MainNavigation from './MainNavigation';
import DashboardNavigation from './DashboardNavigation';
import StateSelector from '../StateSelector';

const getShellConfig = (pathname) => {
  if (pathname.startsWith('/dashboard')) {
    return {
      type: 'dashboard',
      header: { height: 70 },
      navbar: { width: 250, breakpoint: 'sm' },
      padding: 'md'
    };
  }
  
  // For forecast view (main page), show navbar with StateSelector
  if (pathname === '/') {
    return {
      type: 'forecast',
      header: { height: 60 },
      navbar: { width: 256, breakpoint: 'sm', collapsed: { mobile: true } },
      padding: 0
    };
  }
  
  return {
    type: 'main',
    header: { height: 60 },
    navbar: null,
    padding: 0
  };
};

const UnifiedAppShell = ({ children, dashboardProps = {}, forecastProps = {} }) => {
  const location = useLocation();
  const config = getShellConfig(location.pathname);

  const renderHeaderNavigation = () => {
    if (config.type === 'dashboard') {
      return (
        <DashboardNavigation 
          inHeader={true} 
          user={dashboardProps.user}
        />
      );
    }
    return (
      <Center h="100%" px="md">
        <MainNavigation />
      </Center>
    );
  };

  const renderNavbar = () => {
    if (config.type === 'dashboard') {
      return (
        <DashboardNavigation 
          activeTab={dashboardProps.activeTab}
          setActiveTab={dashboardProps.setActiveTab}
        />
      );
    }
    
    if (config.type === 'forecast') {
      return (
        <StateSelector
          onStateSelect={forecastProps.onStateSelect}
          currentLocation={forecastProps.currentLocation}
          appShellMode={true}
        />
      );
    }
    
    return null;
  };

  return (
    <AppShell
      header={config.header}
      navbar={config.navbar}
      padding={config.padding}
    >
      <AppShell.Header p="md">
        {renderHeaderNavigation()}
      </AppShell.Header>
      
      {config.navbar && (
        <AppShell.Navbar p="md">
          {renderNavbar()}
        </AppShell.Navbar>
      )}
      
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

export default UnifiedAppShell;