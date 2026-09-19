import { useMemo } from "react";
import { fetchJson, getDataPath } from "../utils/paths";
import { useAsyncData } from "../hooks/useAsyncData";
import { useView } from "../hooks/useView";
import OverviewGraphCard from "./OverviewGraphCard";
import useOverviewPlot from "../hooks/useOverviewPlot";
import { detectPathogen, getPathogenColor } from "../theme/pathogenColors";

const DEFAULT_COLS = [
  "Total COVID-19 Admissions",
  "Total Influenza Admissions",
  "Total RSV Admissions",
];

const NHSNOverviewGraph = ({ location }) => {
  const {
    setViewAndLocation,
    viewType: activeViewType,
    selectedLocation,
  } = useView();
  const resolvedLocation = location || "US";
  const isActive = activeViewType === "nhsnall";

  const { data, loading, error } = useAsyncData(
    () =>
      fetchJson(
        getDataPath(`nhsn/${resolvedLocation}_nhsn.json`),
        "Data not available",
      ),
    [resolvedLocation],
  );

  const { buildTraces, xRange } = useMemo(() => {
    if (!data?.series?.dates) {
      return { buildTraces: () => [], xRange: null };
    }

    const dates = data.series.dates;
    const lastDateStr = dates[dates.length - 1];
    const lastDate = new Date(lastDateStr);
    const twoMonthsAgo = new Date(lastDate);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const range = [twoMonthsAgo.toISOString().split("T")[0], lastDateStr];

    const tracesBuilder = (snapshot) =>
      DEFAULT_COLS.flatMap((col) => {
        const label = col.replace("Total ", "").replace(" Admissions", "");
        const officialY = snapshot.series?.[col];
        const preliminaryY = snapshot.preliminary_series?.[col];

        if (!officialY) return [];

        const traces = [
          {
            x: snapshot.series.dates,
            y: officialY,
            name: label,
            type: "scatter",
            mode: "lines",
            line: {
              color: getPathogenColor(detectPathogen(col)),
              width: 2,
            },
            legendgroup: label,
            hovertemplate: "%{y}<extra></extra>",
          },
        ];

        if (preliminaryY && snapshot.preliminary_series?.dates) {
          traces.push({
            x: snapshot.preliminary_series.dates,
            y: preliminaryY,
            name: `${label} (preliminary)`,
            type: "scatter",
            mode: "lines",
            line: {
              color: getPathogenColor(detectPathogen(col)),
              width: 2,
              dash: "dash",
            },
            legendgroup: label,
            hovertemplate: "%{y}<extra></extra>",
          });
        }

        return traces;
      });

    return { buildTraces: tracesBuilder, xRange: range };
  }, [data]);

  const { traces, layout } = useOverviewPlot({
    data,
    buildTraces,
    xRange,
    yPaddingTopRatio: 0.15,
    yPaddingBottomRatio: 0.05,
    yMinFloor: 0,
    layoutDefaults: {
      margin: { l: 45, r: 20, t: 10, b: 40 },
      showlegend: true,
      legend: {
        orientation: "h",
        y: -0.2,
        x: 0.5,
        xanchor: "center",
        font: { size: 9 },
      },
    },
  });

  const layoutWithFloor = useMemo(
    () => ({
      ...layout,
      yaxis: {
        ...layout.yaxis,
        fixedrange: true,
      },
    }),
    [layout],
  );

  const locationLabel =
    resolvedLocation === "US" ? "US national view" : resolvedLocation;
  const nhsnViewLocation =
    selectedLocation && selectedLocation !== "US_All" ? resolvedLocation : "US";

  return (
    <OverviewGraphCard
      title="NHSN data"
      subtitle="Weekly hospital admissions"
      loading={loading}
      loadingLabel="Loading CDC data..."
      error={error}
      errorLabel={`No NHSN data for ${resolvedLocation}`}
      traces={traces}
      layout={layoutWithFloor}
      emptyLabel={null}
      actionLabel={isActive ? "Viewing" : "View NHSN data"}
      actionActive={isActive}
      onAction={() => setViewAndLocation("nhsnall", nhsnViewLocation)}
      locationLabel={locationLabel}
    />
  );
};

export default NHSNOverviewGraph;
