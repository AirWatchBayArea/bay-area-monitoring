"use strict";

jQuery.support.cors = true;
var zoomify, locationDivId, timelapse, timelapseFeedUnavailable, hashVars, dateAxis, dateAxisListener, playInterval;
var esdr_feeds = {};
var series = [];
var loadedChannelLabels = {};
var seriesIdx = 0;
var plotManager;
var dateAxisRange;
var area = {};
var currentLocation = "shenango1";
var currentDate = (new Date()).toISOString().substring(0,10);;
var ESDR_API_ROOT_URL = 'https://esdr.cmucreatelab.org/api/v1';
var PROJ_ROOT_URL = 'https://airwatchbayarea.org';
var TILE_BOUNDARY_SENTINEL_VALUE = -1e+308;
var fixedCursorPosition;
var grapherReady = false;
var grapherLoadedInterval = null;
var isAutoScaleOn = true;

var monitorTypeColors = {
  "Refinery" : "rgb(245,124,0)",
  "Community" : "rgb(1,87,155)",
  "BAAQMD" : "rgb(103,58,183)",
  "PurpleAir" : "rgb(170,68,170)"
};

//the monitor associated with each of the locations, with array of ESDR Feed ID
// var feedMap = {
//   "Atchison Village" : [4910, 4909],
//   "North Richmond" : [4911, 4912],
//   "Point Richmond" : [4913, 4914],
//   "North Rodeo" : [4902, 4903, 4850],
//   "South Rodeo" : [4901, 4903, 4846, 10011],
//   "Benicia": [12201, 8421],
//   "Vallejo": [4857],
//   "Martinez": [4849]
// };
var feedMap = {
  "Atchison Village" : [4910, 4909, 38825],
  "North Richmond" : [4911, 4912, 38816, 38818],
  "Point Richmond" : [4913, 4914, 38817],
  "North Rodeo" : [4902, 38294],
  "South Rodeo" : [4901, 10011, 38295],
  "Benicia (South)": [
    26346, 26347, 26351, 26394,
    26224, 26228, 26229, 26230,
    59678, 59690, 59692,
  ],
  "Benicia (South West)": [
    26225, 59672, 59674, 59684,
    59686, 59698, 59702,
  ],
  "Benicia (North)": [
    26345, 26349, 26350, 26354, 26348,
    26227, 26232, 59676, 59680,
    59682, 59688, 59696, 59689, 59700
  ],
  "Vallejo": [
    // Previous sensor list (may have included indoor monitors)
    // 12688, 13332, 12931, 14000, 13302,
    // 13470, 12964, 14933, 12756, 13169,
    // 13639, 14840, 14615, 12682, 14887,
    // 13820, 13778, 12966, 13377, 13815, 14284,
    14840, 14841, 33095, 36715, 14933, 14934,
    24327, 24328, 13470, 13471, 
    38638, 38639, 38649, 38647, 38641,
    38637, 38643, 38644, 38645, 38646],
  "El Sobrante" : [13310],
  "El Cerrito" : [13304],
  "Berkeley" : [12848],
  "Martinez": [38674, 38675, 38676, 38677, 38678,
               38680, 38681, 38682, 38683],
  "Clyde": [17230],
  "BAAQMD":[4850, 4846, 4857, 4849]
};

var feedIDtoPlotId = {}

var healthLimitMap = {
  "Benzene (ppb)" : 1,
  "Black Carbon (µg/m³)": 5,
  "Hydrogen Sulfide (ppb)": 8,
  "Sulfur Dioxide (ppb)": 75,
  "Toluene (ppb)": 70,
  "Xylene (ppb)": 50,
  "Ethylbenzene (ppb)": 60,
  "VOC (ppb)": 345,
  "Dust (µg/m³)": 10,
  "PM 2 5 (µg/m³)": 35,
  "PM2 5 (µg/m³)": 35,
};

var communityDetectionLimitMap = {
  "Benzene (ppb)" : 0.5,
  "Hydrogen Sulfide (ppb)": 2,
  "Toluene (ppb)": 0.5,
  "Xylene (ppb)": 0.5,
  "Ethylbenzene (ppb)": 0.5,
  "Black Carbon (µg/m³)": 0.05
};

