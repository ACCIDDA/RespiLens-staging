import { useMemo } from "react";
import { MODEL_COLORS } from "../config/datasets";

const defaultFormatValue = (value) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const DEFAULT_INTERVAL_DEFINITIONS = [
  {
    key: "ci50",
    label: "50% interval",
    lowerQuantile: 0.25,
    upperQuantile: 0.75,
  },
  {
    key: "ci95",
    label: "95% interval",
    lowerQuantile: 0.025,
    upperQuantile: 0.975,
  },
];

const buildDefaultModelHoverText = ({
  model,
  pointDate,
  formattedMedian,
  formattedIntervals,
  issuedDate,
  valueSuffix,
  showMedian,
}) => {
  const rows = [`<b>${model}</b><br>Date: ${pointDate}<br>`];

  if (showMedian && formattedMedian !== null) {
    rows.push(`Median: <b>${formattedMedian}${valueSuffix}</b><br>`);
  }

  formattedIntervals.forEach((interval) => {
    rows.push(
      `${interval.label}: [${interval.formattedRange}${valueSuffix}]<br>`,
    );
  });

  rows.push(
    `<span style="color: rgba(255,255,255,0.8); font-size: 0.8em">predicted as of ${issuedDate}</span>` +
      `<extra></extra>`,
  );

  return rows.join("");
};

const resolveModelColor = (selectedModels, model) => {
  const index = selectedModels.indexOf(model);
  return MODEL_COLORS[index % MODEL_COLORS.length];
};

const findQuantileValue = (quantiles, values, requestedQuantile) => {
  const index = quantiles.findIndex(
    (quantile) => Number(quantile) === requestedQuantile,
  );
  return index !== -1 ? values[index] : null;
};

