"use strict";

var target_channels = ["Benzene","Toluene","Xylene","Hydrogen_Sulfide","m_p_Xylene","o_Xylene","Black_Carbon", "Ethylbenzene","Sulfur_Dioxide"]//,"PM_2_5","Ammonia","3_Methylpentane","N_Hexane"]
var successCallback = function(area_feed_ids) {
  var keys = Object.keys(esdr_feeds);
    if(keys.length == area_feed_ids.length) {
      initFeeds();
    }
  }

function loadFeeds(area_feed_ids) {
  for(var i=0;i<area_feed_ids.length;i++) {
    $.ajax({
      type: "GET",
      dataType: "json",
      url: ESDR_API_ROOT_URL + "/feeds/" + area_feed_ids[i],
      success: function(json) {
        var feed = json.data;
        esdr_feeds[feed.name] = {
          feed_id : feed.id,
          coordinates: {
            latitude: feed.latitude,
            longitude: feed.longitude
          },
          isDouble: false,
          api_key: feed.apiKeyReadOnly,
          requested_day: {},
          channels: {},
          fullTimeRange: {}
        }
        if(feed.name.indexOf("Refinery") > 0) {
          esdr_feeds[feed.name].isDouble = true;
        }
        var isRodeoFenceline = (feed.id == 4901 || feed.id == 4902);
        var isRodeoWind = feed.id == 4903;
        if(!isRodeoFenceline) {
          esdr_feeds[feed.name].channels = {
            "Wind_Speed_MPH": {
              show_graph: false,
              hourly: !isRodeoWind,
              summary: {}
            },
            "Wind_Direction": {
              show_graph: false,
              hourly: !isRodeoWind,
              summary: {}
            }
          }
        }
        var feed_channels = Object.keys(feed.channelBounds.channels);
        for(var j=0;j<feed_channels.length;j++) {
          var chemical = feed_channels[j];
          var chemicalLabel = chemical;
          if(isRodeoFenceline) {
            chemicalLabel = chemical.slice(chemical.indexOf("_")+1);
          }
          if(target_channels.indexOf(chemicalLabel) != -1) {
            chemicalLabel = chemicalLabel.replace(/_/g," ");
            if(chemical.indexOf("Xylene") != -1) {
              chemicalLabel = "Xylene";
            }
            esdr_feeds[feed.name].channels[chemical] = {
              show_graph: true,
              hourly: true,
              graphMetaData: {
                label: chemicalLabel + " (ppb)"
              },
              summary: {}
            }
          }
        }
        successCallback(area_feed_ids);
        },
        failure: function() {
          alert("Something isn't working!");
        }
      });
    }
}
