function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

function roundLatLng(val){
  return Math.floor(val*1000+0.5)/1000;
}

function formatDate(d){
  return dateFormat(d, "mmmm d, yyyy, h:MMtt");
}

function scrollToElmTop($elm){
  var elOffset = $elm.offset().top;
  $('html,body').animate({scrollTop: elOffset});
  return false;
}

function scrollToElmMiddle($elm){
  var elOffset = $elm.offset().top;
  var elHeight = $elm.height();
  var windowHeight = $(window).height();
  var offset;

  if (elHeight < windowHeight) {
  	offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
  }
  else {
  	offset = elOffset;
  }
  $('html,body').animate({scrollTop: offset});
  return false;
}

function scrollToElmBottom($elm){
  $('html,body').animate({scrollTop: $elm.height() - $(window).height()});
}

function scrollToTop(){
  $('html,body').animate({scrollTop: 0});
}

function scrollToBottom(){
  $('html,body').animate({scrollTop: $(document).height()});
}

function jumpToIndex(elm){
  var index = $(elm).parent().index();
  scrollToElmMiddle($('section.post').eq(index));
}

function jumpToGetStarted(){
  scrollToElmTop($('#services'));
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,-8);
});