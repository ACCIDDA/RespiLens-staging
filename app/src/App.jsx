// src/App.jsx

import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import Documentation from './components/Documentation'
import { Center, Text } from '@mantine/core';
// import ShutdownBanner from './components/ShutdownBanner';, no longer necessary

import Snowfall from 'react-snowfall'; // delete this line for snowfall deletion

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
    <> {/*delete this line for snowfall deletion*/}
      <Snowfall 
          style={{
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: 1000, 
            pointerEvents: 'none' 
          }}
          color="#dee4fd"
          snowflakeCount={150}
          radius={[0.9, 2.5]}
      />
      <UnifiedAppShell>
        <Routes>
          <Route path="/" element={<ForecastApp />} />
          <Route path="/narratives" element={<NarrativeBrowser onNarrativeSelect={(id) => navigate(`/narratives/${id}`)} />} />
          <Route path="/narratives/:id" element={<SlideNarrativeViewer />} />
          <Route path="/forecastle" element={<ForecastleGame />} />
          <Route path="/epidemics10" element={<TournamentDashboard />} />
          <Route path="/myrespilens" element={<MyRespiLensDashboard />} />
          <Route path="/documentation" element={<Documentation />} />
        </Routes>
      </UnifiedAppShell>
    </> // delete this line for snowfall deletion
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
