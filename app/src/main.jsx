import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/carousel/styles.css";
import "./styles/global.css";
import App from "./App.jsx";
import { theme, cssVariablesResolver } from "./theme/mantine.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>,
);
