import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { theme } from "../theme/mantine";

export const renderWithProviders = (ui, options = {}) =>
  render(ui, {
    wrapper: ({ children }) => (
      <MantineProvider theme={theme}>{children}</MantineProvider>
    ),
    ...options,
  });
