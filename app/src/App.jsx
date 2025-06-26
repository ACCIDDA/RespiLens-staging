import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
import { ViewProvider } from './contexts/ViewContext';
import StateSelector from './components/StateSelector';
import ForecastViz from './components/ForecastViz';
import NarrativeBrowser from './components/narratives/NarrativeBrowser';
import SlideNarrativeViewer from './components/narratives/SlideNarrativeViewer';
import ForecastleGame from './components/forecastle/ForecastleGame';
import MyRespiLensDashboard from './components/dashboard/MyRespiLensDashboard';
import UnifiedAppShell from './components/layout/UnifiedAppShell';
import { URLParameterManager } from './utils/urlManager';
import { Group, Center, Text } from '@mantine/core';


const ForecastApp = ({ selectedLocation, onStateSelect }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlManager = new URLParameterManager(searchParams, setSearchParams);
  
  // Initialize location from URL if not provided from parent
  useEffect(() => {
    if (!selectedLocation) {
      const urlLocation = urlManager.getLocation();
      if (urlLocation) {
        onStateSelect(urlLocation);
      }
    }
  }, [selectedLocation, onStateSelect]);

  const handleStateSelect = (newLocation) => {
    urlManager.updateLocation(newLocation);
    onStateSelect(newLocation);
  };

  if (!selectedLocation) {
    return (
      <Center h="100%">
        <Text c="dimmed" size="lg">
          Select a state to view forecasts
        </Text>
      </Center>
    );
  }

  return <ForecastViz location={selectedLocation} handleStateSelect={handleStateSelect} />;
};

const AppContent = () => {
  const [dashboardActiveTab, setDashboardActiveTab] = useState('overview');
  const [dashboardUser] = useState({
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@health.state.gov',
    role: 'State Epidemiologist',
    organization: 'New York State Health Department',
    joinDate: '2023-08-15',
    avatar: null
  });

  // Forecast state for AppShell navbar
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    document.title = 'RespiLens';
  }, []);

  const dashboardProps = {
    activeTab: dashboardActiveTab,
    setActiveTab: setDashboardActiveTab,
    user: dashboardUser
  };

  const forecastProps = {
    currentLocation: selectedLocation,
    onStateSelect: setSelectedLocation
  };

  return (
    <UnifiedAppShell dashboardProps={dashboardProps} forecastProps={forecastProps}>
      <Routes>
        <Route path="/" element={<ForecastApp selectedLocation={selectedLocation} onStateSelect={setSelectedLocation} />} />
        <Route path="/narratives" element={<NarrativeBrowser onNarrativeSelect={(id) => window.location.href = `/narratives/${id}`} />} />
        <Route path="/narratives/:id" element={<SlideNarrativeViewer />} />
        <Route path="/forecastle" element={<ForecastleGame />} />
        <Route path="/dashboard" element={<MyRespiLensDashboard activeTab={dashboardActiveTab} user={dashboardUser} />} />
      </Routes>
    </UnifiedAppShell>
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
