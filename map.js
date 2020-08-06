"use strict";

var map;
var canvasLayer;
var context;
var contextScale;
var resolutionScale;
var mapProjection;
var projectionScale = 2000;
var y_scale;
var minZoom = 5;
var windMonitor, infowindow;
var highlights = [];
var iconBase = 'assets/images/';
var countryPointSizePixels = 7;
var blockPointSizePixels = 70;
//defines the icons to be drawn for each marker type
//key-value:
//  legendIcon: path/to/legend/icon
//  path: svg
//or
//  url: path/to/icon
var iconScale = 4.25;
var icons = {
  "Selected Monitor":{
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: 'yellow',
    strokeWeight: 0,
    scale: iconScale,
    fillOpacity: 1.0,
    legendIcon: iconBase + "yellow_highlight.png",
    localize: "dashboard.icon.selected-monitor"
  },
  "Community Monitor": {
    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    fillColor: 'mediumspringgreen',
    strokeColor: '#A6FDDC',
    strokeWeight: 3,
    scale: iconScale,
    fillOpacity: 1.0,
    legendIcon: iconBase + "community-monitor.png",
    localize: "dashboard.icon.community-monitor"
  },
  "Fenceline Monitor": {
    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    fillColor: 'deeppink',
    strokeColor: 'lightpink',
    strokeWeight: 3,
    scale: iconScale,
    fillOpacity: 1.0,
    legendIcon: iconBase + "fenceline.png",
    localize: "dashboard.icon.fenceline-monitor"
                      },
  /* "BAAQMD Monitor": {
    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    fillColor: 'royalblue',
    strokeColor: 'skyblue',
    strokeWeight: 3,
    scale: iconScale,
    fillOpacity: 1.0,
    legendIcon: iconBase + "baaqmd-monitor-pin.png",
    localize: "dashboard.icon.baaaqmd-monitor"
  },*/
  "PurpleAir Monitor": {
    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    fillColor: '#c973c8',
    strokeColor: '#aa44aa',
    strokeWeight: 3,
    scale: iconScale,
    fillOpacity: 1.0,
    legendIcon: iconBase + "purpleair.png",
    localize: "dashboard.icon.purpleair-monitor"
  },
  "Wind": {
    legendIcon: iconBase + 'wind-arrow.png',
    localize: "dashboard.icon.wind"
  },
  "School/Day Care": {url: iconBase + "school.png",
    legendIcon: iconBase + "school.png",
    localize: "dashboard.icon.school"
  },
  "Pollution Source": {
    path: "M 50,8 90,75 10,75 z",
    fillColor: 'dimgray',
    strokeColor: 'gray',
    strokeWeight: 3,
    scale: .2,
    fillOpacity: 1.0,
    legendIcon: iconBase + "pollution-source.png",
    localize: "dashboard.icon.pollution-source"
  },
}

function makeSourceLink(link) {
  return '<br><a href="' + link + '" rel="noopener noreferrer" target="_blank">Source</a>';
}

//defines where to draw fenceline monitors
var fencelineMonitors = {
  "Atchison Village": [{
    lat: 37.941351,
    lng: -122.381193,
    description: "Fenceline Monitor" + makeSourceLink("https://richmondairmonitoring.org/measurements.html")
  }],
  "North Richmond": [{
    lat: 37.948234,
    lng: -122.375425,
    description: "Fenceline Monitor" + makeSourceLink("https://richmondairmonitoring.org/measurements.html")
  },
  {
    lat: 37.953857, 
    lng: -122.37978, 
    description: "Fenceline Monitor" + makeSourceLink("https://richmondairmonitoring.org/measurements.html")
  }],
  "Point Richmond": [{
    lat:  37.93501,
    lng: -122.384772,
    description: "Fenceline Monitor" + makeSourceLink("https://richmondairmonitoring.org/measurements.html")
  }],
  "North Rodeo": [{
    lat: 38.044924,
    lng: -122.247935,
    description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/rodeo/data.php")
  }],
  "South Rodeo": [{
    lat: 38.03855,
    lng: -122.25653,
    description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/rodeo/data.php")
  }],
  "Valero North": [
    {
      lat: 38.07023, 
      lng: -122.1325, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.07909, 
      lng: -122.138, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.069294, 
      lng: -122.131348, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.070225, 
      lng: -122.132462, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.07223, 
      lng: -122.126512, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }
  ],
  "Valero South": [
    {
      lat: 38.06556, 
      lng: -122.1508, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.05953, 
      lng: -122.149575, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.05907, 
      lng: -122.1387, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }, 
    {
      lat: 38.0624, 
      lng: -122.13828, 
      description: "Fenceline Monitor" + makeSourceLink("https://beniciarefineryairmonitors.org/measurements.html")
    }
  ],
  "Martinez": [
    {
      lat: 38.0131667, 
      lng: -122.1064, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.013525, 
      lng: -122.0971111, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0136778, 
      lng: -122.1109576, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0150056, 
      lng: -122.121425, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0220028, 
      lng: -122.1283278, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0157333, 
      lng: -122.1239374, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0133496, 
      lng: -122.1017286, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0164611, 
      lng: -122.12645, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }, 
    {
      lat: 38.0153314, 
      lng: -122.0963823, 
      description: "Fenceline Monitor" + makeSourceLink("https://www.fenceline.org/martinez")
    }
  ]
};

