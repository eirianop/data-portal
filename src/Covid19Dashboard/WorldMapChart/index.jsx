import React from 'react';
import PropTypes from 'prop-types';
import { Range } from 'rc-slider';
import * as ReactMapGL from 'react-map-gl';

import ControlPanel from '../ControlPanel';

import 'mapbox-gl/dist/mapbox-gl.css';
import './WorldMapChart.less';

class WorldMapChart extends React.Component {
  constructor(props) {
    super(props);
    this.updateDimensions = this.updateDimensions.bind(this);
    this.state = {
      mapSize: {
        width: '100%',
        height: window.innerHeight - 221,
      },
      viewport: {
        longitude: 0,
        latitude: 0,
        zoom: 0,
        bearing: 0,
        pitch: 0
      },
      hoverInfo: null
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.updateDimensions);
  }

  // componentWillUnmount() {
  //   window.removeEventListener('resize', this.updateDimensions);
  // }

  updateDimensions() {
    this.setState({ mapSize: { height: window.innerHeight - 221 }});
  }

  // onAfterDateSliderChange(e) {
  //   console.log(e)
  // }

  _onHover = event => {
    let hoverInfo = null;

    if (!event.features)
      return

    event.features.forEach(feature => {
      if (feature.layer.id == 'confirmed') {
        const state = feature.properties.province_state;
        const cases = feature.properties.confirmed
        const locationStr = (state && state != "null" ? state + ", " : "") + feature.properties.country_region
        hoverInfo = {
          lngLat: event.lngLat,
          locationName: locationStr,
          confirmed: cases && cases != "null" ? cases : 0
        };
      }
    });

    this.setState({
      hoverInfo
    });
  };

  _renderPopup() {
    const {hoverInfo} = this.state;
    if (hoverInfo) {
      return (
        <ReactMapGL.Popup longitude={hoverInfo.lngLat[0]} latitude={hoverInfo.lngLat[1]} closeButton={false}>
          <div className="location-info">
            {hoverInfo.locationName}: {hoverInfo.confirmed} cases
            </div>
        </ReactMapGL.Popup>
      );
    }
    return null;
  }

  convertDataToGeoJson(rawData, selectedDate) {
    const features = rawData.reduce((res, location) => {
      let new_features = [];
      location['date'].forEach((date, i) => {
        if (new Date(date).getTime() != selectedDate.getTime()) {
          return;
        }
  
        const confirmed = location.confirmed[i];
        const deaths = location.deaths[i];
        let feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          },
          properties: {
              country_region: location.country_region,
              province_state: location.province_state,
              date: date,
              'marker-symbol': 'monument',
              confirmed: confirmed != null ? (+confirmed) : 0,
              deaths: deaths != null ? (+deaths) : 0,
          }
        };
        new_features.push(feature);
      });
      return res.concat(new_features)
    }, []);
    // console.log('features', features[0])

    const geoJson = {
      type: 'FeatureCollection',
      features: features
    };
    return geoJson;
  }

  render() {
    let rawData = this.props.rawData;
    // console.log('rawData', rawData);

    // find latest date we have in the data
    let selectedDate = new Date();
    if (rawData.length > 0) {
      selectedDate = new Date(Math.max.apply(null, rawData[0]['date'].map(function(date) {
        return new Date(date);
      })));
    }

    const geoJson = this.convertDataToGeoJson(rawData, selectedDate)

    let maxValue = Math.max.apply(Math, geoJson.features.map(function(e) { return e.properties.confirmed; }));
    const minDotSize = 2;
    const maxDotSize = 30;

    if (!rawData || rawData.length == 0) {
      geoJson.features = []
      maxValue = 2
    }

    const colors = {
      0: '#fff',
      10: '#3BB3C3',
      100: '#669EC4',
      1000: '#8B88B6',
      10000: '#A2719B',
      50000: '#aa5e79',
    };
    const colorsAsList = Object.entries(colors).map(item=>[+item[0], item[1]]).flat();

    return (
      <div className='map-chart'>
        <ReactMapGL.InteractiveMap
          className='map'
          mapboxApiAccessToken='pk.eyJ1IjoicmliZXlyZSIsImEiOiJjazhkbmNqMGcwdnphM2RuczBsZzVwYXFhIn0.dB-xnlG7S7WEeMuatMBQkQ' // TODO https://uber.github.io/react-map-gl/docs/get-started/mapbox-tokens
          mapStyle='mapbox://styles/mapbox/streets-v11'
          {...this.state.viewport}
          {...this.state.mapSize} // after viewport to avoid size overwrite
          onViewportChange={(viewport) => {
            this.setState({viewport})
          }}
          onHover={this._onHover}
        >
          {this._renderPopup()}
          <ReactMapGL.Source type='geojson' data={geoJson}>
            <ReactMapGL.Layer
              id='confirmed'
              type='circle'
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['number', ['get', 'confirmed']],
                  0, 0,
                  1, minDotSize,
                  maxValue, maxDotSize
                ],
                'circle-color': [
                  'interpolate',
                  ['linear'],
                  ['number', ['get', 'confirmed']],
                  ...colorsAsList
                ],
                'circle-opacity': 0.8
              }}
              // filter={['==', ['number', ['get', 'date']], 12]}
            />
            {/* <ReactMapGL.Layer
              id='confirmed_fill'
              type='fill'
              paint={{
                'fill-color': {
                  property: 'percentile',
                  stops: [
                    [0, '#3288bd'],
                    [1, '#66c2a5'],
                    [2, '#abdda4'],
                    [3, '#e6f598'],
                    [4, '#ffffbf'],
                    [5, '#fee08b'],
                    [6, '#fdae61'],
                    [7, '#f46d43'],
                    [8, '#d53e4f']
                  ]
                },
                // 'fill-color': [
                //   'interpolate',
                //   ['linear'],
                //   ['number', ['get', 'confirmed']],
                //   ...colorsAsList
                // ],
              }}
            /> */}
          </ReactMapGL.Source>
        </ReactMapGL.InteractiveMap>
        <ControlPanel
          containerComponent={this.props.containerComponent}
          settings={this.state}
          // onChange={this._updateSettings}
        />
        {
        // TODO fix or remove
        false && <div className='console'> 
          <h1>COVID-19</h1>
          <div className='session'>
            <h2>Confirmed cases</h2>
            <div className='row colors'>
            </div>
            <div className='row labels'>
              <div className='label'>0</div>
              <div className='label'>10</div>
              <div className='label'>100</div>
              <div className='label'>1000</div>
              <div className='label'>10000</div>
              <div className='label'>50000</div>
            </div>
          </div>
          <div className='session' id='sliderbar'>
            <h2>Date: <label id='active-hour'>12PM</label></h2>
            {/* <Range
              className='g3-range-filter__slider'
              min={1}
              max={4}
              value={[3, 3.5]}
              // onChange={e => this.onSliderChange(e)}
              onAfterChange={() => this.onAfterDateSliderChange()}
              step={0.5}
            /> */}
          </div>
        </div>
        }
            {/* <Range
              className='g3-range-filter__slider'
              min={1}
              max={4}
              value={[3, 3.5]}
              // onChange={e => this.onSliderChange(e)}
              onAfterChange={() => this.onAfterDateSliderChange()}
              step={0.5}
            /> */}
      </div>
    );
  }
}

WorldMapChart.propTypes = {
  rawData: PropTypes.array, // inherited from GuppyWrapper
};

WorldMapChart.defaultProps = {
  rawData: [],
};

export default WorldMapChart;
