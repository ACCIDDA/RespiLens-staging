// src/App.jsx

import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ViewProvider } from './contexts/ViewContext';
import { useView } from './hooks/useView';
import DataVisualizationContainer from './components/DataVisualizationContainer';
import NarrativeBrowser from './components/narratives/NarrativeBrowser';
import SlideNarrativeViewer from './components/narratives/SlideNarrativeViewer';
import ForecastleGame from './components/forecastle/ForecastleGame';
import MyRespiLensDashboard from './components/myrespi/MyRespiLensDashboard';
import TournamentDashboard from './components/tournament/TournamentDashboard';
import UnifiedAppShell from './components/layout/UnifiedAppShell';
import Documentation from './components/Documentation';
import LegacyUrlRedirect from './components/LegacyUrlRedirect';
import { Center, Text } from '@mantine/core';
// import ShutdownBanner from './components/ShutdownBanner';, no longer necessary
import { getDefaultForecastPath } from './utils/urlSlug';

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
  return <DataVisualizationContainer />;
};

// We create this new component to hold our main layout.
// It can safely use hooks because it will be inside the Router and Provider.
const AppLayout = () => {
  const navigate = useNavigate(); // Safely used inside <Router>

  // <ShutdownBanner />  was below UnifiedAppShell, should we need it again 
  return (
    <UnifiedAppShell>
      <Routes>
        {/* New SEO-friendly path-based routes */}
        <Route path="/forecasts/:view/:location" element={<ForecastApp />} />

        {/* Redirect root to default forecast page */}
        <Route path="/" element={<Navigate to={getDefaultForecastPath()} replace />} />

        {/* Legacy URL redirect - handles old query-param URLs */}
        <Route path="/legacy" element={<LegacyUrlRedirect />} />

        {/* Other app routes */}
        <Route path="/narratives" element={<NarrativeBrowser onNarrativeSelect={(id) => navigate(`/narratives/${id}`)} />} />
        <Route path="/narratives/:id" element={<SlideNarrativeViewer />} />
        <Route path="/forecastle" element={<ForecastleGame />} />
        <Route path="/epidemics10" element={<TournamentDashboard />} />
        <Route path="/myrespilens" element={<MyRespiLensDashboard />} />
        <Route path="/documentation" element={<Documentation />} />
      </Routes>
    </UnifiedAppShell>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <Router>
        {/* The ViewProvider now wraps everything, making the context available to all components */}
        <ViewProvider>
          <AppLayout />
        </ViewProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;
