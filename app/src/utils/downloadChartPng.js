import Plotly from "plotly.js/dist/plotly";
import {
  buildPlotDownloadName,
  PLOT_DOWNLOAD_IMAGE_SCALE,
} from "./plotDownloadName";

/**
 * Saves a chart as a PNG: a copy of the figure at the range on screen,
 * without the minimap or the 1m / 6m / All buttons (controls, not part of
 * the chart). Since the toolbar is hidden (see PLOT_CONFIG), this is how
 * every page offers the image — pass the element wrapping the chart (the
 * first plot inside it is taken) and a fallback name for the file.
 */
export const downloadChartPng = (container, fallbackName) => {
  const plot = container?.querySelector?.(".js-plotly-plot") || container;
  if (!plot?._fullLayout) return;

  const full = plot._fullLayout;
  const layout = { ...plot.layout };
  Object.keys(full)
    .filter((key) => /^[xy]axis\d*$/.test(key))
    .forEach((key) => {
      layout[key] = {
        ...layout[key],
        range: [...full[key].range],
        autorange: false,
        ...(key.startsWith("x") && {
          rangeslider: { visible: false },
          rangeselector: { visible: false },
        }),
      };
    });

  Plotly.downloadImage(
    { data: plot.data, layout },
    {
      width: full.width,
      height: full.height,
      format: "png",
      filename: buildPlotDownloadName(fallbackName),
      scale: PLOT_DOWNLOAD_IMAGE_SCALE,
      // Charts are transparent on the page; give the image a background
      setBackground: "opaque",
    },
  );
};
