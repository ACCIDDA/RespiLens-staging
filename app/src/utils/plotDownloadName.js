import { parseForecastUrlState } from "./forecastRoutes";

const DEFAULT_PREFIX = "respilens";
const MAX_FILENAME_LENGTH = 120;

const slugify = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const trimLength = (value, maxLength) => {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).replace(/-+$/g, "");
};

export const buildPlotDownloadName = (fallback = "plot") => {
  if (typeof window === "undefined" || !window.location) {
    return `${DEFAULT_PREFIX}-${fallback}`;
  }

  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);
  const { viewType, location } = parseForecastUrlState(pathname, params);

  const viewPart = viewType
    ? viewType.replace(/_/g, "-")
    : pathname.replace(/\/+$/g, "").replace(/^\/+/g, "") || "home";
  const locationPart = location ? location.toLowerCase() : "";

  const combined = [DEFAULT_PREFIX, viewPart, locationPart]
    .filter(Boolean)
    .join("-");
  return trimLength(slugify(combined), MAX_FILENAME_LENGTH);
};
