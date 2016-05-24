var target_channels = ["Benzene","Toluene","Xylene","Hydrogen_Sulfide","m_p_Xylene","o_Xylene","Black_Carbon", "Ethylbenzene","Sulfur_Dioxide"]//,"PM_2_5","Ammonia","3_Methylpentane","N_Hexane"]
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
          channels: {},
          fullTimeRange: {}
        }
        if(feed.name.includes("Refinery")) {
          esdr_feeds[feed.name].isDouble = true;
        }
        var isRodeoFenceline = (feed.id == 4901 || feed.id == 4902);
        if(!isRodeoFenceline) {
          esdr_feeds[feed.name].channels = {
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
          }
        }
        var feed_channels = Object.keys(feed.channelBounds.channels);
        for(j=0;j<feed_channels.length;j++) {
          var chemical = feed_channels[j];
          if(isRodeoFenceline) {
            chemical = chemical.slice(chemical.indexOf("_")+1);
          }
          if(target_channels.indexOf(chemical) != -1) {
            var chemical_label = chemical.replace(/_/g," ");
            if(chemical.indexOf("Xylene") != -1) {
              chemical_label = "Xylene";
            }
            esdr_feeds[feed.name].channels[chemical] = {
              show_graph: true,
              hourly: true,
              graphMetaData: {
                label: chemical_label + " (ppb)"
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
