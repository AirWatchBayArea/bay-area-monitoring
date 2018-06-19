"use strict";
var previous_icon_size;
var smell_value_text = ["Just fine!", "Barely noticeable", "Definitely noticeable",
  "It's getting pretty bad", "About as bad as it gets!"
];
var zoom_level_to_smell_icon_size = [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 36, 60, 90, 180, 240, 360];
var rootSmellUrl = "http://api.smellpittsburgh.org/api/v1";
//                     lime               yellow            orange           crimson       rebeccapurple
var ratingColors = ["rgb(0,255,0)", "rgb(255,255,0)", "rgb(255,165,0)", "rgb(255,0,0)", "rgb(102,51,153)"];
var tweleveHoursInSecs = 43200;
var smellReports = [];
var smellMarkers = [];
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
var smellLoadingInterval = null;

//initialize smell reports and add to grapher/map
function initSmells() {
  smellReports.length = 0;
  smellMarkers.length = 0;
  infowindow = new google.maps.InfoWindow({
    pixelOffset: new google.maps.Size(-1, 0)
  });
  return updateSmellList(function(){
    addSmellReportsToGrapher();
    processSmellReportsForMap();
  });
}

//retrieve and cache all smell reports, callback on success
function updateSmellList(callback){
  return new Promise(function(resolve, reject){
    $.ajax({
    url: rootSmellUrl + "/smell_reports?area=BA",
    success: function(json) {
      //remove reports not within a bounding box approximately representing BAAQMD's jurisdiction
      smellReports = json.filter(function(report) {
        return report.latitude < 38.8286208 && report.latitude > 36.906913 && report.longitude < -121.209588 && report.longitude > -123.017998;
      });
      if(callback){
        callback();
      }
      resolve(smellReports);
    },
    error: function(err){
      reject(err);
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

//on map smell report click, zoom to smell report
function zoomMapToClickedReport(pointData) {
  var selectedPoint;
  for (var i=0;i<commentData.length;i++) {
    if(Math.abs(commentData[i][0] - pointData.x) <= 1) {
      selectedPoint = commentData[i];
    }
  }
  if (selectedPoint) {
    var latLngArray = selectedPoint[selectedPoint.length - 1].split(",");
    var latLng = new google.maps.LatLng(latLngArray[0], latLngArray[1]);
    map.panTo(latLng);
    for (var i = smellMarkers.length - 1; i >= 0; i--) {
      if (smellMarkers[i].position.equals(latLng)) {
        infowindow.setContent(smellMarkers[i].content);
        infowindow.open(map,smellMarkers[i]);
      }
    }
  }
}

//add smell report to grapher
function addSmellReportsToGrapher() {
  //cache smell report index in series
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
  loadedChannelLabels["Smell Reports"] = {};
  loadedChannelLabels["Smell Reports"].plotContainerIdx = 0;

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
        //add chart area to geapher
        var row = $('<tr class="annotationChart grapher_row"></tr>');
        plotContainerId = smellPlotIndex + "_plot_container";
        yAxisId = smellPlotIndex + "_yaxis";
        row.append('<td class="annotationChartTitle" style="color: black; background:white" data-localize="dashboard.smell-reports"></td>');
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
}
//reset smellMarkers list and draw smell reports on map
function processSmellReportsForMap(){
  smellMarkers.length = 0;

  for (var j = 0; j < smellReports.length; j++) {
    smellMarkers[j] = drawSingleSmellReport(smellReports[j]);
  }
  drawSmellReports();
}

//set marker visible if smell report if time is in range
function drawSmellReports(range) {
  if (!range) {
    range = plotManager.getDateAxis().getRange();
  }

  for (var markerKey in smellMarkers) {
    var marker = smellMarkers[markerKey];
    var smellTime = marker.created_date / 1000;
    marker.setVisible(smellTime >= range.min && smellTime <= range.max);
  }
 }

 //creates a smell marker at a given location
 function drawSingleSmellReport(report_i) {
   var latlng = {"lat": report_i.latitude, "lng": report_i.longitude};

   // Add marker
   var date = new Date(report_i.created_at * 1000);
   var date_str = date.toLocaleString();
   var smell_value = report_i.smell_value;
   var feelings_symptoms = report_i.feelings_symptoms ? report_i.feelings_symptoms : "No data.";
   var smell_description = report_i.smell_description ? report_i.smell_description : "No data.";
   // var icon_size = zoom_level_to_smell_icon_size[map.getZoom()];
   // previous_icon_size = icon_size;
   // var icon_size_half = icon_size / 2;
   // var marker = new google.maps.Marker({
   //   position: latlng,
   //   map: map,
   //   created_date: date.getTime(),
   //   smell_value: report_i.smell_value,
   //   content: ['<b>Date:</b> ',date_str,'<br>',
   //                '<b>Smell Rating:</b> ',smell_value," (",smell_value_text[smell_value - 1],")",'<br>',
   //                '<b>Symptoms:</b> ',feelings_symptoms,'<br>',
   //                '<b>Smell Description:</b> ',smell_description].join(''),
   //   icon: {
   //     url: getSmellColor(report_i.smell_value - 1),
   //     scaledSize: new google.maps.Size(icon_size, icon_size),
   //     size: new google.maps.Size(icon_size, icon_size),
   //     origin: new google.maps.Point(0, 0),
   //     anchor: new google.maps.Point(icon_size_half, icon_size_half)
   //   },
   //   zIndex: report_i.smell_value,
   //   opacity: 0.85
   // });

   var content = ['<b>Date:</b> ',date_str,'<br>',
                  '<b>Smell Rating:</b> ',smell_value," (",smell_value_text[smell_value - 1],")",'<br>',
                  '<b>Symptoms:</b> ',feelings_symptoms,'<br>',
                  '<b>Smell Description:</b> ',smell_description].join('');
   var marker = createMarker(latlng,
                              getSmellColor(report_i.smell_value - 1),
                              content);

   marker.setZIndex(report_i.smell_value*100);
   marker.created_date = date.getTime();

   return marker;
 }

 //creates a smell icon from a given smell value
 function getSmellColor(idx) {
   return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: ratingColors[idx],
            strokeColor: 'white',
            strokeWeight: 3,
            scale: 7.5,
            fillOpacity: 1.0,
          };
 }
