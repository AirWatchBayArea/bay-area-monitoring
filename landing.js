"use strict";

var PROJ_ROOT_URL = "http://www.airwatchbayarea.org"
var carouselInterval;

//get json of new posts from server
function jsonCallback(json) {
  var container = $("#newFeaturesContainer");
  for(var post of json) {
    container.append("<p><strong>" + post.date + "</strong></p>");
    container.append("<p>" + post.content + "</p>");
    container.append("<hr>");
  }
}

function setImage(element){
  $('.small-circle.selected').removeClass('selected');
  $(element).addClass('selected');
  $('.background-image').css('background-image', "url(" + $(element).data('img') + ")");
}

function startCarousel(){
  clearInterval(window.carouselInterval);
  carouselInterval = window.setInterval(function(){
    var nextSelectIndex = 0;
    $('.small-circle').each(function(index, element){
      nextSelectIndex = ($(element).hasClass('selected')) ? (index + 1) % $('.small-circle').length : nextSelectIndex;
    })
    setImage($('.small-circle').eq(nextSelectIndex));
  }, 5000)
}

function initialize() {
  //want to eventually have form which populates JSON of new features,
  //and site and user list can call to JSON to automatically send out/display updates?
  $.ajax({
    dataType: "jsonp",
    url: PROJ_ROOT_URL + "/assets/json/new_features.json"
  });

   startCarousel();

  $('.site-title .small-circle').click(function(event){
    clearInterval(window.carouselInterval)
    setImage(event.currentTarget);
    startCarousel();
  });
}



$(initialize);
