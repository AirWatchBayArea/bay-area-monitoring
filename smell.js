"use strict";

var infowindow_smell
var previous_icon_size;
var smell_value_text = ["Just fine!", "Barely noticeable", "Definitely noticeable",
  "It's getting pretty bad", "About as bad as it gets!"
];
var zoom_level_to_smell_icon_size = [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 36, 60, 90, 180, 240, 360];
var rootSmellUrl = "http://api.smellpittsburgh.org/api/v1";
var ratingColors = ["rgb(0,255,0)", "rgb(248,229,64)", "rgb(218,136,0)", "rgb(235,38,103)", "rgb(95,14,54)"];
var tweleveHoursInSecs = 43200;
var smellReports = [];
var smellMarkers = {};
var commentDataByRating = {
    "1" : [],
    "2" : [],
    "3" : [],
    "4" : [],
    "5" : []
  };
var commentData = [];
var smellReportPrependText = " out of 5 rating. ";
var gwtPopUpText = "";
var isHighlighting = false;
var smellLoadingInterval = null;


function initSmells() {
  infowindow_smell = new google.maps.InfoWindow({
    pixelOffset: new google.maps.Size(-1, 0)
  });
  return new Promise(function(resolve, reject){
    $.ajax({
    url: rootSmellUrl + "/smell_reports?area=BA",
    success: function(json) {
      //remove reports not within a bounding box approximately representing BAAQMD's jurisdiction
      smellReports = json.filter(function(report) {
        return report.latitude < 38.8286208 && report.latitude > 36.906913 && report.longitude < -121.209588 && report.longitude > -123.017998;
      });
      addSmellReportsToGrapher();
      resolve();
      }
    });
  });
}

//order reports chronologically
function sortingFunction(a, b) {
  if (a[0] > b[0]) {
    return 1;
  }
  if (a[0] < b[0]) {
    return -1;
  }
  return 0;
}

function zoomMapToClickedReport(pointData) {
  var selectedPoint;
  for (var i=0;i<commentData.length;i++) {
    if(commentData[i][0] == pointData.x) {
      selectedPoint = commentData[i];
    }
  }
  if (selectedPoint) {
    var latLngArray = selectedPoint[selectedPoint.length - 1].split(",");
    var latLng = new google.maps.LatLng(latLngArray[0], latLngArray[1]);
    map.panTo(latLng);
    map.setZoom(12);
    Object.keys(smellMarkers).forEach( function(i) {
      if (smellMarkers[i].position.equals(latLng)) {
        infowindow_smell.setContent(smellMarkers[i].content);
        infowindow_smell.open(map,smellMarkers[i]);
      }
    });
  }
}

function addSmellReportsToGrapher() {
  var smellPlotIndex = 0;
  series[smellPlotIndex] = {};
  series[smellPlotIndex].id = smellPlotIndex;

  for (var report of smellReports) {
    var mean = 1;
    // TODO: Deal with comment overlaps
    //var dataPoint = findPoint(timestamp);
    //if (dataPoint) mean = 1.1
    var notes = report.smell_value + smellReportPrependText + report.smell_description + "," + report.feelings_symptoms;
    var dataObj = [report.created_at, mean, 0, 1, ((new Date(report.created_at * 1000)).toTimeString().substring(0,8)) + " - " + notes, report.latitude + "," + report.longitude];
    commentDataByRating[report.smell_value].push(dataObj);
    commentData.push(dataObj);
  }

  commentData.sort(sortingFunction);

  // Add chart
  var plotContainerId, yAxisId;
  var plots = [];
  var lastHighlightDate = null;
  loadedSeries.push("Smell Reports");

  for (var rating in commentDataByRating) {
    (function(rating){
      commentDataByRating[rating].sort(sortingFunction);

      var commentDatasource = function(level, offset, successCallback) {
        var json = {
           "fields" : ["time", "mean", "stddev", "count", "comment"],
           "level" : level,
           "offset" : offset,
           "sample_width" : Math.pow(2, level),
           "data" : commentDataByRating[rating],
           "type" : "value"
        };
        successCallback(JSON.stringify(json));
      };

      var plotId = smellPlotIndex + "_plot_" + rating;
      if ($(".annotationChart").length === 0) {
        var row = $('<tr class="annotationChart grapher_row"></tr>');
        plotContainerId = smellPlotIndex + "_plot_container";
        yAxisId = smellPlotIndex + "_yaxis";
        row.append('<td class="annotationChartTitle" style="color: black; background:white">Smell Reports</td>');
        row.append('<td id="' + plotContainerId + '" class="annotationContent" style="height:35px;"></td>');
        row.append('<td id="' + yAxisId + '" class="annotationChartAxis" style="display: none"></td>');
        $('#dateAxisContainer').after(row);
        plotManager.addDataSeriesPlot(plotId, commentDatasource, plotContainerId, yAxisId);
        plotManager.getPlotContainer(plotContainerId).setAutoScaleEnabled(true, false);
        plotManager.getYAxis(yAxisId).constrainMinRangeTo(-3,4);
        plotManager.getYAxis(yAxisId).setRange(-3,4);
      }
      else {
        plotManager.getPlotContainer(plotContainerId).addDataSeriesPlot(plotId, commentDatasource, yAxisId);
      }
      var plot = plotManager.getPlot(plotId);

      plot.addDataPointListener(function(pointData, event) {
        if (event && event.type == "mousedown") {
          zoomMapToClickedReport(pointData);
        }
      });

      var ratingColor = ratingColors[rating - 1];

      var cursorColor = (plots.length > 0) ? "rgba(0,0,0,0)" : "#2A2A2A";
      plot.setStyle({
        "styles": [
          { "type" : "line", "lineWidth" : 1, "show" : false, "color" : ratingColor },
          { "type" : "circle", "radius" : 10, "lineWidth" : 3, "show" : true, "color" : ratingColor, fill : true }
        ]
      });
      plots.push(plot);
      series[smellPlotIndex].p = plots;
    })(rating);
  }
  drawSmellReports();
}

