const SEASON_START_MONTH_INDEX = 8;
const SEASON_START_DAY = 1;

const HUB_SEASON_START_BY_VIEW = {
  flu_forecasts: "2022-09-01",
  fludetailed: "2022-09-01",
  rsv_forecasts: "2022-09-01",
  covid_forecasts: "2022-09-01",
  metrocast_forecasts: "2022-09-01",
};

const padNumber = (value) => String(value).padStart(2, "0");

const toUtcDate = (dateString) => {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const getHubSeasonStartDate = (viewType) =>
  HUB_SEASON_START_BY_VIEW[viewType] || null;

export const getSeasonStartYear = (dateString) => {
  const date = toUtcDate(dateString);
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= SEASON_START_MONTH_INDEX ? year : year - 1;
};

export const getSeasonKeyFromStartYear = (seasonStartYear) =>
  `${seasonStartYear}-${seasonStartYear + 1}`;

export const getSeasonDateRange = (seasonStartYear) => ({
  start: `${seasonStartYear}-${padNumber(SEASON_START_MONTH_INDEX + 1)}-${padNumber(SEASON_START_DAY)}`,
  end: `${seasonStartYear + 1}-${padNumber(SEASON_START_MONTH_INDEX + 1)}-${padNumber(SEASON_START_DAY)}`,
});

export const alignDateToSeason = (dateString, anchorSeasonStartYear) => {
  const date = toUtcDate(dateString);
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const alignedYear =
    month >= SEASON_START_MONTH_INDEX
      ? anchorSeasonStartYear
      : anchorSeasonStartYear + 1;

  return new Date(Date.UTC(alignedYear, month, day)).toISOString().slice(0, 10);
};

export const buildHistoricalGroundTruthTraces = ({
  groundTruth,
  target,
  viewType,
  transformY,
  groundTruthLineWidth = 1.5,
  groundTruthHoverFormatter = null,
  valueSuffix = "",
}) => {
  const hubSeasonStartDate = getHubSeasonStartDate(viewType);
  const groundTruthDates = groundTruth?.dates || [];
  const groundTruthValues = groundTruth?.[target] || [];

  if (
    !hubSeasonStartDate ||
    !groundTruthDates.length ||
    !groundTruthValues.length
  ) {
    return [];
  }

  const seasons = new Map();

  groundTruthDates.forEach((dateString, index) => {
    if (dateString < hubSeasonStartDate) {
      return;
    }

    const value = groundTruthValues[index];
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return;
    }

    const seasonStartYear = getSeasonStartYear(dateString);
    if (!seasons.has(seasonStartYear)) {
      seasons.set(seasonStartYear, []);
    }

    seasons.get(seasonStartYear).push({
      actualDate: dateString,
      value,
    });
  });

  const seasonStartYears = Array.from(seasons.keys()).sort((a, b) => a - b);
  if (seasonStartYears.length <= 1) {
    return [];
  }

  const traces = [];
  let showLegend = true;

  seasonStartYears.forEach((anchorSeasonStartYear) => {
    seasonStartYears.forEach((sourceSeasonStartYear) => {
      if (anchorSeasonStartYear === sourceSeasonStartYear) {
        return;
      }

      const sourcePoints = seasons.get(sourceSeasonStartYear) || [];
      const rawY = sourcePoints.map((point) => point.value);

      traces.push({
        x: sourcePoints.map((point) =>
          alignDateToSeason(point.actualDate, anchorSeasonStartYear),
        ),
        y: transformY ? rawY.map((value) => transformY(value)) : rawY,
        type: "scatter",
        mode: "lines",
        name: "Historical Seasons",
        legendgroup: "historical-ground-truth",
        showlegend: showLegend,
        line: {
          color: "#d3d3d3",
          width: groundTruthLineWidth,
        },
        customdata: sourcePoints.map((point, index) => [
          point.actualDate,
          getSeasonKeyFromStartYear(sourceSeasonStartYear),
          groundTruthHoverFormatter
            ? groundTruthHoverFormatter(rawY[index])
            : rawY[index],
        ]),
        hovertemplate:
          "<b>Historical season</b><br>" +
          "Source season: %{customdata[1]}<br>" +
          "Original date: %{customdata[0]}<br>" +
          `Value: <b>%{customdata[2]}${valueSuffix}</b><extra></extra>`,
      });

      showLegend = false;
    });
  });

  return traces;
};
