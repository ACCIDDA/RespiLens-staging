// src/components/LegacyUrlRedirect.jsx

import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { buildForecastPath, getDefaultForecastPath } from '../utils/urlSlug';
import { APP_CONFIG } from '../config';

/**
 * Redirects legacy query-param URLs to new SEO-friendly path-based URLs
 *
 * Examples:
 *   /?view=flu_projs&location=CA → /forecasts/flu/california
 *   /?location=TX → /forecasts/covid/texas (uses default view)
 *   / → /forecasts/covid/us (default)
 */
const LegacyUrlRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get view and location from query params
    const viewParam = searchParams.get('view');
    const locationParam = searchParams.get('location');

    // Determine view and location to use
    const view = viewParam || APP_CONFIG.defaultView;
    const location = locationParam || APP_CONFIG.defaultLocation;

    // Build new path
    const newPath = buildForecastPath(view, location);

    // Preserve other query params (dates, models, targets)
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('view');
    newParams.delete('location');

    // Navigate to new URL structure
    const queryString = newParams.toString();
    const fullPath = queryString ? `${newPath}?${queryString}` : newPath;

    console.log('Redirecting legacy URL to:', fullPath);
    navigate(fullPath, { replace: true });
  }, [searchParams, navigate]);

  return null; // This component just handles the redirect
};

export default LegacyUrlRedirect;