const buildIntervalFillColor = (modelColor, intervalIndex, intervalCount) => {
  const alphaStart = 0.1;
  const alphaEnd = 0.34;
  const denominator = Math.max(1, intervalCount - 1);
  const alpha =
    intervalCount === 1
      ? alphaEnd
      : alphaStart + ((alphaEnd - alphaStart) * intervalIndex) / denominator;
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${modelColor}${alphaHex}`;
};

const useQuantileForecastTraces = ({
  groundTruth,
  forecasts,
  selectedDates,
  selectedModels,
  target,
  groundTruthLabel = "Observed",
  groundTruthValueFormat = "%{y}",
  valueSuffix = "",
  formatValue = defaultFormatValue,
  modelHoverBuilder = null,
  modelColorFn = null,
  modelLineWidth = 2,
  modelMarkerSize = 6,
  groundTruthLineWidth = 2,
  groundTruthMarkerSize = 4,
  showLegendForFirstDate = true,
  fillMissingQuantiles = false,
  showMedian = true,
  show50 = true,
  show95 = true,
  intervalDefinitions = null,
  intervalVisibility = null,
  transformY = null,
  groundTruthHoverFormatter = null,
}) =>
  useMemo(() => {
    if (!groundTruth || !forecasts || selectedDates.length === 0 || !target) {
      return { traces: [], rawYRange: null };
    }

    const groundTruthValues = groundTruth[target];
    if (!groundTruthValues) {
      console.warn(`Ground truth data not found for target: ${target}`);
      return { traces: [], rawYRange: null };
    }

    let rawMin = Infinity;
    let rawMax = -Infinity;
    const updateRange = (value) => {
      if (value === null || value === undefined) return;
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      rawMin = Math.min(rawMin, numeric);
      rawMax = Math.max(rawMax, numeric);
    };

    groundTruthValues.forEach((value) => updateRange(value));

    const groundTruthY = transformY
      ? groundTruthValues.map((value) => transformY(value))
      : groundTruthValues;

    const groundTruthTrace = {
      x: groundTruth.dates || [],
      y: groundTruthY,
      name: groundTruthLabel,
      type: "scatter",
      mode: showMedian ? "lines+markers" : "lines",
      line: { color: "black", width: groundTruthLineWidth, dash: "dash" },
      marker: { size: groundTruthMarkerSize, color: "black" },
    };

    if (groundTruthHoverFormatter) {
      groundTruthTrace.text = groundTruthValues.map((value) =>
        groundTruthHoverFormatter(value),
      );
      groundTruthTrace.hovertemplate = `<b>${groundTruthLabel}</b><br>Date: %{x}<br>Value: <b>%{text}${valueSuffix}</b><extra></extra>`;
    } else {
      groundTruthTrace.hovertemplate = `<b>${groundTruthLabel}</b><br>Date: %{x}<br>Value: <b>${groundTruthValueFormat}${valueSuffix}</b><extra></extra>`;
    }

    const modelTraces = selectedModels.flatMap((model) =>
      selectedDates.flatMap((date, dateIndex) => {
        const forecastsForDate = forecasts[date] || {};
        const forecast = forecastsForDate[target]?.[model];
        if (!forecast || forecast.type !== "quantile") return [];

        const forecastDates = [];
        const medianValues = [];
        const hoverTexts = [];
        const resolvedIntervalDefinitions =
          intervalDefinitions ??
          DEFAULT_INTERVAL_DEFINITIONS.filter((definition) => {
            if (definition.key === "ci50") return show50;
            if (definition.key === "ci95") return show95;
            return true;
          });
        const activeIntervalDefinitions = resolvedIntervalDefinitions.filter(
          (definition) =>
            intervalVisibility?.[definition.key] ??
            (definition.key === "ci50"
              ? show50
              : definition.key === "ci95"
                ? show95
                : true),
        );
        const intervalSeries = Object.fromEntries(
          activeIntervalDefinitions.map((definition) => [
            definition.key,
            {
              definition,
              dates: [],
              lower: [],
              upper: [],
            },
          ]),
        );

        const sortedPredictions = Object.values(
          forecast.predictions || {},
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedPredictions.forEach((pred) => {
          const pointDate = pred.date;
          const { quantiles = [], values = [] } = pred;
          const normalizedQuantiles = quantiles.map((quantile) =>
            Number(quantile),
          );
          const val_50 = findQuantileValue(normalizedQuantiles, values, 0.5);
          const resolvedMedian =
            val_50 === null || val_50 === undefined ? null : val_50;
          const formattedIntervals = [];

          activeIntervalDefinitions.forEach((definition) => {
            const lowerValue = findQuantileValue(
              normalizedQuantiles,
              values,
              definition.lowerQuantile,
            );
            const upperValue = findQuantileValue(
              normalizedQuantiles,
              values,
              definition.upperQuantile,
            );
            const resolvedLower =
              lowerValue ?? (fillMissingQuantiles ? resolvedMedian : null);
            const resolvedUpper =
              upperValue ?? (fillMissingQuantiles ? resolvedMedian : null);

            if (
              resolvedLower === null ||
              resolvedUpper === null ||
              resolvedLower === undefined ||
              resolvedUpper === undefined
            ) {
              return;
            }

            intervalSeries[definition.key].dates.push(pointDate);
            intervalSeries[definition.key].lower.push(
              transformY ? transformY(resolvedLower) : resolvedLower,
            );
            intervalSeries[definition.key].upper.push(
              transformY ? transformY(resolvedUpper) : resolvedUpper,
            );
            updateRange(resolvedLower);
            updateRange(resolvedUpper);
            formattedIntervals.push({
              label: definition.label,
              formattedRange: `${formatValue(resolvedLower)} - ${formatValue(resolvedUpper)}`,
            });
          });

          if (resolvedMedian === null && formattedIntervals.length === 0) {
            return;
          }

          if (resolvedMedian !== null) {
            forecastDates.push(pointDate);
            if (showMedian) {
              medianValues.push(
                transformY ? transformY(resolvedMedian) : resolvedMedian,
              );
              updateRange(resolvedMedian);
            }
          }

          const formattedMedian =
            resolvedMedian === null ? null : formatValue(resolvedMedian);

          const hoverText = modelHoverBuilder
            ? modelHoverBuilder({
                model,
                pointDate,
                formattedMedian,
                formattedIntervals,
                issuedDate: date,
                valueSuffix,
              })
            : buildDefaultModelHoverText({
                model,
                pointDate,
                formattedMedian,
                formattedIntervals,
                issuedDate: date,
                valueSuffix,
                showMedian,
              });

          if (resolvedMedian !== null) {
            hoverTexts.push(hoverText);
          }
        });

        const hasIntervalSeries = Object.values(intervalSeries).some(
          (series) => series.dates.length > 0,
        );
        if (forecastDates.length === 0 && !hasIntervalSeries) return [];

        const modelColor = modelColorFn
          ? modelColorFn(model, selectedModels)
          : resolveModelColor(selectedModels, model);
        const isFirstDate = dateIndex === 0;

        const traces = [];

        activeIntervalDefinitions.forEach((definition, intervalIndex) => {
          const series = intervalSeries[definition.key];
          if (!series || series.dates.length === 0) {
            return;
          }
          traces.push({
            x: [...series.dates, ...series.dates.slice().reverse()],
            y: [...series.upper, ...series.lower.slice().reverse()],
            fill: "toself",
            fillcolor: buildIntervalFillColor(
              modelColor,
              intervalIndex,
              activeIntervalDefinitions.length,
            ),
            line: { color: "transparent" },
            showlegend: false,
            type: "scatter",
            name: `${model} ${definition.label}`,
            hoverinfo: "none",
            legendgroup: model,
          });
        });

        if (showMedian && forecastDates.length > 0) {
          traces.push({
            x: forecastDates,
            y: medianValues,
            name: model,
            type: "scatter",
            mode: "lines+markers",
            line: { color: modelColor, width: modelLineWidth, dash: "solid" },
            marker: { size: modelMarkerSize, color: modelColor },
            showlegend: showLegendForFirstDate ? isFirstDate : false,
            legendgroup: model,
            text: hoverTexts,
            hovertemplate: "%{text}",
            hoverlabel: {
              bgcolor: modelColor,
              font: { color: "#ffffff" },
              bordercolor: "#ffffff",
            },
          });
        }

        if (
          (showMedian && forecastDates.length === 0 && hasIntervalSeries) ||
          (!showMedian && hasIntervalSeries)
        ) {
          traces.push({
            x: [null],
            y: [null],
            name: model,
            type: "scatter",
            mode: "lines",
            line: { color: modelColor, width: modelLineWidth },
            showlegend: showLegendForFirstDate ? isFirstDate : false,
            legendgroup: model,
            hoverinfo: "skip",
          });
        }

        return traces;
      }),
    );

    const rawYRange =
      rawMin === Infinity || rawMax === -Infinity ? null : [rawMin, rawMax];

    return { traces: [groundTruthTrace, ...modelTraces], rawYRange };
  }, [
    groundTruth,
    forecasts,
    selectedDates,
    selectedModels,
    target,
    groundTruthLabel,
    groundTruthValueFormat,
    valueSuffix,
    formatValue,
    modelHoverBuilder,
    modelColorFn,
    modelLineWidth,
    modelMarkerSize,
    groundTruthLineWidth,
    groundTruthMarkerSize,
    showLegendForFirstDate,
    fillMissingQuantiles,
    showMedian,
    show50,
    show95,
    intervalDefinitions,
    intervalVisibility,
    transformY,
    groundTruthHoverFormatter,
  ]);

export default useQuantileForecastTraces;
