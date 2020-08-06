"use strict";

var windFeeds = [];
var windFeedIds = [26394, 38294, 38684, 38816];

var target_channels = [
  "Benzene",
  "Toluene",
  "Xylene", // Also matches "m_p_Xylene" and "o_Xylene".
  "Hydrogen_Sulfide",
  "H2S",
  "Black_Carbon",
  "Ethylbenzene",
  "Sulfur_Dioxide",
  "SO2",
  "voc",
  "dust",
  "PM_2_5", // Also matches "PM2_5".
  "Carbon_Monoxide",
  "Nitrous_Oxide",
  "Methane",
]//,"Ammonia","3_Methylpentane","N_Hexane"]

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
    localize();
  });
  if (canvasLayer){
    highlightSelectedMonitors();
  }
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
      var isPurpleAir = feed.name.indexOf("PurpleAir") >= 0;
      var isRodeoWind = feed.id == 4903;
      if(feed.name.indexOf("Fence") > 0) {
        esdr_feeds[feed.name].type = "Refinery";
      }
      else if(isBAAQMD) {
        esdr_feeds[feed.name].type = "BAAQMD";
      }
      else if (isPurpleAir) {
        esdr_feeds[feed.name].type = "PurpleAir";
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
        var matches = target_channels.filter((channel) => {
          var channelRegex = new RegExp(channel.replace('_', '_?'));
          return chemicalLabel.search(channelRegex) > -1;
        }); 
        if(matches.length) {
          chemicalLabel = matches[0].replace(/_/g," ");
          if (chemicalLabel === "H2S") {
            chemicalLabel = "Hydrogen Sulfide";
          } else if (chemicalLabel === "SO2") {
            chemicalLabel = "Sulfur Dioxide";
          } else if (chemicalLabel === "PM 2 5") {
            chemicalLabel = "PM 2.5";
          }
          var units = (new Set(["Black Carbon", "PM 2.5"])).has(chemicalLabel) ?
            "(µg/m³)" : "(ppb)";
          esdr_feeds[feed.name].channels[chemical] = {
            show_graph: true,
            hourly: true,
            graphMetaData: {
              label: `${chemicalLabel} ${units}`
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

function loadWindFeeds(wind_feed_ids) {
  Promise.all(wind_feed_ids.map(function(feed_id){
    return loadWindFeed(feed_id);
  })).then(function(results){
    windFeeds = results;
  })
}

function loadWindFeed(wind_feed_id){
  return new Promise(function(resolve, reject){
    $.ajax({
    type: "GET",
    dataType: "json",
    url: ESDR_API_ROOT_URL + "/feeds/" + wind_feed_id,
    success: function(json) {
      var feed = json.data;
      var wind_feed_data = {
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
      var feed_channels = Object.keys(feed.channelBounds.channels);
      for(var j=0;j<feed_channels.length;j++) {
        var chemical = feed_channels[j];
        var chemicalLabel = chemical;
          chemicalLabel = chemicalLabel.replace(/_/g," ");
          wind_feed_data.channels[chemical] = {
            show_graph: true,
            hourly: true,
            graphMetaData: {
              label: chemicalLabel
            },
            summary: {}
          }
      }
      resolve(wind_feed_data);
      },
      failure: function() {
        alert("Something isn't working!");
        reject();
      }
    });
  });
}

$(function(){
  loadWindFeeds(windFeedIds);
})
