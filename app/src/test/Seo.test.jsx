import { waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Seo from "../components/Seo";
import { renderWithProviders } from "./renderWithProviders";

describe("Seo", () => {
  it("sets the document title and canonical URL from the route", async () => {
    renderWithProviders(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/documentation"]}>
          <Seo title="Documentation" />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.title).toBe("Documentation | RespiLens");
    });
    await waitFor(() => {
      expect(
        document.head.querySelector("link[rel='canonical']"),
      ).toHaveAttribute("href", "https://www.respilens.com/documentation");
    });
  });

  it("uses absolute image URLs in social metadata", async () => {
    renderWithProviders(
      <HelmetProvider>
        <MemoryRouter>
          <Seo image="/custom-preview.png" />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(
        document.head.querySelector("meta[property='og:image']"),
      ).toHaveAttribute(
        "content",
        "https://www.respilens.com/custom-preview.png",
      );
    });
  });
});
