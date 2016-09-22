"use strict";

var map;
var canvasLayer;
var context;
var contextScale;
var resolutionScale;
var mapProjection;
var projectionScale = 2000;
var y_scale;
var windMonitor;

function initMap(div) {
  // Initialize Google Map
  resolutionScale = window.devicePixelRatio || 1;

  var center = {};
  if(area.id === "richmond") {
    center.x = 37.951468927073634;
    center.y = -122.36782797656247;
  }
  else if(area.id === "crockett-rodeo") {
    center.x = 38.03885974316995;
    center.y = -122.23290213427731;
  }

  var mapOptions = {
    keyboardShortcuts: false,
    scaleControl: true,
    zoom: 13,
    center: new google.maps.LatLng(center.x, center.y)
  };
  map = new google.maps.Map(document.getElementById(div), mapOptions);

  //import KML with monitor and fence line locations
  //code adapted from http://stackoverflow.com/questions/29603652/google-maps-api-google-maps-engine-my-maps
  //var myMapsId = '1K27qUtzHhKofoXuUA1001rBMW8I';
  new google.maps.KmlLayer({
      map: map,
      url: 'http://www.jetslab.org/bay-area-monitoring/monitor_locations_no_fenceline_pins.kmz',
      preserveViewport: true
    });

  // initialize the canvasLayer
  var canvasLayerOptions = {
    map: map,
    animate: false,
    updateHandler: repaintCanvasLayer,
    resolutionScale: resolutionScale
  };
  canvasLayer = new CanvasLayer(canvasLayerOptions);
  context = canvasLayer.canvas.getContext('2d');
  //window.addEventListener('resize', function () { google.maps.event.trigger(map, 'resize'); }, false);
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
  if (site.channels.Wind_Speed_MPH) {
    wind_speed = getData(site, site.channels.Wind_Speed_MPH, epochTime);
    wind_dir = getData(site, site.channels.Wind_Direction, epochTime);
  }

  if (wind_speed && wind_dir) {
    if (wind_speed > 0.1) {
      var wind_dir_radians = wind_dir * Math.PI / 180;
      var dx = -Math.sin(wind_dir_radians);
      var dy =  Math.cos(wind_dir_radians);
      var d = 1;
      var length = unitsPerMile * wind_speed / 5;

      context.strokeStyle = '#0000ee';
      context.lineWidth = Math.max(2.0 / contextScale, d * 0.75);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (length - d * 1) * dx,
                     y + (length - d * 1) * dy);
      context.stroke();

      context.fillStyle = '#0000ee';
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
      context.arc(x, y, 1.18, 0, 2 * Math.PI, false);
      context.fill();

      //show wind speed value on hover
        var windDirs = ["SW", "NW", "NE", "SE"];
        var contentString = "Wind Speed (mph): " + wind_speed + "\n Wind Direction: " + windDirs[Math.floor(wind_dir/90)];
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
          radius: wind_speed*200
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
  //console.log('getData');

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