var refineryDetectionLimitMap = {
  "Benzene (ppb)" : 5,
  "Hydrogen Sulfide (ppb)": 30,
  "Sulfur Dioxide (ppb)": 5,
  "Toluene (ppb)": 5,
  "Xylene (ppb)": 5
};

function selectArea(targetArea, locale) {
  area.id = targetArea;
  if(!locale && targetArea === "richmond") {
    area.locale = "Atchison Village";
  }
  else if (!locale && targetArea === "crockett-rodeo") {
    area.locale = "North Rodeo";
  }
  else if(!locale && targetArea === "benicia") {
    area.locale = "Benicia (South)"
  }
  else if(!locale && targetArea === "vallejo") {
    area.locale = "Vallejo"
  }
  else if(!locale && targetArea === "martinez") {
    area.locale = "Martinez"
  }
  else {
    area.locale = locale;
  }
  updateLocalePicker();
}

function changeLocale(targetArea, locale) {
  selectArea(targetArea, locale);
  refreshChannelPage();
}

function refreshChannelPage() {
  esdr_feeds = {};
  feedIDtoPlotId = {}
  plotManager.getDateAxis().removeAxisChangeListener(dateAxisListener);
  plotManager.removeAllPlotContainers();
  $("#grapher > tbody > tr").not("tr:first").remove();
  series = [];
  loadedChannelLabels = {};
  $("#auto_scale_toggle_button").addClass("ui-icon-locked");
  $("#auto_scale_toggle_button").removeClass("ui-icon-unlocked");
  $("#play").off();
  $("#zoomGrapherOut").off();
  $("#zoomGrapherIn").off();
  $(".collapse-handle").off();
  $("#legendMenu").empty();
  window.removeEventListener('keydown',playOnSpacebarPress);
  channelPageSetup();
}

function play() {
  cursorInBound();
  var dateAxis = plotManager.getDateAxis();
  var currentTime = Number(dateAxis.getCursorPosition());
  var range = dateAxis.getRange().max - dateAxis.getRange().min;
  var delta = Math.abs($("#slider").slider("value") - 100) * 7 + 50;
  plotManager.getDateAxis().setCursorPosition(currentTime + (range / delta));
  playInterval = window.requestAnim(play);
};

function pause() {
  window.cancelAnimationFrame(playInterval);
}

var playOnSpacebarPress = function(e) {
  if(e.keyCode == 32 && e.target == document.body) {
    playCallback();
  }
}

function showContent() {
  $("#loading").hide();
  $("#content").css("visibility", "visible");
}

function generateShareLink() {
  var range = plotManager.getDateAxis().getRange();
  var link = PROJ_ROOT_URL + "#loc=" + area.id + "&monitor=" + (area.locale ? area.locale.replace(/ /g,"-") : "") + "&time=" + range.min + "," + range.max;
  $("#shareLink")
  .text(link)
  .attr('href',link);;
  $("#dialog").dialog("open");
}

function toggleMenu(e, menu) {
  //close menu
  if ($(menu).is(":visible")) {
    $("div.menu:visible").hide();
    $("div.open").removeClass("open");
    $("#menuContainer").toggleClass("collapsed");
  }
  //change tabs
  else if (!$("#menuContainer").hasClass("collapsed")){
    $("div.menu:visible").hide();
    $(menu).toggle();
    $("div.open").removeClass("open");
    $(e).addClass("open");
  }
  //open menu
  else {
    $(menu).toggle();
    $("#menuContainer").toggleClass("collapsed");
    $(e).addClass("open");
  }
}

var switchCollapseArrow = function() {
  $(".collapse-icon").toggleClass("glyphicon-menu-right");
  $(".collapse-icon").toggleClass("glyphicon-menu-left");
}

function toggleCalendar(){
  $('#calendarMenu').animate({width:'toggle', opacity:'toggle'},800, "easeInOutBack");
}

