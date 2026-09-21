import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../utils/analytics";
import {
  isForecastPathname,
  parseForecastUrlState,
} from "../utils/forecastRoutes";

// A page sets its <title> (through Helmet) some time after the route
// changes, so the page_view waits for it. Pages that keep the previous title
// never trigger a change, hence the fallback.
const TITLE_SETTLE_MS = 50;
const TITLE_FALLBACK_MS = 1000;

/**
 * Sends a GA4 page_view for each page the reader actually moves to. index.html
 * turns off gtag's automatic page_view, so this is the only source.
 *
 * Fires on the path alone, not on the query string: picking a date or model
 * rewrites the URL with replace, and that is not a new page.
 */
const AnalyticsTracker = () => {
  const { pathname } = useLocation();
  const previousUrl = useRef(null);

  useEffect(() => {
    let timer;
    let sent = false;

    const send = () => {
      if (sent) return;
      sent = true;
      observer.disconnect();

      const params = {
        page_location: window.location.href,
        page_title: document.title,
      };

      if (previousUrl.current) {
        params.page_referrer = previousUrl.current;
      }

      // Which view and place, for reports that group by them
      if (isForecastPathname(pathname)) {
        const { viewType, location } = parseForecastUrlState(pathname);
        params.view_type = viewType;
        params.forecast_location = location;
      }

      trackPageView(params);
      previousUrl.current = window.location.href;
    };

    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(send, TITLE_SETTLE_MS);
    });
    observer.observe(document.querySelector("title"), {
      childList: true,
      characterData: true,
      subtree: true,
    });
    timer = setTimeout(send, TITLE_FALLBACK_MS);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
};

export default AnalyticsTracker;