//defines where to draw fenceline highlight
var receivers = {
  "North Rodeo": {
    lat: 38.04228,
    lng: -122.24378
  },
  "South Rodeo": {
    lat: 38.03996,
    lng: -122.26076
  }
}

//defines where to draw community monitors
var communityMonitors = {
  "Atchison Village": [{
    lat:   37.93447,
    lng: -122.37166,
    description: "Community Monitor"
  }],
  "North Richmond": [{
    lat: 37.94799,
    lng: -122.36477,
    description: "Community Monitor"
  }],
  "Point Richmond": [{
    lat:  37.92423,
    lng: -122.38215,
    description: "Community Monitor"
  }],
  "South Rodeo":[{
    lat:  38.031616,
    lng: -122.263651,
    description: "Community Monitor"
  }]
}

var purpleAirMonitors = {
  "Vallejo": [
    {
      lat: 38.092815, 
      lng: -122.251223, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.092815, 
      lng: -122.251223, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.094574, 
      lng: -122.252202, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.096161, 
      lng: -122.251748, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.09737, 
      lng: -122.259197, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.107731, 
      lng: -122.255566, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.110553, 
      lng: -122.243537, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }, 
    {
      lat: 38.122023, 
      lng: -122.233247, 
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }
  ],
  "El Sobrante" : [
    {
      lat: 37.98261,
      lng: -122.295859,
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }
  ],
  "El Cerrito" : [
    {
      lat: 37.906472,
      lng: -122.301588,
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    },
  ],
  "Berkeley": [
    {
      lat: 37.900737,
      lng: -122.286133,
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }
  ],
  "Benicia": [
  {
    "lat": 38.079625, 
    "lng": -122.155216, 
    "description": "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
  }, 
  {
    "lat": 38.060789, 
    "lng": -122.149458, 
    "description": "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
  }, 
  {
    "lat": 38.058971, 
    "lng": -122.141785, 
    "description": "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
  }, 
  {
    "lat": 38.058086, 
    "lng": -122.157553, 
    "description": "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
  }, 
  {
    "lat": 38.055033, 
    "lng": -122.157681, 
    "description": "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
  }
],
  "Clyde": [
    {
      lat: 38.0285,
      lng: -122.0302,
      description: "PurpleAir Monitor" + makeSourceLink("https://www.purpleair.com/map?#10.59/38.0109/-122.227")
    }
  ]
}
//defines where to draw BAAQMDMonitors
var BAAQMDMonitors = {
  // "North Rodeo": {
  //   lat: 38.05492,
  //   lng: -122.2332,
  //   description: "BAAQMD Monitor"
  // },
  // "South Rodeo": {
  //   lat: 38.03433,
  //   lng: -122.27033,
  //   description: "BAAQMD Monitor"
  // },
  // "Vallejo":{
  //   lat:  38.102507,
  //   lng: -122.237976,
  //   description: "BAAQMD Monitor"
  // },
  // "Martinez":{
  //   lat:  38.012816,
  //   lng: -122.134467,
  //   description: "BAAQMD Monitor"
  // }
}

