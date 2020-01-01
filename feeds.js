"use strict";

var windFeeds = [];
var windFeedIds = [4911, 4913, 4857, 2518, 26394];

var target_channels = new Set(["Benzene","Toluene","Xylene","Hydrogen_Sulfide","H2S", "m_p_Xylene","o_Xylene","Black_Carbon", "Ethylbenzene","Sulfur_Dioxide", "SO2", "voc","dust","PM_2_5","PM2_5"]); //,"Ammonia","3_Methylpentane","N_Hexane"]

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

function makeLabel(chemical) {
  var chemicalLabel = chemical.replace(/_/g," ");
  if(chemical.indexOf("Xylene") != -1) {
    chemicalLabel = "Xylene";
  } else if (chemicalLabel === "H2S") {
    chemicalLabel = "Hydrogen Sulfide";
  } else if (chemicalLabel === "SO2") {
    chemicalLabel = "Sulfur Dioxide";
  }
  var units = chemical.indexOf("Black_Carbon") != -1 || 
              chemical.indexOf("PM_2_5") != -1 || 
              chemical.indexOf("PM2_5") != -1 ? " (µg/m³)" : " (ppb)";
  return chemicalLabel + units;
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
        if(target_channels.has(chemicalLabel)) {
          esdr_feeds[feed.name].channels[chemical] = {
            show_graph: true,
            hourly: true,
            graphMetaData: {
              label: makeLabel(chemicalLabel)
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

function loadWindFeeds(feedIds) {
  Promise.all(feedIds.map(function(feed_id){
    return loadEsdrFeed(feed_id);
  })).then(function(results){
    windFeeds = results;
  })
}

function loadEsdrFeed(feedId){
  return new Promise(function(resolve, reject){
    $.ajax({
    type: "GET",
    dataType: "json",
    url: ESDR_API_ROOT_URL + "/feeds/" + feedId,
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

function makeEsdrRequest(feed, start_time, end_time) {
  return {
    feed_id : feed.feed_id,
    api_key : feed.api_key,
    start_time : start_time,
    end_time : end_time,
    channels : Object.keys(feed.channels).toString(),
    headers : null
  };
}

function makeEsdrRequest24Hours(feed, time) {
  var day = Math.floor(time / 86400);
  return makeEsdrRequest(feed, day * 86400, (day + 1) * 86400);
}

function requestEsdrExport(requestInfo) {
  return new Promise(function (resolve, reject)  {
    $.ajax({
      crossDomain: true,
      type: "GET",
      dataType: "text",
      url: ESDR_API_ROOT_URL + "/feeds/" + requestInfo.feed_id + "/channels/" + requestInfo.channels + "/export",
      data: { from: requestInfo.start_time, to: requestInfo.end_time, FeedApiKey: requestInfo.api_key},
      success: function(csvData) {
        resolve(csvData);
      },
      failure: function(err) {
        console.error('Failed to load sensor data.');
        reject(err);
      },
      headers: requestInfo.headers
    });
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

function get24HourData(feed, time) {
  if (!time) {
    time = Date.now()/1000;
  }
  var requestInfo = makeEsdrRequest24Hours(feed, time);
  return requestEsdrExport(requestInfo).then(function(csvData) {
    parseEsdrCSV(csvData, feed);
    return feed;
  });
}

function get24HourDataForFeed(feedId, time) {
  if (!time) {
    time = Date.now()/1000;
  }
  return loadEsdrFeed(feedId).then(function (feed) {
     return get24HourData(feed, time);
  });
}

function getLast24HourSummaryForFeeds(feedIDs) {
  return Promise.all(feedIDs.map(get24HourDataForFeed))
                .then(mergeFeedSummaries)
                .then(getSummaryStats);
}

function mergeFeedSummaries(feeds) {
  var channels = {};
  for (var feed of feeds) {
    for (var channelName in feed.channels) {
      var channel = feed.channels[channelName];
      if (channelName in channels) {
        Object.assign(channels[channelName].summary, channel.summary);
      } else {
        channels[channelName] = {summary: channel.summary};
      }
    }
  }
  return channels;
}

function getSummaryStats(channels) {
  var channelStats = {};
  for (var channelName in channels) {
    if (!target_channels.has(channelName)) {
      continue;
    }
    var stats = {}
    channelStats[channelName] = stats;
    var summary = channels[channelName].summary;
    if (!summary || Object.keys(summary).length === 0) {
      console.log("No summary for channel: " + channelName);
      continue;
    }
    var values = Object.values(summary).filter(function(num) {
      return typeof num === typeof 1 && num !== NaN;
     });
    stats.max = +(Math.max(...values).toFixed(2));
    stats.min = +(Math.min(...values).toFixed(2));
    var valuesAboveDetection = values.filter(function (x) {return x > 0});
    if (valuesAboveDetection.length) {
      stats.meanAboveDetection = +(mean(valuesAboveDetection).toFixed(2));
    }
    stats.percentageAboveDetection = +(((valuesAboveDetection.length / values.length) * 100).toFixed(0));
  }
  return channelStats;
}

// https://jonlabelle.com/snippets/view/javascript/calculate-mean-median-mode-and-range-in-javascript
function mean(numbers) {
  var total = 0, i;
  for (i = 0; i < numbers.length; i += 1) {
      total += numbers[i];
  }
  return total / numbers.length;
}

// https://jonlabelle.com/snippets/view/javascript/calculate-mean-median-mode-and-range-in-javascript
function median(numbers) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var median = 0, numsLen = numbers.length;
    numbers.sort();
 
    if (
        numsLen % 2 === 0 // is even
    ) {
        // average of two middle numbers
        median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else { // is odd
        // middle number only
        median = numbers[(numsLen - 1) / 2];
    }
 
    return median;
}

$(function(){
  loadWindFeeds(windFeedIds);
})
