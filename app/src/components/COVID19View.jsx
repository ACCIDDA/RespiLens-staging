import PropTypes from 'prop-types';
import ForecastView from './shared/ForecastView';

/**
 * COVID-19 forecast visualization component
 * Uses the shared ForecastView component for consistent visualization
 */
const COVID19View = (props) => {
  return <ForecastView {...props} />;
};

COVID19View.propTypes = {
  data: PropTypes.object,
  metadata: PropTypes.object,
  selectedDates: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedModels: PropTypes.arrayOf(PropTypes.string).isRequired,
  models: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedModels: PropTypes.func.isRequired,
  windowSize: PropTypes.object.isRequired,
  getDefaultRange: PropTypes.func.isRequired,
  selectedTarget: PropTypes.string,
};

export default COVID19View;
