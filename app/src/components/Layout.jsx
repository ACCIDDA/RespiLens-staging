import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StateSelector from './StateSelector';

/**
 * Layout component that handles sidebar and responsive behavior
 */
const Layout = ({ location, handleStateSelect, children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar toggle button */}
        <div className="absolute top-20 left-2 z-10">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded bg-white/90 backdrop-blur-sm hover:bg-white border border-gray-200 transition-colors shadow-sm"
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
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;