function drawSmellReports(epochTime) {
  if (!epochTime) {
    epochTime = plotManager.getDateAxis().getCursorPosition();
  }

  if (!smellReports) return;
  for (var j = 0; j < smellReports.length; j++) {
    var report = smellReports[j];
    var smellTime = report.created_at;
    if (epochTime >= smellTime && epochTime <= (smellTime + tweleveHoursInSecs) && !smellMarkers.hasOwnProperty(j)) {
      drawSingleSmellReport(report, j);
    }
  }
  for (var markerKey in smellMarkers) {
    var marker = smellMarkers[markerKey];
    var smellTime = marker.created_date / 1000;
    if (epochTime < smellTime || epochTime > smellTime + tweleveHoursInSecs) {
      marker.setMap(null);
      delete smellMarkers[markerKey];
    }
  }
 }

 function drawSingleSmellReport(report_i, index) {
   var latlng = {"lat": report_i.latitude, "lng": report_i.longitude};

   // Add marker
   var date = new Date(report_i.created_at * 1000);
   var date_str = date.toLocaleString();
   var smell_value = report_i.smell_value;
   var feelings_symptoms = report_i.feelings_symptoms ? report_i.feelings_symptoms : "No data.";
   var smell_description = report_i.smell_description ? report_i.smell_description : "No data.";
   var icon_size = zoom_level_to_smell_icon_size[map.getZoom()];
   previous_icon_size = icon_size;
   var icon_size_half = icon_size / 2;
   var marker = new google.maps.Marker({
     position: latlng,
     map: map,
     created_date: date.getTime(),
     smell_value: report_i.smell_value,
     content: '<b>Date:</b> ' + date_str + '<br>'
       + '<b>Smell Rating:</b> ' + smell_value + " (" + smell_value_text[smell_value - 1] + ")" + '<br>'
       + '<b>Symptoms:</b> ' + feelings_symptoms + '<br>'
       + '<b>Smell Description:</b> ' + smell_description,
     icon: {
       url: getSmellColor(report_i.smell_value - 1),
       scaledSize: new google.maps.Size(icon_size, icon_size),
       size: new google.maps.Size(icon_size, icon_size),
       origin: new google.maps.Point(0, 0),
       anchor: new google.maps.Point(icon_size_half, icon_size_half)
     },
     zIndex: report_i.smell_value,
     opacity: 0.85
   });

   // Add marker event
   marker.addListener("click", function () {
     infowindow_smell.setContent(this.content);
     infowindow_smell.open(map, this);
   });

   // Save markers
   smellMarkers[index] = marker;
 }

 function getSmellColor(idx) {
   var path = "assets/images/";
   var smell_color = ["smell_1.png", "smell_2.png", "smell_3.png", "smell_4.png", "smell_5.png"];
   var smell_color_med = ["smell_1_med.png", "smell_2_med.png", "smell_3_med.png", "smell_4_med.png", "smell_5_med.png"];
   var smell_color_big = ["smell_1_big.png", "smell_2_big.png", "smell_3_big.png", "smell_4_big.png", "smell_5_big.png"];
   var map_zoom = map.getZoom();
   if (map_zoom >= 20) {
     return path + smell_color_big[idx];
   } else if (map_zoom < 20 && map_zoom >= 17) {
     return path + smell_color_med[idx];
   } else {
     return path + smell_color[idx];
   }
 }
