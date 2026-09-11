export const NSSP_MAP_HEIGHTS = {
  usa: 620,
  state: 640,
};

export const NSSP_MAP_COLORS = {
  base: "#d9e4f5",
  active: "#8bb6ff",
  selected: "#245bdb",
  outline: "#355070",
  hover: "#5f8fda",
  fallback: "#edf3fb",
  unavailable: "#d7d7db",
};

export const getNsspUsFeatureCallout = (feature) =>
  feature.properties?.STUSAB === "DC"
    ? {
        label: "DC",
        offset: [58, 28],
      }
    : null;
