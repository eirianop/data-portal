import React from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import 'react-tabs/style/react-tabs.less';

import { mapboxAPIToken } from '../localconf';
import Popup from '../components/Popup';
import WorldMapChart from './WorldMapChart';
import IllinoisMapChart from './IllinoisMapChart';
import CountWidget from './CountWidget';
import PlotChart from './PlotChart';
import './Covid19Dashboard.less';


// |-----------------------------------|
// | Data Commons logo, title, buttons |
// |-----------------------------------|
// | World Tab | IL Tab |              |
// |-----------------------------------|
// |   # of cases   |   # of deaths    |
// |-----------------------------------|
// |                         |  Chart  |
// |                         |         |
// |           Map           |---------|
// |                         |  Chart  |
// |                         |         |
// |-----------------------------------|
//
// Config:
// "covid19DashboardConfig": {
//   "dataUrl": "",
//   "enableCharts": true/false
// },


/* To fetch new data:
- add the prop name and location to `dashboardDataLocations`;
- add the prop to Covid19Dashboard.propTypes;
- add it to ReduxCovid19Dashboard.handleDashboardData().
*/
const dashboardDataLocations = {
  jhuGeojsonLatest: 'map_data/jhu_geojson_latest.json',
  jhuJsonByLevelLatest: 'map_data/jhu_json_by_level_latest.json',
  seirObserved: 'observed_cases.txt',
  seirSimulated: 'simulated_cases.txt',
  top10: 'top10.txt',
  idphDaily: 'idph_daily.txt',
};

const monthNames = [
  'Jan', 'Feb', 'Mar',
  'April', 'May', 'Jun',
  'Jul', 'Aug', 'Sept',
  'Oct', 'Nov', 'Dec',
];

