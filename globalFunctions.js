//checks if a condition is true, otherwise returns an error
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

function clamp(value, min, max){
  return Math.min(Math.max(value, min), max)
}

//check if string has a falsey value as string
function checkFalseyString(str){
  return (str != "null" && str != "undefined" && str != "");
}


//escape any html in a text
function escapeHTML(text){
  return $("<div>").text(text).html()
}

//rounds a lat or long value to 3 decimals
function roundLatLng(val){
  return Math.floor(val*1000+0.5)/1000;
}

//returns a Date object in string form
function formatDate(d){
  return dateFormat(d, "mmmm d, yyyy, h:MMtt");
}

//converts number to hex
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

//converts rgb value to hex (0x prefix)
function rgbToHex(r, g, b) {
    return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

//scrolls to a jQuery element's top
function scrollToElmTop($elm){
  var elOffset = $elm.offset().top;
  $('html,body').animate({scrollTop: elOffset});
  return false;
}

//scrolls to a jQuery element's middle
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

//scrolls to a jQuery element's bottom
function scrollToElmBottom($elm){
  $('html,body').animate({scrollTop: $elm.height() - $(window).height()});
}

//scrolls to the window's top
function scrollToTop(){
  $('html,body').animate({scrollTop: 0});
}

//scrolls to the window's bottom
function scrollToBottom(){
  $('html,body').animate({scrollTop: $(document).height()});
}

//Jumps to get started section
function jumpToGetStarted(){
  scrollToElmTop($('#services'));
}


//Converts current time for prepopulating input type date/time
Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,-8);
});