// Plotly reports x-range changes in several shapes: a full "xaxis.range"
// (drag, range slider), separate ends (the 1m/6m range buttons), or
// "xaxis.autorange" (the "all" button). Normalise them to [start, end] so
// views can refit the y-axis to whatever window is shown.
export const getRelayoutXRange = (event, traces) => {
  if (!event) return null;
  if (Array.isArray(event["xaxis.range"])) return event["xaxis.range"];

  const start = event["xaxis.range[0]"];
  const end = event["xaxis.range[1]"];
  if (start !== undefined && end !== undefined) return [start, end];

  if (event["xaxis.autorange"]) return getTracesXExtent(traces);
  return null;
};

// Earliest and latest x (dates) across all traces
export const getTracesXExtent = (traces) => {
  let min = null;
  let max = null;
  traces?.forEach((trace) => {
    trace?.x?.forEach((x) => {
      if (x === null || x === undefined) return;
      const time = new Date(x).getTime();
      if (Number.isNaN(time)) return;
      if (min === null || time < min) min = time;
      if (max === null || time > max) max = time;
    });
  });
  if (min === null) return null;
  return [
    new Date(min).toISOString().slice(0, 10),
    new Date(max).toISOString().slice(0, 10),
  ];
};

// Plotly writes relayout values into the layout arrays it is given; pass it a
// copy so React state keeps the previous range and change checks still work.
export const copyRange = (range) => (range ? [...range] : range);
