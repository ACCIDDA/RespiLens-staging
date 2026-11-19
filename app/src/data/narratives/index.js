// Every published narrative, newest first. Add a narrative by giving it a
// folder like intro-to-forecasting/ (its slides in index.js, beside any
// data snapshot it reads) and listing it here.
import introToForecasting from "./intro-to-forecasting/index.js";

export const narratives = [introToForecasting].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export const getNarrative = (id) =>
  narratives.find((narrative) => narrative.id === id) || null;

export default narratives;
