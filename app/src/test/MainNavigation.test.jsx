import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MainNavigation from "../components/layout/MainNavigation";
import { APP_CONFIG } from "../config/app";
import { useView } from "../hooks/useView";
import { renderWithProviders } from "./renderWithProviders";

vi.mock("../components/InfoOverlay", () => ({
  default: () => <div>Info overlay</div>,
}));

vi.mock("../hooks/useView", () => ({
  useView: vi.fn(),
}));

describe("MainNavigation", () => {
  beforeEach(() => {
    useView.mockReturnValue({
      setViewAndLocation: vi.fn(),
    });
  });

  it("renders links to the major top-level sections", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/myplots"]}>
        <MainNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Forecasts" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Forecastle" })).toHaveAttribute(
      "href",
      "/forecastle",
    );
    expect(screen.getByRole("link", { name: "MyRespiLens" })).toHaveAttribute(
      "href",
      "/myrespilens",
    );
    expect(screen.getByRole("link", { name: "My Plots (α)" })).toHaveAttribute(
      "href",
      "/myplots",
    );
  });

  it("resets the app view when the forecasts link is clicked", async () => {
    const user = userEvent.setup();
    const setViewAndLocation = vi.fn();

    useView.mockReturnValue({
      setViewAndLocation,
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/myplots"]}>
        <MainNavigation />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Forecasts" }));

    expect(setViewAndLocation).toHaveBeenCalledWith(
      "frontpage",
      APP_CONFIG.defaultLocation,
    );
  });
});