//Defines where to draw refineries
var refineries = {
  "Phillips 66 Refinery": {
    lat: 38.04221,
    lng: -122.25405,
    boundCoords:[
      { lat: 38.0410951, lng:-122.260623  },
      { lat: 38.0380531, lng:-122.2553873 },
      { lat: 38.0354166, lng:-122.255559  },
      { lat: 38.034673,  lng:-122.2544432 },
      { lat: 38.0358222, lng:-122.2531557 },
      { lat: 38.0354166, lng:-122.2522116 },
      { lat: 38.0379855, lng:-122.2496367 },
      { lat: 38.041771,  lng:-122.2448301 },
      { lat: 38.0483952, lng:-122.2533274 },
      { lat: 38.0515043, lng:-122.2580481 },
      { lat: 38.0513692, lng:-122.2609663 },
      { lat: 38.0491387, lng:-122.2625113 },
      { lat: 38.042447,  lng:-122.2603655 },
      { lat: 38.0410951, lng:-122.260623  }
    ]
  },
  "Chevron Process Units": {
    lat: 37.95076,
    lng: -122.39687,
    boundCoords:[
      { lat: 37.9412699, lng: -122.393682  },
      { lat: 37.9395777, lng: -122.3908925 },
      { lat: 37.9405253, lng: -122.388103  },
      { lat: 37.9420484, lng: -122.3887897 },
      { lat: 37.9442821, lng: -122.39012   },
      { lat: 37.9470234, lng: -122.3924374 },
      { lat: 37.9492782, lng: -122.3935369 },
      { lat: 37.9525481, lng: -122.3984991 },
      { lat: 37.9531445, lng: -122.4043196 },
      { lat: 37.9511013, lng: -122.4055052 },
      { lat: 37.9460419, lng: -122.3974586 },
      { lat: 37.9412699, lng: -122.393682  }
    ]
  },
  "Chevron Tank Farm": {
    lat: 37.93952,
    lng: -122.40237,
    boundCoords: [
      { lat: 37.9411346, lng: -122.4028015 },
      { lat: 37.9395777, lng: -122.403059  },
      { lat: 37.9376485, lng: -122.4022007 },
      { lat: 37.9369716, lng: -122.3948193 },
      { lat: 37.9391039, lng: -122.393961  },
      { lat: 37.9405592, lng: -122.3947334 },
      { lat: 37.9410669, lng: -122.3960209 },
      { lat: 37.94171,   lng: -122.39748   },
      { lat: 37.9452128, lng: -122.3985099 },
      { lat: 37.949367,  lng: -122.4036383 },
      { lat: 37.9496335, lng: -122.4048078 },
      { lat: 37.9486478, lng: -122.4072432 },
      { lat: 37.9477722, lng: -122.4063688 },
      { lat: 37.9473026, lng: -122.4050652 },
      { lat: 37.94597,   lng: -122.403075  },
      { lat: 37.9445423, lng: -122.4016079 },
      { lat: 37.9441298, lng: -122.4032307 },
      { lat: 37.9411346, lng: -122.4028015 }
    ]
  },
  "Valero Benicia Refinery": {
    lat: 38.071614,
    lng: -122.139319,
    boundCoords:[
      { lat: 38.0787372, lng: -122.1405888 },
      { lat: 38.0780616, lng: -122.1423054 },
      { lat: 38.0742779, lng: -122.1452236 },
      { lat: 38.0727915, lng: -122.1448374 },
      { lat: 38.0695481, lng: -122.143507  },
      { lat: 38.0696157, lng: -122.1423054 },
      { lat: 38.0654937, lng: -122.1368122 },
      { lat: 38.0667776, lng: -122.1325207 },
      { lat: 38.0697508, lng: -122.1321774 },
      { lat: 38.079548,  lng: -122.1380138 },
      { lat: 38.0787372, lng: -122.1405888 }
    ]
  },
  "Shell Martinez Refinery":{
    lat: 38.020256,
    lng: -122.115495,
    boundCoords:[
      { lat: 38.011106,  lng: -122.102634 },
      { lat: 38.012371,  lng: -122.106338 },
      { lat: 38.012368,  lng: -122.116478 },
      { lat: 38.012943,  lng: -122.117893 },
      { lat: 38.017461,  lng: -122.128895 },
      { lat: 38.022556,  lng: -122.130157 },
      { lat: 38.025172,  lng: -122.117964 },
      { lat: 38.025379,  lng: -122.112807 },
      { lat: 38.018990,  lng: -122.096865 },
      { lat: 38.016248,  lng: -122.095105 },
      { lat: 38.010356,  lng: -122.100707 },
      { lat: 38.011106,  lng: -122.102634 }
    ]
  },
  "Tesoro Golden Eagle Refinery":{
    lat: 38.027699,
    lng: -122.066462,
    boundCoords:[
      { lat: 38.037635,  lng: -122.080122},
      { lat: 38.038202,  lng: -122.078218},
      { lat: 38.034177,  lng: -122.072533},
      { lat: 38.031490,  lng: -122.066634},
      { lat: 38.027973,  lng: -122.049188},
      { lat: 38.026700,  lng: -122.047975},
      { lat: 38.020015,  lng: -122.059372},
      { lat: 38.002250,  lng: -122.049107},
      { lat: 38.000279,  lng: -122.056583},
      { lat: 38.015701,  lng: -122.068814},
      { lat: 38.027133,  lng: -122.070703},
      { lat: 38.030885,  lng: -122.077813},
      { lat: 38.032111,  lng: -122.079129},
      { lat: 38.037635,  lng: -122.080122},
    ]
  }
}

