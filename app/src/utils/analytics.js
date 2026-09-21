const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// gtag is defined in index.html. It is absent when the measurement ID is not
// set (local dev) or an ad blocker stopped the script.
export const trackPageView = (params) => {
  if (!MEASUREMENT_ID || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", params);
};
