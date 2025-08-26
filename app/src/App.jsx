// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ViewProvider, useView } from './contexts/ViewContext';
import ForecastViz from './components/ForecastViz';
import NarrativeBrowser from './components/narratives/NarrativeBrowser';
import SlideNarrativeViewer from './components/narratives/SlideNarrativeViewer';
import UnifiedAppShell from './components/layout/UnifiedAppShell';
import { Center, Text } from '@mantine/core';

const ForecastApp = () => {
  // Get location and the function to update it from the context
  const { selectedLocation, handleLocationSelect } = useView();

  if (!selectedLocation) {
    return (
      <Center h="100%">
        <Text c="dimmed" size="lg">Select a state to view forecasts</Text>
      </Center>
    );
  }
  // ForecastViz no longer needs location passed as a prop
  return <ForecastViz />;
};

const AppContent = () => {
  const navigate = useNavigate();
  return (
    <UnifiedAppShell>
      <Routes>
        <Route path="/" element={<ForecastApp />} />
        <Route path="/narratives" element={<NarrativeBrowser onNarrativeSelect={(id) => navigate(`/narratives/${id}`)} />} />
        <Route path="/narratives/:id" element={<SlideNarrativeViewer />} />
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