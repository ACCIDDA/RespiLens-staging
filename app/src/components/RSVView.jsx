import ForecastPlotView from './ForecastPlotView';

const RSVView = (props) => (
  <ForecastPlotView
    {...props}
    groundTruthValueFormat="%{y:.2f}"
  />
);

export default RSVView;
