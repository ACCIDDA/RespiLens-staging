import React, { useState } from 'react';
import { ActionIcon, Tooltip, Stack, Paper, Group, Box } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import StateSelector from './StateSelector';

/**
 * Layout component that handles sidebar and responsive behavior
 */
const Layout = ({ location, handleStateSelect, children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Group gap={0} style={{ height: '100vh' }} wrap="nowrap">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <StateSelector
          onStateSelect={handleStateSelect}
          currentLocation={location}
          sidebarMode={true}
        />
      )}

      {/* Main content area */}
      <Box style={{ flex: 1, position: 'relative' }}>
        {/* Sidebar toggle button */}
        <Tooltip 
          label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          position="right"
        >
          <ActionIcon
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            variant="default"
            size="lg"
            radius="md"
            style={{
              position: 'absolute',
              top: 16,
              left: 8,
              zIndex: 100,
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--mantine-shadow-sm)',
            }}
          >
            {sidebarCollapsed ? (
              <IconChevronRight size={16} />
            ) : (
              <IconChevronLeft size={16} />
            )}
          </ActionIcon>
        </Tooltip>

        {/* Content */}
        <Box style={{ height: '100vh', overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Group>
  );
};

export default Layout;