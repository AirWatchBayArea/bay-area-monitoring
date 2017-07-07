var serverURL = 'http://staging.api.smellpittsburgh.org/api/v1/smell_reports?area=BA';

function makeid(length){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function serializeForm(geocodeResults){
  //userhash
  if(!localStorage.getItem('AWBAuser')) {
      localStorage.setItem('AWBAuser', makeid(10));
  }
  //latlong
  var latlng = geocodeResults[0]['geometry']['location'];
  var data = 
  {
    "user_hash" : MD5(localStorage.getItem('AWBAuser')),
      "latitude" : latlng.lat(),
      "longitude" : latlng.lng(),
      "smell_value" : parseInt($('input[name=smell]:checked').val()),
      "smell_description" : $('input[name=describe-air]').val() ? $('input[name=describe-air]').val() : null,
      "feelings_symptoms" : $('input[name=symptoms]').val() ? $('input[name=symptoms]').val() : null,
      "additional_comments" : $('input[name=additional-comments]').val()
                  ? $('input[name=additional-comments]').val() : null
  };

  postData(data);
}

function submissionSuccess(){
  disableSubmit();
  $('#submit-success').show();
}

function disableSubmit(){
  $('#report-submit').prop('disabled', true);
  $('#file-upload').prop('disabled', true);
}

function postData(data, successCallback){
  $.ajax({
    method: 'POST',
    url: serverURL,
    data: data,
  }).done(function(msg) {
    console.log("POST Result:", msg);
    if (typeof msg === 'string' || msg instanceof String) {
      reportFailed("there was an error connecting to the server. Please try again later!")
    }else {
      try {
        submitImgs({
          'smell_report':JSON.stringify(msg),
          'alt':msg['smell_description'], 
          'caption':$('#photo-description').val(),
          'when':$('#photo-date').val(),
          'additional_comments':msg['additional_comments']
        }); 
    }catch(err){
        reportFailed("there was an error uploading the photo(s). Please refresh and try again!");
        console.log(err);
      }
    }
  });
}

function geocodeAddress(geocoder, callback) {
  var address = document.getElementById('address').value;
  geocoder.geocode({'address': address, 'bounds': 
    new google.maps.LatLngBounds(
      new google.maps.LatLng(37.851624286540286, -122.56790076098628), 
      new google.maps.LatLng(38.14975803797967,-121.97875891528315))
   }, function(results, status) {
    if (status === 'OK') {
      callback(results);
    } else if (status === 'ZERO_RESULTS'){
      reportFailed('address to coordinate conversion failed.\nPlease be more exact in your location description.');
    }else{
      reportFailed('of internal error. The error will be reported.');
      //REPORT ERROR HERE
    }
  });
}

function reportFailed(reason){
  alert('Smell report failed because ' + reason);
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,-8);
});

function resetReport(){
  document.getElementById("report-form").reset();
    $('#report-submit').prop('disabled', false);
    $('#file-upload').prop('disabled', false);
    $('#submit-success').hide();
    $('.thumbnails').html('');
    $('.num-file-status').text('');
    $('.photo-upload').hide();
    $('#photo-date').val(new Date().toDateInputValue());
}

$(function() {
  var geocoder = new google.maps.Geocoder();
  $('#report-form').submit(function(event){
     event.preventDefault();
     disableSubmit();
     geocodeAddress(geocoder, serializeForm);
  });

  $('#submit-another-report').click(resetReport);
  resetReport()
});


