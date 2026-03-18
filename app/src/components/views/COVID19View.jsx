import ForecastPlotView from "../ForecastPlotView";

const COVID19View = (props) => (
  <ForecastPlotView {...props} groundTruthValueFormat="%{y}" />
);

export default COVID19View;
