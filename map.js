"use strict";

var map;
var canvasLayer;
var context;
var contextScale;
var resolutionScale;
var mapProjection;
var projectionScale = 2000;
var y_scale;
var windMonitor, fencelineMonitor, communityMonitor, BAAQMDMonitor, infowindow;

var zoom_level_to_marker_size = [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 24, 24, 24, 36, 60, 90, 180, 240, 360];

var iconBase = 'assets/images/';
var icons = {
  "Wind": iconBase + 'wind-arrow.png',
  "Fenceline Monitor": iconBase + 'fenceline.png',
  "Community Monitor": iconBase + 'community-monitor-pin.png',
  "BAAQMD Monitor": iconBase + 'baaqmd-monitor-pin.png',
  "Selected Monitors": iconBase + 'highlight.png',
  "Pollution Source": iconBase + 'pollution-marker-grey-circle.png',
  "School": iconBase + "school.png"
}

var sourceTowers = {
  "Atchison Village": {
    lat:   37.935014,
    lng: -122.384772
  },
  "North Richmond": {
    lat: 37.952750,
    lng: -122.375425
  },
  "Point Richmond": {
    lat:  37.933972,
    lng: -122.392989
  },
  "North Rodeo": {
    lat: 38.04756,
    lng: -122.25207
  },
  "South Rodeo": {
    lat: 38.03426,
    lng: -122.25467
  }
};

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

var communityMonitors = {
  "Atchison Village": {
    lat:   37.93447,
    lng: -122.37166
  },
  "North Richmond": {
    lat: 37.94799,
    lng: -122.36477
  },
  "Point Richmond": {
    lat:  37.92423,
    lng: -122.38215
  },
  "North Rodeo": {
    lat: 38.05492,
    lng: -122.2332
  },
  "South Rodeo": {
    lat: 38.03433,
    lng: -122.27033
  }
}

var refineries = {
  "Phillips 66 Refinery": {
    lat: 38.04221,
    lng: -122.25405
  },
  "Chevron Process Units": {
    lat: 37.95076,
    lng: -122.39687
  },
  "Chevron Tank Farm": {
    lat: 37.93952,
    lng: -122.40237
  },
  "Valero Benicia Refinery": {
    lat: 38.071614,
    lng: -122.139319
  }
}

function initMap(div) {
  // Initialize Google Map
  resolutionScale = window.devicePixelRatio || 1;

  var center = {};
  if(area.id === "richmond") {
    center.x = 37.938407712418034;
    center.y = -122.36615572772212;
  }
  else if(area.id === "crockett-rodeo") {
    center.x = 38.03885974316995;
    center.y = -122.23290213427731;
  }
  else if(area.id === "benicia") {
    center.x = 38.06830801346868;
    center.y = -122.1451339240234;
  }

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

  var mapOptions = {
    keyboardShortcuts: false,
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl:false,
    mapTypeControl: false,
    zoomControl: true,
    zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP
    },
    center: new google.maps.LatLng(center.x, center.y),
    styles: styleArray
  };
  map = new google.maps.Map(document.getElementById(div), mapOptions);

  //import KML with monitor and fence line locations
  //code adapted from http://stackoverflow.com/questions/29603652/google-maps-api-google-maps-engine-my-maps
  var kmlLayer = new google.maps.KmlLayer({
      map: map,
      url: PROJ_ROOT_URL + "/assets/kmz/map12.kmz",
      preserveViewport: true,
      zIndex: 0
    });

  kmlLayer.addListener('click', function(kmlEvent) {
    if(kmlEvent.featureData.name.indexOf("Monitor") > 0) {
      changeLocale(area.id, kmlEvent.featureData.description);
    }
  });

  infowindow = new google.maps.InfoWindow();
  
  // var service = new google.maps.places.PlacesService(map);
  // service.nearbySearch({
  //   location: new google.maps.LatLng(center.x, center.y),
  //   radius: 5000,
  //   type: ['school']
  // }, markerCallback);

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

function markerCallback(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0; i < results.length; i++) {
      createMarker(results[i].geometry.location, PROJ_ROOT_URL + "/assets/images/school.png", results[i].name);
    }
  }
}

function scaleIcon(marker, iconURL){
  var icon_size = zoom_level_to_marker_size[map.getZoom()];
  var icon = {
    url: iconURL,
    scaledSize: new google.maps.Size(icon_size,icon_size), // scaled size
    origin: new google.maps.Point(0,0), // origin
    anchor: new google.maps.Point(0, 0) // anchor
  };
  marker.setIcon(icon);
}

function createMarker(googLatLng, iconURL, infoContent) {
  var marker = new google.maps.Marker({
    map: map,
    position: googLatLng,
    icon: iconURL,
    content: infoContent,
  });
  google.maps.event.addListener(marker, 'click', function() {
    infowindow.setContent(infoContent);
    infowindow.open(map, this);
  });
  google.maps.event.addListener(map, 'zoom_changed', function() {
    scaleIcon(marker, iconURL);
  });
  scaleIcon(marker, iconURL);
  return marker;
}

