import { useContext, useLayoutEffect, useRef, useState } from "react";
import { Anchor, Group, Text } from "@mantine/core";
import { useView } from "../hooks/useView";
import LastFetched from "./LastFetched";
import AboutHubOverlay from "./AboutHubOverlay";
import { ChartAboutContext } from "../contexts/ChartAboutContext";

const FORECAST_NOTE =
  "Forecasts should be interpreted with great caution and may not reliably predict rapid changes in disease trends.";

// Plotly lays out its plot area (and the minimap under it) inside margins
// that depend on tick labels, so the caption measures where the minimap
// actually is and tucks itself right under it, spanning the same width.
// (Falls back to the plot area for charts without a minimap.)
// The chart a caption belongs to: the first plot in the nearest enclosing
// block that has one (views nest the caption differently)
const findNearestPlot = (el) => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const plot = node.querySelector(".js-plotly-plot");
    if (plot) return plot;
  }
  return null;
};

const useMinimapAlignment = (ref) => {
  const [box, setBox] = useState({ mt: 0, pl: 0, pr: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let plot = null;
    const measure = () => {
      const anchor =
        plot?.querySelector(".rangeslider-bg") ||
        plot?.querySelector(".draglayer .xy .nsewdrag");
      if (!anchor) return;
      const target = anchor.getBoundingClientRect();
      const self = el.getBoundingClientRect();
      // Where the caption would sit without our offset (read what is
      // applied now: a measure can run before the last update renders)
      const naturalTop = self.top - (parseFloat(el.style.marginTop) || 0);
      const next = {
        mt: Math.min(0, Math.round(target.bottom + 6 - naturalTop)),
        pl: Math.max(0, Math.round(target.left - self.left)),
        pr: Math.max(0, Math.round(self.right - target.right)),
      };
      setBox((prev) =>
        prev.mt === next.mt && prev.pl === next.pl && prev.pr === next.pr
          ? prev
          : next,
      );
    };

    // The chart renders after its data loads and Plotly initialises
    // asynchronously, so wait for it, then follow its redraws and resizes.
    let frame;
    const resizeObserver = new ResizeObserver(measure);
    const attach = () => {
      plot = findNearestPlot(el);
      if (plot && typeof plot.on === "function") {
        plot.on("plotly_afterplot", measure);
        resizeObserver.observe(plot);
        measure();
      } else {
        frame = requestAnimationFrame(attach);
      }
    };
    attach();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      plot?.removeListener?.("plotly_afterplot", measure);
    };
  }, [ref]);

  return box;
};

// Caption under a chart: source (opens the About modal) and freshness on the
// left, the forecast caution note on the right, aligned with the minimap.
const ChartCaption = ({ forecastNote = false }) => {
  const about = useContext(ChartAboutContext);
  const { metadata } = useView();
  const ref = useRef(null);
  const { mt, pl, pr } = useMinimapAlignment(ref);
  const lastUpdated = metadata?.last_updated;

  const updated = lastUpdated && <LastFetched timestamp={lastUpdated} />;

  return (
    <Group
      ref={ref}
      justify="space-between"
      align="flex-start"
      gap="xs"
      wrap="wrap"
      // Pulled up into the chart's bottom margin, so stack above the plot
      // or its container swallows clicks on the source link
      style={{
        marginTop: mt,
        paddingLeft: pl,
        paddingRight: pr,
        position: "relative",
        zIndex: 1,
      }}
    >
      <Text size="xs" c="dimmed" lh={1.5} style={{ whiteSpace: "nowrap" }}>
        {about ? (
          <AboutHubOverlay
            title={about.title}
            renderTrigger={(open) => (
              <>
                From{" "}
                <Anchor component="button" size="xs" onClick={open}>
                  {about.sourceLabel}
                </Anchor>
                {updated && <>, {updated}</>}
              </>
            )}
          >
            {about.content}
          </AboutHubOverlay>
        ) : (
          updated
        )}
      </Text>
      {forecastNote && (
        // Shares the line when it fits, wraps its own text when space is
        // tight, and drops below only when under ~320px remain
        <Text
          size="xs"
          c="dimmed"
          lh={1.5}
          ta="right"
          style={{ flex: "1 1 320px", minWidth: 0 }}
        >
          {FORECAST_NOTE}
        </Text>
      )}
    </Group>
  );
};

export default ChartCaption;
