var target_channels = ["Benzene","Toluene","Xylene","Hydrogen_Sulfide","m_p_Xylene","o_Xylene","Black_Carbon", "Ethylbenzene","Sulfur_Dioxide"]//,"PM_2_5","Ammonia","3_Methylpentane","N_Hexane"]
var colors = ["90,200,250","255,204,0","255,149,0", "255,45,85", "0,122,255", "76,217,100","255,59,48"]
var successCallback = function(area_feed_ids) {
  var keys = Object.keys(esdr_feeds);
    if(keys.length == area_feed_ids.length + 1) {
      initFeeds();
    }
  }

function loadFeeds(area_feed_ids) {
  for(i=0;i<area_feed_ids.length;i++) {
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
          channels: {
            "Wind_Speed_MPH": {
              show_graph: false,
              hourly: true,
              summary: {}
            },
            "Wind_Direction": {
              show_graph: false,
              hourly: true,
              summary: {}
            }
          },
          fullTimeRange: {}
        }
        if(feed.name.includes("Refinery")) {
          esdr_feeds[feed.name].isDouble = true;
        }
        var feed_channels = Object.keys(feed.channelBounds.channels);
        for(j=0;j<feed_channels.length;j++) {
          var chemical = feed_channels[j];
          if(target_channels.indexOf(chemical) != -1) {
            var chemical_label = chemical.replace(/_/g," ");
            if(chemical.indexOf("Xylene") != -1) {
              chemical_label = "Xylene";
            }
            esdr_feeds[feed.name].channels[chemical] = {
              show_graph: true,
              hourly: true,
              graphMetaData: {
                label: chemical_label + " (ppb)",
                color: colors.shift()
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