//defines where to draw pollution sources
var pollutionSources = {
  "Nu Star Energy (ST Shore Terminals)":{
    description: "Organic gas",
    lat: 38.0482938,
    lng: -122.2480488,
  },
  "Crockett Cogeneration":{
    description: "NOx, Particulate Matter, Organic Gas, SOx, CO",
    lat: 38.057135,
    lng:-122.2156852,
  },
  "Dutra Materials":{
    description: "",
    lat: 37.9359054,
    lng:-122.4065781,
  },
  "Loading Terminal":{
    description: "Sulfur Dioxide, Benzene, Toluene, Ethylbenzene, Xylene, and Particulate Matter",
    lat: 37.9229069,
    lng:-122.4107838,
  },
  "Waste Water Treatment Facility":{
    description: "Hydrogen Sulfide",
    lat: 37.9201139,
    lng:-122.3788977,
  },
  "Kinder Morgan and BP Loading Dock":{
    description: "Benzene, Toluene, Ethylbenzene, Xylene, and VOCs",
    lat: 37.9194538,
    lng:-122.3664522,
  },
  "General Chemical":{
    description: "Hydrogen Sulfide and Sulfur Dioxide",
    lat: 37.9397469,
    lng:-122.3778248,
  },
  "Phillips 66 Carbon Plant":{
    description: "SOx, NOx, Particulate Matter",
    lat: 38.0161306,
    lng:-122.2365718,
  },
  "C&H Sugar":{
    description: "",
    lat: 38.0561213,
    lng:-122.2187912,
  },
  "Lehigh Permanente Quarry":{
    description: "Mercury",
    lat: 37.320355, 
    lng: -122.106913,
  }
}

var mapCenters = {
  "bay-area":{
    lat : 37.991763648910556,
    lng : -122.2388610358398,
    zoom: 10
  },
  "richmond":{
    lat : 37.938407712418034,
    lng : -122.36615572772212,
    zoom: 13
  },
  "crockett-rodeo":{
    lat : 38.03885974316995,
    lng : -122.23290213427731,
    zoom: 13
  },
  "benicia":{
    lat : 38.06830801346868,
    lng : -122.1451339240234,
    zoom: 13
  },
  "vallejo":{
    lat : 38.09945801857219,
    lng : -122.2465857978027,
    zoom: 13
  },
  "martinez":{
    lat : 38.01540113860103,
    lng : -122.11896334490962,
    zoom: 13
  }
}

//callback when map finish loaded
function mapLoaded(){
  localize()
}

