import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StateSelector from './StateSelector';

/**
 * Layout component that handles sidebar, window sizing, and responsive behavior
 */
const Layout = ({ location, handleStateSelect, children }) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (windowSize.width < 768) {
      setSidebarCollapsed(true);
    }
  }, [windowSize.width]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <StateSelector
          onStateSelect={handleStateSelect}
          currentLocation={location}
          sidebarMode={true}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Sidebar toggle button */}
        <div className="p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {React.cloneElement(children, { windowSize })}
        </div>
      </div>
    </div>
  );
};

export default Layout;