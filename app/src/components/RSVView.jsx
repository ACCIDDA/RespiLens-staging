import PropTypes from 'prop-types';
import ForecastView from './shared/ForecastView';

/**
 * RSV forecast visualization component
 * Uses the shared ForecastView component for consistent visualization
 */
const RSVView = (props) => {
  return <ForecastView {...props} />;
};

RSVView.propTypes = {
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

export default RSVView;
