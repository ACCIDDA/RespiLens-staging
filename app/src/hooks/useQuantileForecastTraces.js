import { useMemo } from 'react';
import { MODEL_COLORS } from '../config/datasets';

const defaultFormatValue = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const buildDefaultModelHoverText = ({
  model,
  pointDate,
  formattedMedian,
  formatted50,
  formatted95,
  issuedDate,
  valueSuffix
}) => (
  `<b>${model}</b><br>` +
  `Date: ${pointDate}<br>` +
  `Median: <b>${formattedMedian}${valueSuffix}</b><br>` +
  `50% CI: [${formatted50}${valueSuffix}]<br>` +
  `95% CI: [${formatted95}${valueSuffix}]<br>` +
  `<span style="color: rgba(255,255,255,0.8); font-size: 0.8em">predicted as of ${issuedDate}</span>` +
  `<extra></extra>`
);

const resolveModelColor = (selectedModels, model) => {
  const index = selectedModels.indexOf(model);
  return MODEL_COLORS[index % MODEL_COLORS.length];
};

const useQuantileForecastTraces = ({
  groundTruth,
  forecasts,
  selectedDates,
  selectedModels,
  target,
  groundTruthLabel = 'Observed',
  groundTruthValueFormat = '%{y}',
  valueSuffix = '',
  formatValue = defaultFormatValue,
  modelHoverBuilder = null,
  modelColorFn = null,
  modelLineWidth = 2,
  modelMarkerSize = 6,
  groundTruthLineWidth = 2,
  groundTruthMarkerSize = 4,
  showLegendForFirstDate = true,
  fillMissingQuantiles = false
}) => useMemo(() => {
  if (!groundTruth || !forecasts || selectedDates.length === 0 || !target) {
    return [];
  }

  const groundTruthValues = groundTruth[target];
  if (!groundTruthValues) {
    console.warn(`Ground truth data not found for target: ${target}`);
    return [];
  }

  const groundTruthTrace = {
    x: groundTruth.dates || [],
    y: groundTruthValues,
    name: groundTruthLabel,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: 'black', width: groundTruthLineWidth, dash: 'dash' },
    marker: { size: groundTruthMarkerSize, color: 'black' },
    hovertemplate: `<b>${groundTruthLabel}</b><br>Date: %{x}<br>Value: <b>${groundTruthValueFormat}${valueSuffix}</b><extra></extra>`
  };

  const modelTraces = selectedModels.flatMap(model =>
    selectedDates.flatMap((date, dateIndex) => {
      const forecastsForDate = forecasts[date] || {};
      const forecast = forecastsForDate[target]?.[model];
      if (!forecast || forecast.type !== 'quantile') return [];

      const forecastDates = [];
      const medianValues = [];
      const ci95Upper = [];
      const ci95Lower = [];
      const ci50Upper = [];
      const ci50Lower = [];
      const hoverTexts = [];

      const sortedPredictions = Object.values(forecast.predictions || {}).sort((a, b) => new Date(a.date) - new Date(b.date));

      sortedPredictions.forEach((pred) => {
        const pointDate = pred.date;
        const { quantiles = [], values = [] } = pred;

        const findValue = (q) => {
          const index = quantiles.indexOf(q);
          return index !== -1 ? values[index] : null;
        };

        const val_50 = findValue(0.5);
        if (val_50 === null || val_50 === undefined) {
          return;
        }

        const val_025 = findValue(0.025);
        const val_25 = findValue(0.25);
        const val_75 = findValue(0.75);
        const val_975 = findValue(0.975);

        const resolved025 = val_025 ?? (fillMissingQuantiles ? val_50 : null);
        const resolved25 = val_25 ?? (fillMissingQuantiles ? val_50 : null);
        const resolved75 = val_75 ?? (fillMissingQuantiles ? val_50 : null);
        const resolved975 = val_975 ?? (fillMissingQuantiles ? val_50 : null);

        if (resolved025 === null || resolved25 === null || resolved75 === null || resolved975 === null) {
          return;
        }

        forecastDates.push(pointDate);
        ci95Lower.push(resolved025);
        ci50Lower.push(resolved25);
        medianValues.push(val_50);
        ci50Upper.push(resolved75);
        ci95Upper.push(resolved975);

        const formattedMedian = formatValue(val_50);
        const formatted50 = `${formatValue(resolved25)} - ${formatValue(resolved75)}`;
        const formatted95 = `${formatValue(resolved025)} - ${formatValue(resolved975)}`;

        const hoverText = modelHoverBuilder
          ? modelHoverBuilder({
            model,
            pointDate,
            formattedMedian,
            formatted50,
            formatted95,
            issuedDate: date,
            valueSuffix
          })
          : buildDefaultModelHoverText({
            model,
            pointDate,
            formattedMedian,
            formatted50,
            formatted95,
            issuedDate: date,
            valueSuffix
          });

        hoverTexts.push(hoverText);
      });

      if (forecastDates.length === 0) return [];

      const modelColor = modelColorFn
        ? modelColorFn(model, selectedModels)
        : resolveModelColor(selectedModels, model);
      const isFirstDate = dateIndex === 0;

      return [
        { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci95Upper, ...ci95Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}10`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 95% CI`, hoverinfo: 'none', legendgroup: model },
        { x: [...forecastDates, ...forecastDates.slice().reverse()], y: [...ci50Upper, ...ci50Lower.slice().reverse()], fill: 'toself', fillcolor: `${modelColor}30`, line: { color: 'transparent' }, showlegend: false, type: 'scatter', name: `${model} 50% CI`, hoverinfo: 'none', legendgroup: model },
        {
          x: forecastDates,
          y: medianValues,
          name: model,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: modelColor, width: modelLineWidth, dash: 'solid' },
          marker: { size: modelMarkerSize, color: modelColor },
          showlegend: showLegendForFirstDate ? isFirstDate : false,
          legendgroup: model,
          text: hoverTexts,
          hovertemplate: '%{text}',
          hoverlabel: {
            bgcolor: modelColor,
            font: { color: '#ffffff' },
            bordercolor: '#ffffff'
          }
        }
      ];
    })
  );

  return [groundTruthTrace, ...modelTraces];
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
  fillMissingQuantiles
]);

export default useQuantileForecastTraces;
