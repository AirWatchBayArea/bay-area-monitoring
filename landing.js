"use strict";

//get json of new posts from server
function jsonCallback(json) {
  var container = $("#newFeaturesContainer");
  for(var post of json) {
    container.append("<p><strong>" + post.date + "</strong></p>");
    container.append("<p>" + post.content + "</p>");
    container.append("<hr>");
  }
}

function initialize() {
  //want to eventually have form which populates JSON of new features,
  //and site and user list can call to JSON to automatically send out/display updates?
  $.ajax({
    dataType: "jsonp",
    url: "http://www.jetslab.org/bay-area-monitoring/assets/json/new_features.json",
  });
}

$(initialize);
