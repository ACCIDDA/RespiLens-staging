# Implement SEO-friendly URL structure with path-based routing

## Summary

Implements SEO-friendly URLs by migrating from query parameter-based routing to path-based routing for view and location selection, while maintaining the existing SPA behavior (no page reloads).

### Before (Query Parameters)
```
/?location=CA&view=flu_projs
/?location=NY&view=covid_projs
```

### After (Path-based - SEO Friendly)
```
/forecasts/flu/california
/forecasts/covid/new-york
/forecasts/rsv/texas
```

### Hybrid Approach
Complex filters (dates, models, targets) remain as query parameters for usability:
```
/forecasts/flu/california?flu_dates=2024-01-01&flu_models=FluSight-ensemble
```

## Key Benefits

✅ **Better SEO** - Clean, descriptive URLs that search engines prefer
✅ **Bookmarkable** - Users can share direct links to specific states/views
✅ **No Page Reloads** - All navigation uses History API via React Router
✅ **Backward Compatible** - Old query-param URLs redirect automatically
✅ **Maintainable** - Clear separation between navigation (path) and filters (query)

## Technical Changes

### New Files
- **`app/src/utils/urlSlug.js`** - URL slug mapping utilities
  - Converts view values to slugs: `flu_projs` → `flu`, `fludetailed` → `flu-detailed`
  - Converts location codes to slugs: `CA` → `california`, `NY` → `new-york`
  - Provides bidirectional conversion functions

- **`app/src/components/LegacyUrlRedirect.jsx`** - Backward compatibility
  - Redirects old query-param URLs to new path-based format
  - Preserves filter query parameters during redirect

### Modified Files
- **`app/src/App.jsx`**
  - Updated routing to `/forecasts/:view/:location`
  - Root `/` redirects to default forecast page
  - Added legacy redirect route

- **`app/src/contexts/ViewContext.jsx`**
  - Uses `useParams()` to read view/location from path
  - Uses `navigate()` for location/view changes (no page reload)
  - Syncs path params to state when URL changes
  - Updated all navigation handlers to build new paths

- **`app/src/utils/urlManager.js`**
  - Simplified to only handle dataset-specific query params
  - Removed view/location query param management
  - Updated method signatures to accept `currentView` parameter

- **`app/src/components/layout/MainNavigation.jsx`**
  - Updated Forecasts button to recognize `/forecasts/*` paths

- **`app/src/components/narratives/SlideNarrativeViewer.jsx`**
  - Updated example URLs in embedded narrative to use new format

## How Navigation Works (No Page Reloads)

All navigation uses React Router's `navigate()` function, which leverages the browser's History API:

```javascript
// When user selects California
handleLocationSelect('CA') {
  const newPath = buildForecastPath(viewType, 'CA');
  // → /forecasts/flu/california

  const fullPath = `${newPath}?${queryString}`;
  navigate(fullPath, { replace: true }); // History API - no reload!
}
```

This provides instant navigation while maintaining SEO-friendly URLs.

## URL Examples

| Description | Old URL | New URL |
|-------------|---------|---------|
| COVID US | `/?view=covid_projs&location=US` | `/forecasts/covid/us` |
| Flu California | `/?view=flu_projs&location=CA` | `/forecasts/flu/california` |
| Flu Detailed NY | `/?view=fludetailed&location=NY` | `/forecasts/flu-detailed/new-york` |
| RSV Texas | `/?view=rsv_projs&location=TX` | `/forecasts/rsv/texas` |
| NHSN Florida | `/?view=nhsnall&location=FL` | `/forecasts/nhsn/florida` |

With filters:
```
/forecasts/flu/california?flu_dates=2024-01-01,2024-01-08&flu_models=FluSight-ensemble&flu_target=wk%20inc%20flu%20hosp
```

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Navigate between different locations - verify no page reload
- [ ] Navigate between different views - verify no page reload
- [ ] Change filters (dates, models) - verify query params update correctly
- [ ] Test old query-param URLs redirect to new format
- [ ] Verify browser back/forward buttons work correctly
- [ ] Test sharing URLs - verify they load correct state
- [ ] Check that narrative viewer links work

## Migration Notes

### For Users
- No action required - old URLs redirect automatically
- Bookmarks will continue to work via redirect

### For Developers
- `ViewContext` now uses path params for view/location
- `URLParameterManager` methods now require `currentView` parameter
- Use `buildForecastPath(view, location)` to construct forecast URLs
- Navigation components should use the new URL structure

## Breaking Changes

None - full backward compatibility maintained via redirect component.

## Related Issues

Addresses Google search algorithm preferences for clean URLs over query parameters.
