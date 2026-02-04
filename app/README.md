# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## RespiLens App Structure

The app is organized around view-level components and shared UI primitives.

- `app/src/components/views/`: top-level view components rendered by `ViewSwitchboard`.
- `app/src/components/`: shared components used across multiple views.
- `app/src/hooks/`: shared hooks for common data+plot logic.

### Shared Overview Plot Logic

`app/src/hooks/useOverviewPlot.js` consolidates the Plotly overview card mechanics:

- `buildTraces(data)`: caller-supplied function that returns traces.
- `xRange`: optional `[startDate, endDate]` used to compute y-range.
- `yPaddingTopRatio` / `yPaddingBottomRatio`: asymmetric padding around min/max.
- `yMinFloor`: optional hard floor for the y-axis (`null` disables).
- `layoutDefaults` / `layoutOverrides`: customize Plotly layout safely.

This keeps `PathogenOverviewGraph` and `NHSNOverviewGraph` consistent while still
allowing each to define its own trace logic.

### Shared Quantile Forecast Logic

`app/src/hooks/useQuantileForecastTraces.js` builds the quantile-based Plotly traces
used across forecast views:

- Ground truth + median + 50%/95% interval bands.
- Formatting and styling controls (line widths, marker sizes, value suffixes).
- Handles missing quantiles when requested (e.g., MetroCast cards).

### Forecast Chart Controls

Forecast views share a single control panel (`ForecastChartControls`) that manages:

- Y-axis scale: `linear`, `log`, `sqrt`.
- Visible intervals: `median`, `50%`, `95%`.

State is stored in `ViewContext` so the settings stay in sync across views
(including MetroCast cards and Flu Peak).