//initializes the google map and draws markers/bounds
function initMap(div) {
  // Initialize Google Map
  resolutionScale = window.devicePixelRatio || 1;
  var isBigPicture = area.id === "bay-area";
  var center = mapCenters[area.id] || mapCenters['richmond'];

  var styleArray = [
    {
      featureType: "all",
      stylers: [
        {saturation: -80}
      ]
    }, {
      featureType: "road.arterial",
      elementType: "geometry",
      stylers: [
        {hue: "#ff5252"},
        {saturation: 50}
      ]
    }, {
      featureType: "poi.business",
      elementType: "labels",
      stylers: [
        {visibility: "off"}
      ]
    }
  ];

  // Create a div to hold the control.
  var controlDiv = document.createElement('div');

  // Set CSS for the control border
  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = '#fff';
  controlUI.style.border = '2px solid #fff';
  controlUI.style.padding = '2px';
  controlUI.style.cursor = 'pointer';
  controlUI.style.marginTop = '10px';
  controlUI.style.marginBottom = '0px';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Click to recenter the map';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior
  var controlText = document.createElement('div');
  controlText.style.color = 'rgb(25,25,25)';
  controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
  controlText.style.fontSize = '13px';
  controlText.innerHTML = '<span data-localize="dashboard.expand-map"></span>';
  controlUI.appendChild(controlText);
  controlDiv.index = 0;

  var mapOptions = {
    keyboardShortcuts: false,
    zoom: center.zoom || 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl:false,
    mapTypeControl: false,
    zoomControl: true,
    zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
    },
    fullscreenControl: true,
    fullscreenControlOptions:{
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    center: new google.maps.LatLng(center.lat, center.lng),

    styles: styleArray
  };
  map = new google.maps.Map(document.getElementById(div), mapOptions);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
  $(controlDiv).click(function(){
      $('[title="Toggle fullscreen view"]').click();
  });
  //import KML with monitor and fence line locations
  //code adapted from https://stackoverflow.com/questions/29603652/google-maps-api-google-maps-engine-my-maps
  // var kmlLayer = new google.maps.KmlLayer({
  //     map: map,
  //     url: PROJ_ROOT_URL + "/assets/kmz/map12.kmz",
  //     preserveViewport: true,
  //     zIndex: 0
  //   });

  // kmlLayer.addListener('click', function(kmlEvent) {
  //   if(kmlEvent.featureData.name.indexOf("Monitor") > 0) {
  //     changeLocale(area.id, kmlEvent.featureData.description);
  //   }
  // });

  infowindow = new google.maps.InfoWindow();

  if(!isBigPicture){
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
      location: new google.maps.LatLng(center.lat, center.lng),
      radius: 5000,
      type: ['school']
    }, drawSchoolMarkers);
  }

  //add Fenceline Monitors
  for(var key in fencelineMonitors) {
    for (var i = fencelineMonitors[key].length - 1; i >= 0; i--) {
      var fencelineMonitor = fencelineMonitors[key][i];
      var latlng = {"lat":fencelineMonitor.lat, "lng":fencelineMonitor.lng};
      var icon = icons['Fenceline Monitor'];
      createMarker(latlng, icon, createInfoWindowContent(key, fencelineMonitor.description),makeClosure(key), addDataToInfoWindow).setZIndex(1);
    }
  }

  //add Community Monitors
  for(var key in communityMonitors) {
    for (var i = communityMonitors[key].length - 1; i >= 0; i--) {
      var communityMonitor = communityMonitors[key][i];
      var latlng = {"lat":communityMonitor.lat, "lng":communityMonitor.lng};
      var icon = icons['Community Monitor'];
      createMarker(latlng, icon, createInfoWindowContent(key, communityMonitor.description),makeClosure(key), addDataToInfoWindow).setZIndex(1);
    }
  }

  //add BAAQMD Monitors
  for(var key in BAAQMDMonitors) {
    var BAAQMDMonitor = BAAQMDMonitors[key];
    var latlng = {"lat":BAAQMDMonitor.lat, "lng":BAAQMDMonitor.lng};
    var icon = icons['BAAQMD Monitor'];
    createMarker(latlng, icon, createInfoWindowContent(key, BAAQMDMonitor.description), makeClosure(key), addDataToInfoWindow).setZIndex(1);
  }

  //add PurpleAir Monitors
  for(var key in purpleAirMonitors) {
    for (var i = purpleAirMonitors[key].length - 1; i >= 0; i--) {
      var purpleAirMonitor = purpleAirMonitors[key][i];
      var latlng = {"lat":purpleAirMonitor.lat, "lng":purpleAirMonitor.lng};
      var icon = icons["PurpleAir Monitor"];
      createMarker(latlng, icon, createInfoWindowContent(key, purpleAirMonitor.description), makeClosure(key), addDataToInfoWindow).setZIndex(1);
    }
  }

  //draw refineries
  for(var key in refineries) {
    var refinery = refineries[key];
    var refineryBounds = new google.maps.Polygon({
      paths: refinery.boundCoords,
      strokeColor: 'rebeccapurple',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: 'rebeccapurple',
      fillOpacity: 0.35
    });
    refineryBounds.setMap(map);
  }

  //add Pollution Sources
  for(var key in pollutionSources) {
    var pollutionSource = pollutionSources[key];
    var latlng = {"lat":pollutionSource.lat, "lng":pollutionSource.lng};
    var icon = icons['Pollution Source'];
    createMarker(latlng, icon, createInfoWindowContent(key, pollutionSource.description)).setZIndex(1);
  }

    // initialize the canvasLayer
  var update = function() {
    var epochTime = plotManager.getDateAxis().getCursorPosition();
    repaintCanvasLayer(epochTime);
  }
  var canvasLayerOptions = {
    map: map,
    animate: false,
    updateHandler: update,
    resolutionScale: resolutionScale
  };
  canvasLayer = new CanvasLayer(canvasLayerOptions);
  canvasLayer.canvas.style.zIndex = 25;
  context = canvasLayer.canvas.getContext('2d');
  //window.addEventListener('resize', function () { google.maps.event.trigger(map, 'resize'); }, false);
  addMapLabels();
  generateLegend();
}

