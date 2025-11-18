// src/utils/urlSlug.js

import { DATASETS, APP_CONFIG } from '../config';

/**
 * URL Slug Utilities for SEO-friendly URLs
 *
 * Converts internal view/location values to URL-friendly slugs and vice versa
 * Example: flu_projs → flu, CA → california
 */

// ==================== VIEW SLUG MAPPINGS ====================

/**
 * Maps view values to URL slugs
 * Projections views use the dataset name (covid, flu, rsv)
 * Other views get suffixes (flu-detailed, nhsn-all)
 */
const VIEW_TO_SLUG = {
  'covid_projs': 'covid',
  'flu_projs': 'flu',
  'rsv_projs': 'rsv',
  'fludetailed': 'flu-detailed',
  'nhsnall': 'nhsn',
};

/**
 * Reverse mapping: URL slug to view value
 */
const SLUG_TO_VIEW = Object.entries(VIEW_TO_SLUG).reduce((acc, [view, slug]) => {
  acc[slug] = view;
  return acc;
}, {});

/**
 * Convert a view value to a URL slug
 * @param {string} viewValue - View value like 'flu_projs'
 * @returns {string} URL slug like 'flu'
 */
export function viewToSlug(viewValue) {
  return VIEW_TO_SLUG[viewValue] || viewValue;
}

/**
 * Convert a URL slug to a view value
 * @param {string} slug - URL slug like 'flu'
 * @returns {string|null} View value like 'flu_projs' or null if invalid
 */
export function slugToView(slug) {
  return SLUG_TO_VIEW[slug] || null;
}

/**
 * Get all valid view slugs
 * @returns {string[]} Array of valid view slugs
 */
export function getAllViewSlugs() {
  return Object.values(VIEW_TO_SLUG);
}

// ==================== LOCATION SLUG MAPPINGS ====================

/**
 * State/territory names mapped to their abbreviations
 * This will be used to generate slugs like 'california' from 'CA'
 */
const LOCATION_NAMES = {
  'US': 'us',
  'AL': 'alabama',
  'AK': 'alaska',
  'AZ': 'arizona',
  'AR': 'arkansas',
  'CA': 'california',
  'CO': 'colorado',
  'CT': 'connecticut',
  'DE': 'delaware',
  'DC': 'district-of-columbia',
  'FL': 'florida',
  'GA': 'georgia',
  'HI': 'hawaii',
  'ID': 'idaho',
  'IL': 'illinois',
  'IN': 'indiana',
  'IA': 'iowa',
  'KS': 'kansas',
  'KY': 'kentucky',
  'LA': 'louisiana',
  'ME': 'maine',
  'MD': 'maryland',
  'MA': 'massachusetts',
  'MI': 'michigan',
  'MN': 'minnesota',
  'MS': 'mississippi',
  'MO': 'missouri',
  'MT': 'montana',
  'NE': 'nebraska',
  'NV': 'nevada',
  'NH': 'new-hampshire',
  'NJ': 'new-jersey',
  'NM': 'new-mexico',
  'NY': 'new-york',
  'NC': 'north-carolina',
  'ND': 'north-dakota',
  'OH': 'ohio',
  'OK': 'oklahoma',
  'OR': 'oregon',
  'PA': 'pennsylvania',
  'PR': 'puerto-rico',
  'RI': 'rhode-island',
  'SC': 'south-carolina',
  'SD': 'south-dakota',
  'TN': 'tennessee',
  'TX': 'texas',
  'UT': 'utah',
  'VT': 'vermont',
  'VA': 'virginia',
  'VI': 'virgin-islands',
  'WA': 'washington',
  'WV': 'west-virginia',
  'WI': 'wisconsin',
  'WY': 'wyoming',
};

/**
 * Reverse mapping: location slug to abbreviation
 */
const LOCATION_SLUG_TO_ABBREV = Object.entries(LOCATION_NAMES).reduce((acc, [abbrev, slug]) => {
  acc[slug] = abbrev;
  return acc;
}, {});

/**
 * Convert a location abbreviation to a URL slug
 * @param {string} abbreviation - Location abbreviation like 'CA'
 * @returns {string} URL slug like 'california'
 */
export function locationToSlug(abbreviation) {
  return LOCATION_NAMES[abbreviation?.toUpperCase()] || abbreviation?.toLowerCase() || 'us';
}

/**
 * Convert a URL slug to a location abbreviation
 * @param {string} slug - URL slug like 'california'
 * @returns {string|null} Location abbreviation like 'CA' or null if invalid
 */
export function slugToLocation(slug) {
  return LOCATION_SLUG_TO_ABBREV[slug?.toLowerCase()] || null;
}

/**
 * Get all valid location slugs
 * @returns {string[]} Array of valid location slugs
 */
export function getAllLocationSlugs() {
  return Object.values(LOCATION_NAMES);
}

// ==================== URL CONSTRUCTION ====================

/**
 * Build a forecast URL path from view and location
 * @param {string} viewValue - View value like 'flu_projs'
 * @param {string} locationAbbrev - Location abbreviation like 'CA'
 * @returns {string} URL path like '/forecasts/flu/california'
 */
export function buildForecastPath(viewValue, locationAbbrev) {
  const viewSlug = viewToSlug(viewValue);
  const locationSlug = locationToSlug(locationAbbrev);
  return `/forecasts/${viewSlug}/${locationSlug}`;
}

/**
 * Parse a forecast URL path to extract view and location
 * @param {string} viewSlug - View slug from URL like 'flu'
 * @param {string} locationSlug - Location slug from URL like 'california'
 * @returns {{view: string|null, location: string|null}} Object with view value and location abbreviation
 */
export function parseForecastPath(viewSlug, locationSlug) {
  return {
    view: slugToView(viewSlug),
    location: slugToLocation(locationSlug)
  };
}

/**
 * Get the default forecast path
 * @returns {string} Default path like '/forecasts/covid/us'
 */
export function getDefaultForecastPath() {
  return buildForecastPath(APP_CONFIG.defaultView, APP_CONFIG.defaultLocation);
}
