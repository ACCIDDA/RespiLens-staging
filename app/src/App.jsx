// src/App.jsx

import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ViewProvider } from './contexts/ViewContext';
import { useView } from './hooks/useView';
import ForecastViz from './components/ForecastViz';
import NarrativeBrowser from './components/narratives/NarrativeBrowser';
import SlideNarrativeViewer from './components/narratives/SlideNarrativeViewer';
import ForecastleGame from './components/forecastle/ForecastleGame';
import MyRespiLensDashboard from './components/dashboard/MyRespiLensDashboard';
import UnifiedAppShell from './components/layout/UnifiedAppShell';
import { Center, Text } from '@mantine/core';

const ForecastApp = () => {
  // This component uses the view context, so it must be inside the provider.
  const { selectedLocation } = useView();

  if (!selectedLocation) {
    return (
      <Center h="100%">
        <Text c="dimmed" size="lg">Select a state to view forecasts</Text>
      </Center>
    );
  }
  return <ForecastViz />;
};

// We create this new component to hold our main layout.
// It can safely use hooks because it will be inside the Router and Provider.
const AppLayout = () => {
  const navigate = useNavigate(); // Safely used inside <Router>

  return (
    <UnifiedAppShell>
      <Routes>
        <Route path="/" element={<ForecastApp />} />
        <Route path="/narratives" element={<NarrativeBrowser onNarrativeSelect={(id) => navigate(`/narratives/${id}`)} />} />
        <Route path="/narratives/:id" element={<SlideNarrativeViewer />} />
        <Route path="/forecastle" element={<ForecastleGame />} />
        <Route path="/dashboard" element={<MyRespiLensDashboard />} />
      </Routes>
    </UnifiedAppShell>
  );
};

const App = () => {
  return (
    <Router>
      {/* The ViewProvider now wraps everything, making the context available to all components */}
      <ViewProvider>
        <AppLayout />
      </ViewProvider>
    </Router>
  );
};

export default App;