//used for binding event for marker onclick
function makeClosure(key){
  return (function(){
    changeLocale(area.id, key);
  })
}

//creates info window content based on title and description
function createInfoWindowContent(title, description){
  return ['<h4>',title,'</h4>',
          '<p>',description,'</p>'].join('');
}

//adds data to infowindow if available
function addDataToInfoWindow(infowindow, infoContent){
  var communityName = $(infoContent).get(0).innerHTML;
  if (communityName in feedMap){
    for(var i = 0; i < feedMap[communityName].length; i++){
      var feedId = feedMap[communityName][i];
      // if (feedId in feedIDtoPlotId){
      //     console.log(feedIDtoPlotId[feedId]);
      // }
    }
  }
}

//draws school markers based on Google Places results
function drawSchoolMarkers(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0; i < results.length; i++) {
      createMarker(results[i].geometry.location, icons["School/Day Care"], results[i].name);
    }
  }
}

//scales icons based on zoom level array at top
function scaleIcon(marker, icon){
  var icon_size = .75 * countryPointSizePixels * Math.pow(blockPointSizePixels / countryPointSizePixels, (map.getZoom() - 4) / (18 - 4));
  icon.scaledSize = new google.maps.Size(icon_size,icon_size);
  icon.origin = new google.maps.Point(0,0), // origin
  icon.anchor = new google.maps.Point(0, 0) // anchor
  marker.setIcon(icon);
}

//creates a marker with given infoContent HTML and function callback on click
function createMarker(googLatLng, icon, infoContent, clickCallback, hoverCallback) {
  var marker = new google.maps.Marker({
    map: map,
    position: googLatLng,
    icon: icon,
    content: infoContent,
    animation: google.maps.Animation.DROP,
  });
  var hoverArea = new google.maps.Circle({
    strokeColor: '#FF0000',
    strokeOpacity: 0,
    strokeWeight: 2,
    fillColor: icon.fillColor || '#FFFFFF',
    fillOpacity: 0,
    map: map,
    center: googLatLng,
    radius: 150,
  });
  hoverArea.addListener('mouseover', function() {
    infowindow.setContent(infoContent);
    if (hoverCallback){
      hoverCallback(infowindow, infoContent);
    }
    infowindow.setPosition(googLatLng);
    infowindow.open(map);
  });
  hoverArea.addListener('mouseout', function() {
    infowindow.close();
  });
  google.maps.event.addListener(marker, 'click', function() {
    if(clickCallback){
      clickCallback.bind(this, marker, infoContent)();
    }
  });
  google.maps.event.addListener(map, 'zoom_changed', function() {
    scaleIcon(marker, icon);
  });
  scaleIcon(marker, icon);
  return marker;
}

//Adds text labels to the map
function addMapLabels() {
  var labels = [];
  // for(var coord in fencelineMonitors) {
  //   //position labels around other map features
  //   var align = coord.indexOf("Point Richmond") != -1 ? 'right' : 'left';
  //   var lat = coord.indexOf("Atchison") != -1 ? fencelineMonitors[coord].lat + .0041 : fencelineMonitors[coord].lat;
  //   var label = new MapLabel({
  //     text: coord,
  //     map: map,
  //     position: new google.maps.LatLng(lat + 0.0011, fencelineMonitors[coord].lng),
  //     align: align
  //   });
  //   labels.push(label);
  // }

  // for(var coord in communityMonitors) {
  //   var label = new MapLabel({
  //     text: coord,
  //     map: map,
  //     position: new google.maps.LatLng(communityMonitors[coord].lat, communityMonitors[coord].lng),
  //     align: 'left'
  //   });
  //   labels.push(label);
  // }

  for (var coord in refineries) {
    var label = new MapLabel({
      text: coord,
      map: map,
      position: new google.maps.LatLng(refineries[coord].lat, refineries[coord].lng)
    });
    labels.push(label);
  }
}

//generates the legend based on icons object at top
function generateLegend() {
  var $legend = $('<details id="legend" open=""><summary class="no-highlight" data-localize="dashboard.legend"></summary></details>');
  for (var key in icons) {
    var name = key;
    var icon = icons[key];
    var div = document.createElement('div');
    div.innerHTML = ['<img src="',icon.legendIcon,'"> ',
                     '<span data-localize="',icon.localize,'""></span>'].join('');
    $legend.append(div);
  }
  $legend[0].index = -1
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push($legend[0]);
}

