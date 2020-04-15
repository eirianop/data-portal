import { connect } from 'react-redux';
import Covid19Dashboard from '../Covid19Dashboard';

import { formatSeirData } from './dataUtils.js';

const dataUrl = 'https://opendata.datacommons.io/';

async function handleChartData(propName, data) {
  switch (propName) {
  case 'seirObserved':
  case 'seirSimulated':
    return formatSeirData(data);
  default:
    console.warn(`I don't know how to handle chart data for "${propName}"`); // eslint-disable-line no-console
    // return 'ERROR_FETCH_CHART_DATA';
  }
  return {};
}

const fetchChartData = (propName, filePath) => (
  // TODO refactor this probably. to handle errors better
  dispatch => fetch(dataUrl + filePath, dispatch)
    .then((r) => {
      switch (r.status) {
      case 200:
        return r.text();
      default:
        console.error(`Got code ${r.status} when fetching chart data at "${dataUrl + filePath}"`); // eslint-disable-line no-console
      }
      return '';
    })
    .catch(
      error => console.error(`Unable to fetch chart data at "${dataUrl + filePath}":`, error), // eslint-disable-line no-console
    )
    .then(data => handleChartData(propName, data))
    .then(obj =>
      // switch (obj) {
      // case 'ERROR_FETCH_CHART_DATA':
      //   return {
      //     type: 'ERROR_FETCH_CHART_DATA',
      //   };
      // default:
      ({
        type: 'RECEIVE_CHART_DATA',
        name: propName,
        contents: obj,
      }),
      // }
    )
    .then(msg => dispatch(msg))
);

const mapStateToProps = state => ({
  ...state.covid19Dashboard,
});

const mapDispatchToProps = dispatch => ({
  fetchChartData: (propName, filePath) => dispatch(fetchChartData(propName, filePath)),
});

const ReduxCovid19Dashboard = connect(mapStateToProps, mapDispatchToProps)(Covid19Dashboard);

export default ReduxCovid19Dashboard;