function addMapLabels() {
  var labels = [];
  for(var coord in sourceTowers) {
    //position labels around other map features
    var align = coord.indexOf("Point Richmond") != -1 ? 'right' : 'left';
    var lat = coord.indexOf("Atchison") != -1 ? sourceTowers[coord].lat + .0041 : sourceTowers[coord].lat;
    var label = new MapLabel({
      text: coord,
      map: map,
      position: new google.maps.LatLng(lat + 0.0011, sourceTowers[coord].lng),
      align: align
    });
    labels.push(label);
  }

  for(var coord in communityMonitors) {
    var label = new MapLabel({
      text: coord,
      map: map,
      position: new google.maps.LatLng(communityMonitors[coord].lat, communityMonitors[coord].lng),
      align: 'left'
    });
    labels.push(label);
  }

  for (var coord in refineries) {
    var label = new MapLabel({
      text: coord,
      map: map,
      position: new google.maps.LatLng(refineries[coord].lat, refineries[coord].lng)
    });
    labels.push(label);
  }
  google.maps.event.addListener(map, 'zoom_changed', function() {
    //for (var label of labels:
  });
}

function generateLegend() {
  var $legend = $('<details id="legend"><summary class="no-highlight">Legend</summary></details>');
  for (var key in icons) {
    var name = key;
    var icon = icons[key];
    var div = document.createElement('div');
    div.innerHTML = '<img src="' + icon + '"> ' + name;
    $legend.append(div);
  }
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push($legend[0]);
}

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

function paintWind(site, epochTime) {
  var rectLatLng = new google.maps.LatLng(site.coordinates.latitude, site.coordinates.longitude);
  var worldPoint = mapProjection.fromLatLngToPoint(rectLatLng);
  var x = worldPoint.x * projectionScale;
  var y = worldPoint.y * projectionScale;

  // How many pixels per mile?
  var offset1mile = mapProjection.fromLatLngToPoint(new google.maps.LatLng(site.coordinates.latitude + 0.014457067, site.coordinates.longitude));
  var unitsPerMile = 1000 * (worldPoint.y - offset1mile.y);

  y_scale = site.flip_y ? -1 : 1;

  var wind_speed, wind_dir;
  var windSpeedChannel = site.channels.Wind_Speed_MPH ? site.channels.Wind_Speed_MPH : site.channels.Wind_Speed;
  if (windSpeedChannel) {
    wind_speed = getData(site, windSpeedChannel, epochTime);
    wind_dir = getData(site, site.channels.Wind_Direction, epochTime);
  }

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

      // Black dot as base to wind vector
      context.fillStyle = 'black';
      context.beginPath();
      context.arc(x, y, 0.5, 0, 2 * Math.PI, false);
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

        if(windMonitor) {
          windMonitor.setMap(null);
          google.maps.event.clearInstanceListeners(windMonitor);
        }
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

function highlightSelectedMonitors() {
  if(communityMonitor) communityMonitor.setMap(null);
  if(BAAQMDMonitor) BAAQMDMonitor.setMap(null);
  if(fencelineMonitor) fencelineMonitor.setMap(null);

  for(var feed in esdr_feeds) {
    //skip the Rodeo wind feed
    if (feed == "Rodeo fenceline_org") {
      continue;
    }
    var coords = {
      lat: esdr_feeds[feed].coordinates.latitude,
      lng: esdr_feeds[feed].coordinates.longitude
    }

    if(feed.indexOf("Fence") > 0) {
      var fencelineCoords;
      if(area.id === "richmond") {
        fencelineCoords = [coords, sourceTowers[area.locale]];
      }
      else {
        fencelineCoords = [receivers[area.locale], sourceTowers[area.locale]];
      }
      fencelineMonitor = new google.maps.Polyline({
        map: map,
        path: fencelineCoords,
        geodesic: true,
        strokeColor: '#FFF000',
        strokeOpacity: 0.5,
        strokeWeight: 10
      });
    }
    else {
      var factor, radius, center;
      factor = Math.pow(2,(13 - map.zoom));
      radius = 260 * factor;
      center = coords;
      var markerOptions = {
        strokeColor: '#FFF000',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#FFF000',
        fillOpacity: 0.5,
        map: map,
        center: {
          lat: center.lat + Math.pow(2,17-map.zoom) * .0001,
          lng: center.lng
        },
        radius: radius
      }

      if (feed.indexOf("BAAQMD") >= 0) {
        BAAQMDMonitor = new google.maps.Circle(markerOptions);
        BAAQMDMonitor.initialCenter = center;
      }
      else {
        communityMonitor = new google.maps.Circle(markerOptions);
        communityMonitor.initialCenter = center;
      }
    }
  }
  map.addListener('zoom_changed', function() {
    for (var monitor of [BAAQMDMonitor, communityMonitor]) {
      if (monitor) {
        factor = Math.pow(2,(13 - map.zoom));
        radius = 260 * factor;
        monitor.setRadius(radius);
        var lat = monitor.initialCenter.lat + Math.pow(2,17-map.zoom) * .0001;
        monitor.setCenter(new google.maps.LatLng(lat, monitor.initialCenter.lng));
      }
    }
  });
}

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

    var esdrKeys = Object.keys(esdr_feeds);
    var feedName;
    if(area.locale.indexOf("Rodeo") > 0) {
      feedName = "Rodeo fenceline_org";
    }
    else {
      for(var i=0;i<esdrKeys.length;i++) {
        if(esdrKeys[i].indexOf("Refinery") > -1) {
          feedName = esdrKeys[i];
        }
      }
    }
    var feed = esdr_feeds[feedName];
    paintWind(feed, epochTime);
  } catch(e) {
    //console.log(e);
  }
}