class Covid19Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.enableCharts = !!props.config.enableCharts;
  }

  componentDidMount() {
    if (!mapboxAPIToken) {
      console.warn('MAPBOX_API_TOKEN environment variable not set, will be unable to load maps.'); // eslint-disable-line no-console
    }

    Object.entries(dashboardDataLocations).forEach(
      e => this.props.fetchDashboardData(e[0], e[1]),
    );
  }

  getTotalCounts() {
    // find latest date we have in the data
    const confirmedCount = {
      global: 0,
      illinois: 0,
    };
    const deathsCount = {
      global: 0,
      illinois: 0,
    };
    const recoveredCount = {
      global: 0,
      illinois: 0,
    };

    this.props.jhuGeojsonLatest.features.forEach((feat) => {
      const confirmed = +feat.properties.confirmed;
      const deaths = +feat.properties.deaths;
      const recovered = +feat.properties.recovered;
      if (confirmed) {
        confirmedCount.global += confirmed;
        if (feat.properties.province_state === 'Illinois') {
          confirmedCount.illinois += confirmed;
        }
      }
      if (deaths) {
        deathsCount.global += deaths;
        if (feat.properties.province_state === 'Illinois') {
          deathsCount.illinois += deaths;
        }
      }
      if (recovered) {
        recoveredCount.global += recovered;
        if (feat.properties.province_state === 'Illinois') {
          recoveredCount.illinois += recovered;
        }
      }
    });

    return { confirmedCount, deathsCount, recoveredCount };
  }

  getPlotChartsConfig() {
    const displaySeirPlot = Object.keys(this.props.seirObserved).length > 0
      && Object.keys(this.props.seirSimulated).length > 0;
    const seirPlotChart = [
      {
        data: this.props.seirObserved,
        name: 'Observed Cases',
      },
      {
        data: this.props.seirSimulated,
        name: 'Simulated Cases',
      },
    ];
    const seirChart = displaySeirPlot ? (<PlotChart
      title='Forecasting COVID-19 cases with a SEIR model'
      xTitle='Date'
      yTitle='Population'
      description='The simulated cases (blue curve) generated by the SEIR model is consistent with the observed cases (orange curve). The orange curve also shows the forecasted cases for 14 days.'
      plots={seirPlotChart}
    />) : null;

    const displayTop10Plot = Object.keys(this.props.top10).length > 0;
    const top10ChartPlots = Object.entries(this.props.top10).map(([key, value]) => ({
      data: value,
      name: key,
    }),
    );
    const top10Chart = displayTop10Plot ? (<PlotChart
      title='Daily Confirmed Cases (5-day Moving Average)'
      xTitle='Date'
      yTitle='Confirmed New Cases'
      description=''
      plots={top10ChartPlots}
    />) : null;

    const displayIdphDailyChart = Object.keys(this.props.idphDaily).length > 0;
    const idphDailyChartPlots = Object.entries(this.props.idphDaily).map(([key, value]) => ({
      data: value,
      name: key,
    }),
    );
    const idphDailyChart = displayIdphDailyChart ? (<PlotChart
      title='Breakdown of Tests, Cases and Deaths in Illinois Over Time'
      xTitle='Date'
      yTitle='# of Tests/Cases/Deaths'
      description=''
      plots={idphDailyChartPlots}
    />) : null;

    return { seirChart, top10Chart, idphDailyChart };
  }

  formatSelectedLocationData = () => {
    const title = this.props.selectedLocationData.title;
    let max = 0;
    let sortedData = Object.keys(this.props.selectedLocationData.data).map((date) => {
      const confirmed = this.props.selectedLocationData.data[date].confirmed;
      const deaths = this.props.selectedLocationData.data[date].deaths;
      const recovered = this.props.selectedLocationData.data[date].recovered;
      max = Math.max(max, confirmed, deaths, recovered);
      return { date, confirmed, deaths, recovered };
    });
    sortedData = sortedData.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { data: sortedData, max, title };
  }

  renderLocationPopupTooltip = (props) => {
    const date = new Date(props.label);
    return (
      <div className='covid19-dashboard__tooltip'>
        <p>{monthNames[date.getMonth()]} {date.getDate()}, {date.getFullYear()}</p>
        {
          props.payload.map((data, i) => (
            <p style={{ color: data.stroke }} key={i}>{data.name}: {data.value}</p>
          ))
        }
      </div>
    );
  }

  render() {
    const locationPopupData = this.props.selectedLocationData ?
      this.formatSelectedLocationData() : null;

    const {
      confirmedCount, deathsCount, recoveredCount,
    } = this.getTotalCounts();
    const {
      seirChart, top10Chart, idphDailyChart,
    } = this.enableCharts ? this.getPlotChartsConfig() : {};

    return (
      <div className='covid19-dashboard'>
        <div>
          <Tabs>
            <TabList className='covid19-dashboard_tablist'>
              <Tab>COVID-19 in the world</Tab>
              <Tab>COVID-19 in Illinois</Tab>
            </TabList>

            <TabPanel className='covid19-dashboard_panel'>
              <div className='covid19-dashboard_counts'>
                <CountWidget
                  label='Total Confirmed'
                  value={confirmedCount.global}
                />
                <CountWidget
                  label='Total Deaths'
                  value={deathsCount.global}
                />
                <CountWidget
                  label='Total Recovered'
                  value={recoveredCount.global}
                />
              </div>
              <div className='covid19-dashboard_visualizations'>
                <WorldMapChart
                  geoJson={this.props.jhuGeojsonLatest}
                  jsonByLevel={this.props.jhuJsonByLevelLatest}
                  fetchTimeSeriesData={this.props.fetchTimeSeriesData}
                />
                {this.enableCharts &&
                  <div className='covid19-dashboard_charts'>
                    {top10Chart}
                  </div>
                }
              </div>
            </TabPanel>

            <TabPanel className='covid19-dashboard_panel'>
              <div className='covid19-dashboard_counts'>
                <CountWidget
                  label='Total Confirmed'
                  value={confirmedCount.illinois}
                />
                <CountWidget
                  label='Total Deaths'
                  value={deathsCount.illinois}
                />
              </div>
              <div className='covid19-dashboard_visualizations'>
                <IllinoisMapChart
                  jsonByLevel={this.props.jhuJsonByLevelLatest}
                  fetchTimeSeriesData={this.props.fetchTimeSeriesData}
                />
                {this.enableCharts &&
                  <div className='covid19-dashboard_charts'>
                    {seirChart}
                    {idphDailyChart}
                  </div>
                }
              </div>
            </TabPanel>
          </Tabs>
        </div>
        {
          locationPopupData ?
            <Popup
              title={locationPopupData.title}
              onClose={() => this.props.closeLocationPopup()}
            >
              <ResponsiveContainer>
                <LineChart
                  data={locationPopupData.data}
                  margin={{
                    top: 5, right: 30, left: 20, bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' tick={<CustomizedAxisTick />} interval={1} />
                  <YAxis type='number' domain={[0, locationPopupData.max || 'auto']} />
                  <Tooltip content={this.renderLocationPopupTooltip} />
                  <Legend />
                  <Line type='monotone' dataKey='confirmed' stroke='#8884d8' activeDot={{ r: 8 }} />
                  <Line type='monotone' dataKey='recovered' stroke='#00B957' />
                  <Line type='monotone' dataKey='deaths' stroke='#aa5e79' />
                </LineChart>
              </ResponsiveContainer>
            </Popup>
            : null
        }
      </div>
    );
  }
}

class CustomizedAxisTick extends React.Component { // eslint-disable-line react/no-multi-comp
  render() {
    const { x, y, payload } = this.props; // eslint-disable-line react/prop-types
    const val = payload.value; // eslint-disable-line react/prop-types
    const formattedDate = `${monthNames[new Date(val).getMonth()]} ${new Date(val).getDate()}`;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor='end'
          fill='#666'
          transform='rotate(-60)'
        >
          {formattedDate}
        </text>
      </g>
    );
  }
}

Covid19Dashboard.propTypes = {
  config: PropTypes.object.isRequired,
  fetchDashboardData: PropTypes.func.isRequired,
  fetchTimeSeriesData: PropTypes.func.isRequired,
  jhuGeojsonLatest: PropTypes.object,
  jhuJsonByLevelLatest: PropTypes.object,
  selectedLocationData: PropTypes.object,
  closeLocationPopup: PropTypes.func.isRequired,
  seirObserved: PropTypes.object,
  seirSimulated: PropTypes.object,
  top10: PropTypes.object,
  idphDaily: PropTypes.object,
};

Covid19Dashboard.defaultProps = {
  jhuGeojsonLatest: { type: 'FeatureCollection', features: [] },
  jhuJsonByLevelLatest: { country: {}, state: {}, county: {} },
  selectedLocationData: null,
  seirObserved: {},
  seirSimulated: {},
  top10: {},
  idphDaily: {},
};

export default Covid19Dashboard;