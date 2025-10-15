import { useLocation } from 'react-router-dom';
import { AppShell, Center, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import MainNavigation from './MainNavigation';
import StateSelector from '../StateSelector';

const getShellConfig = (pathname) => {
  // For forecast view (main page), show navbar with StateSelector
  if (pathname === '/') {
    return {
      type: 'forecast',
      header: { height: 60 },
      navbar: { width: 256, breakpoint: 'sm' },
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

const UnifiedAppShell = ({ children, forecastProps = {} }) => {
  const location = useLocation();
  const config = getShellConfig(location.pathname);
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  const renderHeaderNavigation = () => {
    return (
      <Center h="100%" px="md" style={{ width: '100%', justifyContent: 'space-between' }}>
        {config.navbar && (
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
          />
        )}
        <MainNavigation />
      </Center>
    );
  };

  const renderNavbar = () => {
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
      navbar={{
        ...config.navbar,
        ...(config.navbar && {
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened }
        })
      }}
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