//deals with canvas layer map projection for wind direction drawing
function setupCanvasLayerProjection() {
  var canvasWidth = canvasLayer.canvas.width;
  var canvasHeight = canvasLayer.canvas.height;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  /* We need to scale and translate the map for current view.
   * see https://developers.google.com/maps/documentation/javascript/maptypes#MapCoordinates
   */
  mapProjection = map.getProjection();
  if (!mapProjection) return;

  /**
   * Clear transformation from last update by setting to identity matrix.
   * Could use context.resetTransform(), but most browsers don't support
   * it yet.
   */

  // scale is just 2^zoom
  // If canvasLayer is scaled (with resolutionScale), we need to scale by
  // the same amount to account for the larger canvas.
  contextScale = Math.pow(2, map.zoom) * resolutionScale / projectionScale;
  context.scale(contextScale, contextScale);

  /* If the map was not translated, the topLeft corner would be 0,0 in
   * world coordinates. Our translation is just the vector from the
   * world coordinate of the topLeft corder to 0,0.
   */
  var offset = mapProjection.fromLatLngToPoint(canvasLayer.getTopLeft());
  context.translate(-offset.x * projectionScale, -offset.y * projectionScale);
}

//draws wind data for desired point on map at given time
function drawWind(site, epochTime) {
  var rectLatLng = new google.maps.LatLng(site.coordinates.latitude, site.coordinates.longitude - .003);
  var worldPoint = mapProjection.fromLatLngToPoint(rectLatLng);
  var x = worldPoint.x * projectionScale;
  var y = worldPoint.y * projectionScale;

  // How many pixels per mile?
  var offset1mile = mapProjection.fromLatLngToPoint(new google.maps.LatLng(site.coordinates.latitude + 0.014457067, site.coordinates.longitude));
  var unitsPerMile = 1000 * (worldPoint.y - offset1mile.y);

  y_scale = site.flip_y ? -1 : 1;

  var wind_speed, wind_dir;
  var windSpeedChannel = site.channels.Wind_Speed_MPH || site.channels.Wind_Speed || site.channels.WS;
  if (windSpeedChannel) {
    wind_speed = getData(site, windSpeedChannel, epochTime);
    wind_dir = getData(site, site.channels.Wind_Direction_degrees, site.channels.Wind_Direction || site.channels.WD, epochTime);
  }

  // Black dot as base to wind vector
  context.fillStyle = 'black';
  context.beginPath();
  context.arc(x, y, 1, 0, 2 * Math.PI, false);
  context.fill();

  if (wind_speed && wind_dir) {
    if (wind_speed > 0.1) {
      var wind_dir_radians = wind_dir * Math.PI / 180;
      var dx = -Math.sin(wind_dir_radians);
      var dy =  Math.cos(wind_dir_radians);
      var d = 1;
      var length = unitsPerMile * wind_speed / 5;

      context.strokeStyle = '#085b64';
      context.lineWidth = Math.max(2.0 / contextScale, d * 0.75);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (length - d * 1) * dx,
                     y + (length - d * 1) * dy);
      context.stroke();

      context.fillStyle = '#085b64';
      context.beginPath();
      context.moveTo(x + length * dx,
                     y + length * dy);
      context.lineTo(x + (length - d * 3) * dx + d * 1.5 * dy,
                     y + (length - d * 3) * dy - d * 1.5 * dx);
      context.lineTo(x + (length - d * 3) * dx - d * 1.5 * dy,
                     y + (length - d * 3) * dy + d * 1.5 * dx);
      context.fill();

      //show wind speed value on hover
        var windDirs = [ "S","SSW","SW", "WSW","W", "WNW","NW","NNW","N", "NNE","NE","ENE", "E","ESE","SE", "SSE"];
        var formattedDate = new Date(epochTime * 1000).toString();
        var offsetDegrees = (wind_dir+11.25) % 360; //offset sedecimants so "S" is 0-22.5 degrees instead of 349.75-11.25 degrees
        var contentString = "<div>Wind Speed (mph): " + wind_speed + "</div><div>Wind Towards: " + windDirs[Math.floor(offsetDegrees/22.5)] +"</div><div>Time: "+ formattedDate +"</div>";
        var infowindow = new google.maps.InfoWindow({
          content: contentString,
          position: rectLatLng
        });

        windMonitor = new google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0,
          map: map,
          center: rectLatLng,
          radius: 200
        });

        windMonitor.addListener('mouseover', function() {
          infowindow.open(map);
        });
        windMonitor.addListener('mouseout', function() {
          infowindow.close();
        });
    }
  }
}