function loadCalendar(startingDate) {
  currentDate = startingDate;
  var dateArray = startingDate.split("-");
  $("#datepicker").datepicker({
    defaultDate : new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
    minDate : new Date(2015, 5),
    onSelect : selectDay,
    beforeShowDay : highlightDays
  });
  $("#datepicker").datepicker("show");
}

function highlightDays(date) {
  date = $.datepicker.formatDate('yy-mm-dd', date);
  //if (cached_breathecam.datasets[date])
    return [true, 'date-highlight'];
  //else
    //return [false, ''];
}

function selectDay(dateText, dateElem) {
  var date = $.datepicker.formatDate('yy-mm-dd', new Date(dateText));
  //var path = cached_breathecam.datasets[date];
  //if (timelapse && path) {

    $(".gwt-PopupPanel").remove();
    currentDate = date;
    var dayStart = setGraphTimeRange(date);
    plotManager.getDateAxis().setCursorPosition(dayStart);
    repaintCanvasLayer(dayStart);
    //timelapse.loadTimelapse(path, null, null, true);
  //}
}

function getFormattedTime(date) {
  var hours = date.getHours() === 0 ? "12" : date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
  var minutes = (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
  var seconds = date.getSeconds();
  var ampm = date.getHours() < 12 ? "AM" : "PM";
  var formattedTime = hours + ":" + minutes + ":" + seconds + " " + ampm;
  return formattedTime;
}

function requestEsdrExport(requestInfo, callBack) {
  $.ajax({
    crossDomain: true,
    type: "GET",
    dataType: "text",
    url: ESDR_API_ROOT_URL + "/feeds/" + requestInfo.feed_id + "/channels/" + requestInfo.channels + "/export",
    data: { from: requestInfo.start_time, to: requestInfo.end_time, FeedApiKey: requestInfo.api_key, format: requestInfo.format || 'csv'},
    success: function(data) {
      if (typeof(callBack) === "function")
        callBack(data);
    },
    failure: function(data) {
      console.log('Failed to load sensor data.');
    },
    headers: requestInfo.headers
  });
}

function parseEsdrCSV(csvData, sensor) {
  var csvArray = csvData.split("\n");
  var headingsArray = csvArray[0].split(",");
  // First row is the CSV headers, which we took care of above, so start at 1.
  for (var i = 1; i < csvArray.length; i++) {
    var csvLineAsArray = csvArray[i].split(",");
    // First entry is the EPOC time, so start at index 1.
    for (var j = 1; j < csvLineAsArray.length; j++) {
      var tmpChannelHeading = headingsArray[j].split(".");
      var channelHeading = tmpChannelHeading[tmpChannelHeading.length - 1];
      var timeStamp = sensor.channels[channelHeading].hourly ? (csvLineAsArray[0] - 1800): csvLineAsArray[0];
      sensor.channels[channelHeading].summary[timeStamp] = parseFloat(csvLineAsArray[j]);
    }
  }
}

function setupTileSource(channelName, feedAPIKey) {
  return function(level, offset, successCallback, failureCallback) {
    $.ajax({
      type: "GET",
      dataType: "json",
      url: ESDR_API_ROOT_URL + "/feeds/" + feedAPIKey + "/channels/" + channelName + "/tiles/" + level + "." + offset,
      success: function(json) {
        for (var i = 0; i < json.data.data.length; i++) {
          //if reading is 0, tell grapher not to draw it
          if(json.data.data[i][1] == 0) {
            json.data.data[i][1] = TILE_BOUNDARY_SENTINEL_VALUE;
          }
        }
        successCallback(JSON.stringify(json.data));
      },
      failure: failureCallback
    });
  };
};

var createChart = function(feed, channelName, feedAPIKey) {
  var datasource = setupTileSource(channelName, feedAPIKey);

  //Add charts
  var channelLabel = feed.channels[channelName].graphMetaData.label;

  var idx = -1;
  if (loadedChannelLabels[channelLabel]) {
    var idx = loadedChannelLabels[channelLabel].plotContainerIdx;
  }

  var seriesIdx = series.length;
  var plotContainerId = seriesIdx + "_plot_container";
  var plotId = seriesIdx + "_plot";
  var yAxisId = seriesIdx + "_yaxis";
  if (idx != -1) {
    var tmpId = new Date().getTime() + Math.ceil(Math.random() * 100000);
    seriesIdx = idx;
    plotId = seriesIdx + "_plot" + tmpId;
    plotContainerId = idx + "_plot_container";
    yAxisId = seriesIdx + "_yaxis";
    var plotContainer = plotManager.getPlotContainer(plotContainerId);
    plotContainer.addDataSeriesPlot(plotId, datasource, yAxisId);
    loadedChannelLabels[channelLabel].plotCount += 1;
  } else {
    series[seriesIdx] = {};
    series[seriesIdx].id = seriesIdx;
    series[seriesIdx].pc = [];
    // Add chart html to page since this chart does not exist yet
    var row = $('<tr class="chart"' + 'data-channel=' + channelName + '></tr>');
    var $chartTitle = $('<td class="chartTitle"><div class=title>' + feed.channels[channelName].graphMetaData.label + '</div></td>');
    var $chemicalInfo = $(['<a class="chartButton user-guide-chem-link" title="View Chemical Info"href="https://docs.google.com/document/d/1RL5MGzxdswD37jXnv-9_Skl638ntj7_2OR87YZtcOoM/pub#h.y2qt3fnrqosf" target="_blank" data-localize="dashboard.chemical-info">',
                            '</a>'].join(''));
    var $dataView = $(['<a class="chartButton user-guide-chem-link" title="View Data on ESDR" data-localize="dashboard.download">',
                            '</a>'].join(''));
    $dataView
      .click(function(event) {
        var channelName = event.currentTarget.parentElement.parentElement.parentElement.attributes["data-channel"].value;
        var channels = "#channels=";
        for(var feed of feedMap[area.locale]) {
          channels += feed + "." + channelName + ",";
        }
        channels = channels.slice(0,channels.length-1);
        var range = plotManager.getDateAxis().getRange();
        var time = range.min + "," + range.max;
        var cursor = plotManager.getDateAxis().getCursorPosition();
        // var win = window.open("https://docs.google.com/document/d/1RL5MGzxdswD37jXnv-9_Skl638ntj7_2OR87YZtcOoM/pub#h.y2qt3fnrqosf", "_blank");
        var win = window.open("https://esdr.cmucreatelab.org/browse/"+channels+"&time=" + time + "&zoom=10&center=37.89143760613535,-121.80124835968014&cursor=" + cursor, "_blank");
        if (win) {
          win.focus();
        }
        else {
          alert('Please allow popups for this website in order to go to detail view on ESDR');
        }
      });

    var $buttonContainer = $('<div class="chartButtonContainer"></div>')
    $buttonContainer.append($chemicalInfo);
    $buttonContainer.append($dataView);
    $chartTitle.append($buttonContainer);
    row.append($chartTitle);
    row.append('<td id="' + plotContainerId + '" class="chartContent"></td>');
    row.append('<td id="' + yAxisId + '" class="chartAxis"></td>');
    $('#grapher').append(row);

    addGraphOverlays(seriesIdx, channelLabel);

    plotManager.addDataSeriesPlot(plotId, datasource, plotContainerId, yAxisId);
    loadedChannelLabels[channelLabel] = {};
    loadedChannelLabels[channelLabel].plotContainerIdx = Object.keys(loadedChannelLabels).length - 1;
    loadedChannelLabels[channelLabel].plotCount = 1;

    adjustGraphOverlays(seriesIdx, channelLabel);
    plotManager.getYAxis(yAxisId).addAxisChangeListener(function() {
      adjustGraphOverlays(seriesIdx, channelLabel);
    });
    window.setTimeout(function() { $(window).trigger('resize'); }, 50);
  }
  //var cursorColor = (feed.isDouble) ? "rgba(0,0,0,0)" : "#2A2A2A";
  var color_line = monitorTypeColors[feed.type];
  plotManager.getPlot(plotId).addDataPointListener(function(val) {
    var valueHoverElement = $("#valueHover" + seriesIdx);
    if (val == null) {
       valueHoverElement.empty().hide();
    }
    else {
       valueHoverElement.text(val.valueString.substr(0,10) + " at " + val.dateString).show();
    }
 });
plotManager.getPlot(plotId).setStyle({
  /*"cursor" : {
    "color" : cursorColor,
    "lineWidth" : 1
  },*/
  "styles": [
    {
      "type" : "line",
      "lineWidth" : 4,
      "show" : true,
      "color" : color_line
    },

    {
      "type" : "circle",
      "radius" : 2,
      "lineWidth" : 2,
      "show" : true,
      "color" : color_line,
      "fill" : true
   }
  ],
});
  var plotContainer = plotManager.getPlotContainer(plotContainerId);
  setMinRangeToHealthLimit(plotContainer, channelLabel);
  plotContainer.setAutoScaleEnabled(isAutoScaleOn, isAutoScaleOn);
  series[seriesIdx].pc.push(plotContainer);
  if(!(feed.feed_id in feedIDtoPlotId)){
    feedIDtoPlotId[feed.feed_id] = []
  }
  feedIDtoPlotId[feed.feed_id].push([plotContainerId, plotId, feed.channels[channelName].graphMetaData.label])
};

function getDataSummaryInRange(feedId){
  if (feedId in feedIDtoPlotId){
    var summaryList = []
    var plotInfoList = feedIDtoPlotId[feedId]
    for(var i = 0; i < plotInfoList.length; i++){
        var plotInfo = plotInfoList[i];
        var plotContainerId = plotInfo[0];
        var plotId = plotInfo[1];
        var plotName = plotInfo[2]
        var summary = plotManager.getPlotContainer(plotContainerId).getPlot(plotId).getStatisticsWithinRange(plotManager.getDateAxis().getRange());
        if(summary.hasData){
          summaryList.push([plotName, summary]);
        }
    }
    return summaryList;
  }else{
    console.log("feed id does not exist in plots.")
    return []
  }
}

function setMinRangeToHealthLimit(plotContainer, channelLabel) {
  var healthLimit = healthLimitMap[channelLabel];
  var pad = healthLimit * 0.1;
  plotContainer.getYAxis().constrainMinRangeTo(-pad,healthLimit+pad);
  plotContainer.getYAxis().setRange(-pad,healthLimit+pad);
}

function getChannelLabel(seriesIdx) {
  return $("#" + seriesIdx + "_plot_container").parent().find('.chartTitle').find('.title').text();
}

function addGraphOverlays(seriesIdx) {
  var channelLabel = getChannelLabel(seriesIdx);
  if (healthLimitMap[channelLabel]) {
    $("#" + seriesIdx + "_plot_container").append("<div id='healthDangerBox" + seriesIdx + "' class='healthDangerBox'></div>");
  }
  if (area.id == "richmond" && communityDetectionLimitMap[channelLabel]) {
    $("#" + seriesIdx + "_plot_container").append("<div id='greyAreaBox" + seriesIdx + "' class='greyAreaBox'></div>");
  }
  if (refineryDetectionLimitMap[channelLabel]) {
    $("#" + seriesIdx + "_plot_container").append("<div id='refineryDetectionLimit" + seriesIdx + "' class='refineryDetectionLimit'></div>");
  }
  $("#" + seriesIdx + "_plot_container").append("<div id='valueHover" + seriesIdx + "' class='valueHover'></div>");
}

function adjustGraphOverlays(seriesIdx) {
  var channelLabel = getChannelLabel(seriesIdx);
  var axis = plotManager.getYAxis(seriesIdx + "_yaxis");
  //var axis = series[seriesIdx].axis;
  var chartHeight = $('.chart').height();
  var range = axis.getRange();

  var level = healthLimitMap[channelLabel];
  var overlayHeight = (range.max - level) / (range.max - range.min) * chartHeight;
  //var overlayHeight = (axis.getMax() - level) / (axis.getMax() - axis.getMin()) * chartHeight;
  $('#healthDangerBox' + seriesIdx)
      .height(overlayHeight)
      .css("max-height", chartHeight);

  level = communityDetectionLimitMap[channelLabel];
  overlayHeight = (range.max - level) / (range.max - range.min) * chartHeight;
  var borderVisible;
  //overlayHeight > 2 ? borderVisible = "2px" : borderVisible = "0px";
  $('#greyAreaBox' + seriesIdx)
      .height(overlayHeight)
      .css({"max-height": chartHeight/*, "border-bottom-width": borderVisible*/});

  level = refineryDetectionLimitMap[channelLabel];
  overlayHeight = (range.max - level) / (range.max - range.min) * chartHeight;
  overlayHeight > 2 ? borderVisible = "2px" : borderVisible = "0px";
  $('#refineryDetectionLimit' + seriesIdx)
      .height(overlayHeight)
      .css({"max-height": chartHeight, "border-bottom-width": borderVisible});
}

function refreshGrapher(){
  var min_time = plotManager.getDateAxis().getRange().min;
  var max_time = plotManager.getDateAxis().getRange().max;
  plotManager.getDateAxis().setRange(min_time - .001, max_time);
}

function zoomGrapher(scale) {
  var min_time = plotManager.getDateAxis().getRange().min;
  var max_time = plotManager.getDateAxis().getRange().max;
  var mean_time = (max_time+min_time)/2;
  var range_half_scaled = scale*(max_time-min_time)/2;
  plotManager.getDateAxis().setRange(mean_time-range_half_scaled,mean_time+range_half_scaled);
}

function grapherZoomToMonth() {
  var max_time = Date.now()/1000;
  var length = 2487540;
  plotManager.getDateAxis().setRange(max_time-length,max_time);
}

function grapherZoomToWeek() {
  var max_time = Date.now()/1000;
  var weekLength = 590707;
  plotManager.getDateAxis().setRange(max_time-weekLength,max_time);
}

function grapherZoomToDay() {
  var max_time = Date.now()/1000;
  var dayLength = 82918;
  plotManager.getDateAxis().setRange(max_time-dayLength,max_time);
}

function cursorInBound(){
  var dateAxis = plotManager.getDateAxis();
  var dateProperties = dateAxis.getRange();
  dateProperties.cursorPosition = dateAxis.getCursorPosition();
  if (dateProperties.cursorPosition < dateProperties.min || !dateProperties.cursorPosition){
      plotManager.getDateAxis().setCursorPosition(dateProperties.min);
  }else if(dateProperties.cursorPosition > dateProperties.max){
      plotManager.getDateAxis().setCursorPosition(dateProperties.max);
  }
}

function setSizes() {
  
  if ($('.chart').length && !$('.no-feeds').length){
     $('#map_parent').css('height', '45%');
    var chartsAreaHeight = Math.floor(.3*window.innerHeight);
    var height = clamp(Math.floor(chartsAreaHeight/$('.chart').length), 100, 250);
    $('.chart').height(height);
    $('.chartContent').height(height - 1);
    $('.chartTitle').height(height - 23);
    $('.chartAxis').height(height - 1);
    plotManager.forEachPlotContainer(function(pc) {
      if(pc.getElementId()[0] != "0") {
        pc.setHeight(height);
      }
    });
    for (var i = 1; i < series.length; i++) {
      adjustGraphOverlays(i);
    }
  }else{
    console.log('no charts');
    var totalHeight = $('#map_parent').parent().height()
    var siblingHeights = $('#loc-nav').height() + $('#grapher_toolbar').height() + $('#grapher_parent').height()
    var buffer = 20;
    $('#map_parent').height(totalHeight - siblingHeights - buffer);
  }
  google.maps.event.trigger(map, 'resize');
}

var dateAxisListener = function(event) {
  var timeInSecs = event.cursorPosition;
  var dateAxis = plotManager.getDateAxis();
  if(!dateAxisRange || dateAxisRange.min != dateAxis.getRange().min || dateAxisRange.max != dateAxis.getRange().max){
      drawSmellReports(dateAxis.getRange());
  }
  dateAxisRange = dateAxis.getRange();
  if (timeInSecs > dateAxisRange.max) {
    timeInSecs = dateAxisRange.min;
    dateAxis.setCursorPosition(dateAxisRange.min);
  }
  var d = new Date(timeInSecs * 1000);
  var pad = function(num) {
    var norm = Math.abs(Math.floor(num));
    return (norm < 10 ? '0' : '') + norm;
  }
  var dateString = pad(d.getMonth()+1) + "/" + pad(d.getDate()) + "/" + d.getFullYear() ;
  if(dateString != currentDate) {
    $("#datepicker").datepicker("setDate",dateString);
  }
  repaintCanvasLayer(timeInSecs);
};

function setGraphTimeRange(date) {
  var axis = plotManager.getDateAxis();
  if (!axis) return;
  var dayStartString = date + " 00:00:00";
  var dayEndString = date + " 23:59:59";
  var dayStart = (new Date((dayStartString).replace(/-/g,"/")).getTime()) / 1000;
  var dayEnd = (new Date((dayEndString).replace(/-/g,"/")).getTime()) / 1000;
  axis.setRange(dayStart, dayEnd);
  return dayStart;
}

function toggleYAxisAutoScaling() {
  // var autoScaleToggleButton = $("#auto_scale_toggle_button");
  // var isAutoScaleOn = autoScaleToggleButton.hasClass("ui-icon-locked");
  plotManager.forEachPlotContainer(function (pc) {
    pc.setAutoScaleEnabled(!isAutoScaleOn, false);
    if(!isAutoScaleOn) {
      var channelLabel = getChannelLabel(pc.getElementId()[0]);
      setMinRangeToHealthLimit(pc, channelLabel);
    }
    else {
      pc.getYAxis().clearMinRangeConstraints();
    }
  });
  // autoScaleToggleButton.toggleClass("ui-icon-locked");
  // autoScaleToggleButton.toggleClass("ui-icon-unlocked");
}

function processHash(){
  var maxTimeSecs, minTimeSecs, monitor, fromShareLink;

  var hash = window.location.hash.slice(1).split("&");
  if(hash[1]) {
    fromShareLink = true;
    var timeRange = hash[2].slice(5).split(",");
    minTimeSecs = timeRange[0];
    maxTimeSecs = timeRange[1];
    monitor = hash[1].slice(8).replace(/-/g," ");
  }
  else {
    maxTimeSecs = Date.now() / 1000;
    minTimeSecs = maxTimeSecs - 8 * 60 * 60;
  }
  var loc = hash[0].split("loc=")[1];
  $(".active a").removeClass("custom-nav-link-active");
  $(".active a").addClass("custom-nav-link");
  $(".active").removeClass("active");
  if(loc){
    plotManager.getDateAxis().setCursorPosition(Date.now()/1000);
    $("#view-air-quality-tab").addClass("active");
    $("#view-air-quality-tab>a").addClass("custom-nav-link-active");
    $("#" + loc + "-tab").addClass("active");
    $("#" + loc + "-tab" + " a").addClass("custom-nav-link-active");
  }else{
    $("#" + hash[0] + "-tab").addClass("active");
    $("#" + hash[0] + "-tab" + " a").addClass("custom-nav-link-active");
  }
  $('[id*="-page"],[class*="-page"]').hide();

  scrollToTop();
  if(isSubmissionSuccess){
    refreshPosts();
    resetReport();
  }
  if(loc){
    $('.dashboard-page').show()
    changeLocale(loc, monitor);
  }else if($('#'+hash[0]+'-page').length){
    $('#'+hash[0]+'-page').show();
  }else{
    window.location.hash = "home";
  }
}

window.onhashchange = processHash;

window.grapherLoad = function() {
  var maxTimeSecs, minTimeSecs, monitor, fromShareLink;

  var hash = window.location.hash.slice(1).split("&");
  if(hash[1]) {
    fromShareLink = true;
    var timeRange = hash[2].slice(5).split(",");
    minTimeSecs = timeRange[0];
    maxTimeSecs = timeRange[1];
    monitor = hash[1].slice(8).replace(/-/g," ");
  }
  else {
    maxTimeSecs = Date.now() / 1000;
    minTimeSecs = maxTimeSecs - 8 * 60 * 60;
  }
  plotManager = new org.bodytrack.grapher.PlotManager("dateAxis", minTimeSecs, maxTimeSecs);
  var nextYear = new Date(`January 1, ${new Date().getFullYear() + 1}`).getTime()/1000;
  plotManager.getDateAxis().constrainRangeTo(1262304000, nextYear);
  $(window).resize(function() {
    var location = window.location.hash.slice(1).split("&")[0].split("loc=")[1];
    if(location){setSizes();}
  });
  plotManager.setWillAutoResizeWidth(true, function() {
    return $("#grapher").width() - 34 - 136 - 26;
  });
  grapherReady = true;
  processHash();
};

function toggleGuide() {
  $("#guide").toggleClass("guide-expanded");
  $("#guide").toggleClass("guide-collapsed");
  $("#dataRow").height("calc(100% - 40px)");
  setSizes();
}

var playCallback = function() {
  cursorInBound();
  var icon = $("#play i:nth-child(2)");
  icon.toggleClass("fa-play");
  icon.toggleClass("fa-pause");
  icon.hasClass("fa-pause") ? $('#play').addClass('pause') : $('#play').removeClass('pause');
  icon.hasClass("fa-pause") ? play() : pause();
}

function channelPageSetup(fromShareLink) {
  loadCalendar(currentDate);
  refreshMap();

  //Zoom buttons
  $("#zoomGrapherIn").on("click", function(event) {
    if(!event.detail || event.detail==1){
      zoomGrapher(0.7);
    }
  });
  $("#zoomGrapherOut").on("click", function(event) {
    if(!event.detail || event.detail==1){
      zoomGrapher(1.3);
    }
  });

  $('[data-toggle="popover"]').popover();
  $("#dialog").dialog({ autoOpen: false , width: '60%'});

  //Initialize playback things
  plotManager.getDateAxis().addAxisChangeListener(dateAxisListener);
  $("#play").unbind().on("click", function(event){if(!event.detail || event.detail==1) playCallback()});
  $("#slider").slider();
  $('#calendar')
  .unbind()
  .on('click',function(event){
    if(!event.detail || event.detail==1){
      toggleCalendar();
    }
  });
  $('#calendarMenu').hide();

  window.addEventListener('keydown',playOnSpacebarPress);

  var initTime = plotManager.getDateAxis().getRange().min;
  plotManager.getDateAxis().setCursorPosition(initTime);
  plotManager.getDateAxis().getWrappedAxis().isTwelveHour = true
  repaintCanvasLayer(initTime);

  grapherLoadedInterval = window.setInterval(function() {
    if (!grapherReady) return;

    window.clearInterval(grapherLoadedInterval);
    grapherLoadedInterval = null;

    // Initialize Smells
    console.log("started smell");
    initSmells().then(function(result){
      // Initialize Graphs
      if(feedMap[area.locale]){
        if(feedMap[area.locale].length){
          loadFeeds(feedMap[area.locale]);
        }else{
          $('#grapher').append('<tr class="chart no-feeds"></tr>');
          setSizes(); // to expand the map to size
        }
      }else{
        console.log('no feeds loaded');
        setSizes(); // to expand the map to size
      }
    });

    if(fromShareLink) {
      $("#slider").slider("value",85);
      playCallback();
    }
  }, 10);
}

window.requestAnim =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback) {
    return window.setTimeout(callback, 10);
  };

window.addEventListener('message', function(event) {

  // IMPORTANT: Check the origin of the data!
  if (~event.origin.indexOf('http://crockett-rodeo-united.com')) {
      // The data has been sent from your site

      // The data sent with postMessage is stored in event.data
      console.log(event.data);
  } else {
      // The data hasn't been sent from your site!
      // Be careful! Do not use it.
      return;
  }
});
