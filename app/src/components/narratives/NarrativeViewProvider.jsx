import { useMemo } from "react";
import { ViewContext } from "../../contexts/ViewContextObject";
import { DATASETS } from "../../config/datasets";

const noop = () => {};

const datasetForView = (viewType) =>
  Object.values(DATASETS).find((dataset) =>
    dataset.views.some((view) => view.value === viewType),
  ) || null;

const resolve = (updater, current) =>
  typeof updater === "function" ? updater(current) : updater;

const PEAK_TARGETS = ["peak inc flu hosp", "peak week inc flu hosp"];

/**
 * Lets a narrative embed the app's own chart (DataVisualizationContainer:
 * header, pickers, keyboard shortcuts, the view itself) without touching
 * the app's view state or URL. It answers useView() for everything inside
 * it from state the narrative owns:
 *
 * - `forecast`: a useForecastData result for `viewType`
 * - `location` / `onLocationChange`; `dates` / `onDatesChange` and
 *   `activeDate` / `onActiveDateChange`: the forecast dates shown, and
 *   `availableDates`: the dates offered (all of them by default)
 * - `view` / `onViewChange`: the target, models and display options
 *   ({ target, models, span, chartScale, intervalVisibility, showLegend,
 *   showOtherGroundTruthSeasons, showHistogram }), changed by a patch
 * - `spanModels`: MetroCast's ensemble for each span ({ "4wk", season }),
 *   swapped in for the other when the reader changes span
 * - `extras`: further fields views read from the context (showObservedPeak)
 */
const NarrativeViewProvider = ({
  viewType,
  forecast,
  location,
  onLocationChange,
  dates,
  onDatesChange,
  activeDate,
  onActiveDateChange,
  availableDates,
  view,
  onViewChange,
  spanModels,
  extras,
  children,
}) => {
  const value = useMemo(() => {
    const isPeak = viewType === "flu_peak";
    const peakDates = availableDates || forecast.availablePeakDates;
    const targets = isPeak
      ? []
      : (forecast.availableTargets || []).filter(
          (target) => !PEAK_TARGETS.includes(target),
        );
    return {
      selectedLocation: location,
      locationMessage: null,
      handleLocationSelect: onLocationChange,
      nsspCounty: null,
      data: forecast.data,
      metadata: forecast.metadata,
      loading: forecast.loading,
      error: forecast.error,
      availableDates: isPeak
        ? peakDates
        : availableDates || forecast.availableDates,
      models: isPeak
        ? forecast.availablePeakModels
        : forecast.modelsByTarget?.[view.target] || [],
      selectedModels: view.models,
      setSelectedModels: (updater) =>
        onViewChange({ models: resolve(updater, view.models) }),
      selectedDates: dates,
      setSelectedDates: (updater) => onDatesChange(resolve(updater, dates)),
      activeDate: activeDate || dates.at(-1) || null,
      setActiveDate: onActiveDateChange || noop,
      viewType,
      setViewType: noop,
      setViewAndLocation: noop,
      currentDataset: datasetForView(viewType),
      availableTargets: targets,
      selectedTarget: isPeak ? null : view.target,
      handleTargetSelect: (target) => target && onViewChange({ target }),
      peaks: forecast.peaks,
      availablePeakDates: peakDates,
      availablePeakModels: forecast.availablePeakModels,
      chartScale: view.chartScale,
      setChartScale: (chartScale) => onViewChange({ chartScale }),
      intervalVisibility: view.intervalVisibility,
      setIntervalVisibility: (intervalVisibility) =>
        onViewChange({ intervalVisibility }),
      showLegend: view.showLegend,
      setShowLegend: (showLegend) => onViewChange({ showLegend }),
      showOtherGroundTruthSeasons: view.showOtherGroundTruthSeasons,
      setShowOtherGroundTruthSeasons: (showOtherGroundTruthSeasons) =>
        onViewChange({ showOtherGroundTruthSeasons }),
      showHistogram: Boolean(view.showHistogram),
      setShowHistogram: (showHistogram) => onViewChange({ showHistogram }),
      metrocastSpan: view.span || "4wk",
      // As in the app, a plotted ensemble follows the span
      setMetrocastSpan: (span) => {
        const from = spanModels?.[view.span || "4wk"];
        const to = spanModels?.[span];
        const models =
          from && to && !view.models.includes(to)
            ? view.models.map((model) => (model === from ? to : model))
            : view.models;
        onViewChange({ span, models });
      },
      ...extras,
    };
  }, [
    viewType,
    forecast,
    location,
    onLocationChange,
    dates,
    onDatesChange,
    activeDate,
    onActiveDateChange,
    availableDates,
    view,
    onViewChange,
    spanModels,
    extras,
  ]);

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};

export default NarrativeViewProvider;
