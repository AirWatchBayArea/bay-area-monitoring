"use strict";

var target_channels = ["Benzene","Toluene","Xylene","Hydrogen_Sulfide","m_p_Xylene","o_Xylene","Black_Carbon", "Ethylbenzene","Sulfur_Dioxide","voc","dust"]//,"PM_2_5","Ammonia","3_Methylpentane","N_Hexane"]

function initFeeds() {
  var feedNames = Object.keys(esdr_feeds).sort();
  if(showSmokeDetection) {
    feedNames.splice(feedNames.indexOf("Smoke_Detection"), 1);
    feedNames[feedNames.length] = "Smoke_Detection";
  }
  Promise.all(feedNames.map(function(feedName){
    return createFeed(feedName);
  })).then(function(results){
    for (var j = 0; j < feedNames.length; j++) {
      var feed = esdr_feeds[feedNames[j]];
      var channelNames = Object.keys(feed.channels);
      channelNames.forEach(function(channelName) {
        if (!feed.channels[channelName].show_graph) return;
        createChart(feed, channelName, feed.api_key);
      });
    }
  });
  // if (canvasLayer){
  //   highlightSelectedMonitors();
  // }
  }

function createFeed(feedName){
  return new Promise(function(resolve, reject){
    $.ajax({
      type: "GET",
      dataType: "json",
      url: ESDR_API_ROOT_URL + '/feeds/' + esdr_feeds[feedName].api_key,
      success: function(json) {
        esdr_feeds[feedName].fullTimeRange.min = json.data.minTimeSecs;
        esdr_feeds[feedName].fullTimeRange.max = json.data.maxTimeSecs;
        resolve(json);
      }
    });
  });
}

function loadFeeds(area_feed_ids) {
  Promise.all(area_feed_ids.map(function(feed_id){
    return loadFeed(feed_id);
  })).then(function(results){
    initFeeds();
  })
}

function loadFeed(area_feed_id){
  return new Promise(function(resolve, reject){
    $.ajax({
    type: "GET",
    dataType: "json",
    url: ESDR_API_ROOT_URL + "/feeds/" + area_feed_id,
    success: function(json) {
      var feed = json.data;
      if(esdr_feeds[feed.name]){
        feed.name = feed.name + "*";
      }
      esdr_feeds[feed.name] = {
        feed_id : feed.id,
        coordinates: {
          latitude: feed.latitude,
          longitude: feed.longitude
        },
        api_key: feed.apiKeyReadOnly,
        requested_day: {},
        channels: {},
        fullTimeRange: {}
      }
      var isRodeoFenceline = (feed.id == 4901 || feed.id == 4902);
      var isBAAQMD = feed.name.indexOf("BAAQMD") >= 0;
      var isRodeoWind = feed.id == 4903;
      if(feed.name.indexOf("Fence") > 0) {
        esdr_feeds[feed.name].type = "Refinery";
      }
      else if(isBAAQMD) {
        esdr_feeds[feed.name].type = "BAAQMD";
      }
      else {
        esdr_feeds[feed.name].type = "Community";
      }
      if(!isRodeoFenceline) {
        esdr_feeds[feed.name].channels = {
          "Wind_Direction": {
            show_graph: false,
            hourly: false,
            summary: {}
          }
        }
        if (!isBAAQMD) {
          esdr_feeds[feed.name].channels["Wind_Speed_MPH"] = {
              show_graph: false,
              hourly: false,
              summary: {}
            }
        }
        else if (feed.name.indexOf("Vallejo") >= 0) {
          esdr_feeds[feed.name].channels["Wind_Speed"] = {
              show_graph: false,
              hourly: false,
              summary: {}
            }
        }
      }
      var feed_channels = Object.keys(feed.channelBounds.channels);
      for(var j=0;j<feed_channels.length;j++) {
        var chemical = feed_channels[j];
        var chemicalLabel = chemical;
        var units;
        if(isRodeoFenceline) {
          chemicalLabel = chemical.slice(chemical.indexOf("_")+1);
        }
        if(isBAAQMD) {
          chemicalLabel = chemical.slice(0,chemical.lastIndexOf("_"));
        }
        if(target_channels.indexOf(chemicalLabel) != -1) {
          chemicalLabel = chemicalLabel.replace(/_/g," ");
          if(chemical.indexOf("Xylene") != -1) {
            chemicalLabel = "Xylene";
          }
          var units = chemical.indexOf("Black_Carbon") != -1 ? " (µg/m³)" : " (ppb)";
          esdr_feeds[feed.name].channels[chemical] = {
            show_graph: true,
            hourly: true,
            graphMetaData: {
              label: chemicalLabel + units
            },
            summary: {}
          }
        }
      }
      resolve();
      },
      failure: function() {
        alert("Something isn't working!");
        reject();
      }
    });
  });
}