function getData(site, channel, time) {
  var day = Math.floor(time / 86400);

  if (!site.requested_day[day]) {
    site.requested_day[day] = true;
    //console.log('Requesting ' + site.feed_id + ', day ' + day);
    var requestInfo = {
      feed_id : site.feed_id,
      api_key : site.api_key,
      start_time : day * 86400,
      end_time : (day + 1) * 86400,
      channels : Object.keys(site.channels).toString(),
      headers : null
    };
    requestEsdrExport(requestInfo, function(csvData) {
      parseEsdrCSV(csvData, site);
      //console.log('got that data');
      repaintCanvasLayer(time);
    });
  } else {
    //console.log('We have data for ' + site.feed_id + ', day ' + day);
    //console.log(channel);
    if (!channel) return null;
    if (channel.hourly) {
      time = Math.floor(time / 3600) * 3600;
      //console.log('Hourly; adjusted time to ' + time);
      var ret = channel.summary[time];
      //console.log('Value is ' + ret);
      return ret;
    } else {
      time = Math.round(time);
      // Search for data
      var search_dist = 150;  // 45 seconds
      //console.log('Searching for time ' + time + ', +/- ' + search_dist);
      //console.log(channel);
      for (var i = 0; i <= search_dist; i++) {
        if ((time + i) in channel.summary) {
          //console.log('found at time ' + (time + i));
          return channel.summary[time + i];
        }
        if ((time - i) in channel.summary) {
          //console.log('found at time ' + (time - i));
          return channel.summary[time - i];
        }
      }
      //console.log('could not find time in range');
      return null;
    }
  }
}

/*function drawPurpleAirMonitors() {
  for(var feedName in esdr_feeds) {
    var monitor = esdr_feeds[feedName];
    if (monitor.type == "PurpleAir") {
      var latlng = {"lat":monitor.coordinates.latitude, "lng":monitor.coordinates.longitude};
      var icon = icons["PurpleAir Monitor"];
      createMarker(latlng, icon, createInfoWindowContent(feedName, "PurpleAir Monitor"),makeClosure(feedName)).setZIndex(1);
    }
  }
}*/

// Highlights the selected monitor
function highlightSelectedMonitors() {
  highlights.forEach(highlight => highlight.setMap(null));

  for(var feed in esdr_feeds) {
    //skip the Rodeo wind feed
    if (feed == "Rodeo fenceline_org") {
      continue;
    }
    var coords = {
      lat: esdr_feeds[feed].coordinates.latitude,
      lng: esdr_feeds[feed].coordinates.longitude
    }
    var factor, radius, center;
    factor = Math.pow(2,(13 - map.zoom));
    radius = 125 * factor;
    center = coords;
    var markerOptions = {
      strokeColor: '#FFF000',
      strokeOpacity: .75,
      strokeWeight: 3,
      fillColor: '#FFF000',
      fillOpacity: 0.5,
      map: map,
      center: {
        lat: center.lat,
        lng: center.lng,
      },
      radius: radius
    }
    var highlightCircle = new google.maps.Circle(markerOptions);
    highlightCircle.initialCenter = center;
    highlights.push(highlightCircle);
  }
}

//repaints the canvas layer on each update of the cursor
function repaintCanvasLayer(epochTime) {
  try {
    //console.log('repaint');
    setupCanvasLayerProjection();
    // Date.parse() can only reliably parse RFC2822 or ISO 8601 dates.
    // The result is that parsing the capture time from Time Machine results in undefined.
    // Chrome (unlike FireFox or IE) is more lenient and will parse it correctly though.
    //var epochTime = (new Date((timelapse.getCurrentCaptureTime()).replace(/-/g,"/")).getTime()) / 1000;
    if(!epochTime) {
      var currentTime = new Date();
      epochTime = (currentTime.getTime() / 1000) - 3600;
    }

    // var esdrKeys = Object.keys(esdr_feeds);
    // var feedName;
    // if(area.locale.indexOf("Rodeo") > 0) {
    //   feedName = "Rodeo fenceline_org";
    // }
    // else {
    //   for(var i=0;i<esdrKeys.length;i++) {
    //     if(esdrKeys[i].indexOf("Refinery") > -1) {
    //       feedName = esdrKeys[i];
    //     }
    //   }
    // }
    // var feed = esdr_feeds[feedName];
    // drawWind(feed, epochTime);
    for (var i = windFeeds.length - 1; i >= 0; i--) {
      drawWind(windFeeds[i], epochTime);
    }
  } catch(e) {
    //console.log(e);
  }
}
