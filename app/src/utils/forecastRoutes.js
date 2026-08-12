import { APP_CONFIG, DATASETS } from "../config";

const FORECAST_ROOT = "/forecasts";
const SURVEILLANCE_ROOT = "/surveillance";

const PATH_VIEW_CONFIG = {
  covid_forecasts: { pathogen: "covid" },
  flu_forecasts: { pathogen: "flu" },
  fludetailed: { pathogen: "flu", variant: "detailed" },
  flu_peak: { pathogen: "flu", variant: "peak" },
  rsv_forecasts: { pathogen: "rsv" },
  metrocast_forecasts: { pathogen: "flu", variant: "metrocast" },
  nhsnall: { section: "surveillance", source: "nhsn" },
  nsspall: { section: "surveillance", source: "nssp" },
};

const PATHOGEN_VARIANT_TO_VIEW = {
  covid: {
    default: "covid_forecasts",
  },
  flu: {
    default: "flu_forecasts",
    detailed: "fludetailed",
    peak: "flu_peak",
    metrocast: "metrocast_forecasts",
  },
  rsv: {
    default: "rsv_forecasts",
  },
  metrocast: {
    default: "metrocast_forecasts",
  },
};

const SURVEILLANCE_SOURCE_TO_VIEW = {
  nhsn: "nhsnall",
  nssp: "nsspall",
};

const RESERVED_VARIANTS = new Set(["detailed", "peak", "metrocast"]);

const sanitizeLocationSegment = (location) => {
  if (!location) {
    return null;
  }

  return String(location).trim();
};

export const isPathBasedForecastView = (viewType) =>
  Object.prototype.hasOwnProperty.call(PATH_VIEW_CONFIG, viewType);

export const isForecastPathname = (pathname = "") =>
  pathname === "/" ||
  pathname === FORECAST_ROOT ||
  pathname.startsWith(`${FORECAST_ROOT}/`) ||
  pathname === SURVEILLANCE_ROOT ||
  pathname.startsWith(`${SURVEILLANCE_ROOT}/`);

export const getDefaultLocationForView = (viewType) => {
  const dataset =
    Object.values(DATASETS).find((entry) =>
      entry.views.some((view) => view.value === viewType),
    ) || null;

  return dataset?.defaultLocation || APP_CONFIG.defaultLocation;
};

export const buildForecastPath = (viewType, location) => {
  if (!isPathBasedForecastView(viewType)) {
    return "/";
  }

  const config = PATH_VIEW_CONFIG[viewType];
  const defaultLocation = getDefaultLocationForView(viewType);

  if (config.section === "surveillance") {
    const segments = [SURVEILLANCE_ROOT, config.source];
    if (location && location !== defaultLocation) {
      segments.push(encodeURIComponent(location));
    }
    return segments.join("/");
  }

  const segments = [FORECAST_ROOT, config.pathogen];

  if (config.variant) {
    segments.push(config.variant);
  }

  if (location && location !== defaultLocation) {
    segments.push(encodeURIComponent(location));
  }

  return segments.join("/");
};

const parsePathBasedForecastState = (pathname) => {
  if (pathname.startsWith(SURVEILLANCE_ROOT)) {
    const trimmedPath = pathname.replace(/\/+$/g, "");
    const relativePath = trimmedPath
      .slice(SURVEILLANCE_ROOT.length)
      .replace(/^\/+/g, "");
    const segments = relativePath ? relativePath.split("/") : [];

    if (segments.length === 0) {
      return null;
    }

    const [source, locationSegment] = segments.map((segment) =>
      decodeURIComponent(segment),
    );
    const viewType = SURVEILLANCE_SOURCE_TO_VIEW[source];

    if (!viewType) {
      return null;
    }

    return {
      viewType,
      location:
        sanitizeLocationSegment(locationSegment) ||
        getDefaultLocationForView(viewType),
    };
  }

  const trimmedPath = pathname.replace(/\/+$/g, "");
  const relativePath = trimmedPath
    .slice(FORECAST_ROOT.length)
    .replace(/^\/+/g, "");
  const segments = relativePath ? relativePath.split("/") : [];

  if (segments.length === 0) {
    return null;
  }

  const [pathogen, secondSegment, thirdSegment] = segments.map((segment) =>
    decodeURIComponent(segment),
  );
  const pathogenConfig = PATHOGEN_VARIANT_TO_VIEW[pathogen];

  if (!pathogenConfig) {
    return null;
  }

  let viewType = pathogenConfig.default;
  let location = null;

  if (
    pathogen === "flu" &&
    secondSegment &&
    RESERVED_VARIANTS.has(secondSegment)
  ) {
    viewType = pathogenConfig[secondSegment] || pathogenConfig.default;
    location = sanitizeLocationSegment(thirdSegment);
  } else if (pathogen === "metrocast") {
    viewType = "metrocast_forecasts";
    location = sanitizeLocationSegment(secondSegment);
  } else if (secondSegment) {
    location = sanitizeLocationSegment(secondSegment);
  }

  return {
    viewType,
    location: location || getDefaultLocationForView(viewType),
  };
};

export const parseForecastUrlState = (pathname, searchParams) => {
  if (
    pathname &&
    (pathname.startsWith(FORECAST_ROOT) ||
      pathname.startsWith(SURVEILLANCE_ROOT))
  ) {
    const pathState = parsePathBasedForecastState(pathname);
    if (pathState) {
      return {
        ...pathState,
        source: "path",
      };
    }
  }

  const allViews = Object.values(DATASETS).flatMap((dataset) =>
    dataset.views.map((view) => view.value),
  );
  const queryView = searchParams.get("view");
  const viewType = allViews.includes(queryView)
    ? queryView
    : APP_CONFIG.defaultView;
  const location =
    searchParams.get("location") || getDefaultLocationForView(viewType);

  return {
    viewType,
    location,
    source: "query",
  };
};

export const buildForecastUrl = ({ viewType, location, searchParams }) => {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("view");
  nextParams.delete("location");

  if (viewType === "frontpage") {
    if (location && location !== APP_CONFIG.defaultLocation) {
      nextParams.set("location", location);
    }
    const search = nextParams.toString();
    return {
      pathname: "/",
      search: search ? `?${search}` : "",
    };
  }

  if (isPathBasedForecastView(viewType)) {
    const search = nextParams.toString();
    return {
      pathname: buildForecastPath(viewType, location),
      search: search ? `?${search}` : "",
    };
  }

  const defaultLocation = getDefaultLocationForView(viewType);
  nextParams.set("view", viewType);
  if (location && location !== defaultLocation) {
    nextParams.set("location", location);
  }
  const search = nextParams.toString();
  return {
    pathname: "/",
    search: search ? `?${search}` : "",
  };
};
