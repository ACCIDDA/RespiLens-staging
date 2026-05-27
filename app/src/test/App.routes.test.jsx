import { screen } from "@testing-library/react";
import App from "../App";
import { ENABLED_TOURNAMENTS } from "../config";
import { useView } from "../hooks/useView";
import { renderWithProviders } from "./renderWithProviders";

vi.mock("../contexts/ViewContext", () => ({
  ViewProvider: ({ children }) => children,
}));

vi.mock("../hooks/useView", () => ({
  useView: vi.fn(),
}));

vi.mock("../components/DataVisualizationContainer", () => ({
  default: () => <div>Forecast data visualization</div>,
}));

vi.mock("../components/myplots/MyPlots", () => ({
  default: () => <div>My Plots page</div>,
}));

vi.mock("../components/narratives/NarrativeBrowser", () => ({
  default: () => <div>Narrative browser</div>,
}));

vi.mock("../components/narratives/SlideNarrativeViewer", () => ({
  default: () => <div>Slide narrative viewer</div>,
}));

vi.mock("../components/forecastle/ForecastleGame", () => ({
  default: () => <div>Forecastle game</div>,
}));

vi.mock("../components/myrespi/MyRespiLensDashboard", () => ({
  default: () => <div>MyRespiLens dashboard</div>,
}));

vi.mock("../components/tournament/TournamentDashboard", () => ({
  default: () => <div>Tournament dashboard</div>,
}));

vi.mock("../components/layout/UnifiedAppShell", () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock("../components/Documentation", () => ({
  default: () => <div>Documentation page</div>,
}));

vi.mock("../components/reporting/ReportingDelayPage", () => ({
  default: () => <div>Reporting delay page</div>,
}));

vi.mock("../components/tools/ToolsPage", () => ({
  default: () => <div>Tools page</div>,
}));

const renderAt = (path) => {
  window.history.pushState({}, "", path);
  return renderWithProviders(<App />);
};

describe("App routing", () => {
  beforeEach(() => {
    useView.mockReturnValue({
      selectedLocation: "US",
    });
    window.history.pushState({}, "", "/");
  });

  it("renders the forecast page at the root route when a location is selected", () => {
    renderAt("/");

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Forecast data visualization")).toBeInTheDocument();
  });

  it("shows the empty-state prompt when no location is selected", () => {
    useView.mockReturnValue({
      selectedLocation: null,
    });

    renderAt("/");

    expect(
      screen.getByText("Select a state to view forecasts"),
    ).toBeInTheDocument();
  });

  it("renders the documentation route", () => {
    renderAt("/documentation");

    expect(screen.getByText("Documentation page")).toBeInTheDocument();
  });

  it("renders the narrative detail route", () => {
    renderAt("/narratives/example-story");

    expect(screen.getByText("Slide narrative viewer")).toBeInTheDocument();
  });

  it("renders an enabled tournament route", () => {
    renderAt(ENABLED_TOURNAMENTS[0].path);

    expect(screen.getByText("Tournament dashboard")).toBeInTheDocument();
  });
});
