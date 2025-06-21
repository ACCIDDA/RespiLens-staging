import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, useSearchParams } from 'react-router-dom';
import { ViewProvider } from './contexts/ViewContext';
import StateSelector from './components/StateSelector';
import ForecastViz from './components/ForecastViz';
import { URLParameterManager } from './utils/urlManager';

const AppContent = () => {
  useEffect(() => {
    document.title = 'RespiLens';
  }, []);
  
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
      <div className="flex h-screen">
        <StateSelector onStateSelect={handleStateSelect} sidebarMode={true} />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500 text-lg">
            Select a state to view forecasts
          </div>
        </div>
      </div>
    );
  }

  return <ForecastViz location={selectedLocation} handleStateSelect={handleStateSelect} />;
};

const App = () => (
  <Router>
    <ViewProvider>
      <AppContent />
    </ViewProvider>
  </Router>
);

export default App;
