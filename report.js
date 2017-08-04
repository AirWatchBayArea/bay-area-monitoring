// var serverURL = 'http://bayarea.staging.api.smellpittsburgh.org/api/v1/smell_reports'
var serverURL = 'http://api.smellpittsburgh.org/api/v1/smell_reports?area=BA';
var isSubmissionSuccess = false;
// generate a hash for the user
function generateUserHash() {
	var userHash;
	var bayAreaPrefix = "BA"
	var random = Math.floor(Math.random()*9007199254740991);
	var date = new Date();
	var epoch = ((date.getTime()-date.getMilliseconds())/1000);
	var input = random + " " + epoch;
	userHash = bayAreaPrefix + MD5(input);
	return userHash;
}

function serializeForm(geocodeResults){
	//userhash
	if(!localStorage.getItem('AWBAuser') || localStorage.getItem('AWBAuser').substring(0,2) != "BA") {
  		localStorage.setItem('AWBAuser', generateUserHash());
	}
	//latlong
	var latlng = geocodeResults[0]['geometry']['location'];
	var data = 
	{
	  "user_hash" : localStorage.getItem('AWBAuser'),
	  "latitude" : latlng.lat(),
	  "longitude" : latlng.lng(),
	  "smell_value" : parseInt($('[name=smell]:checked').val()),
	  "smell_description" : $('[name=describe-air]').val() ? $('[name=describe-air]').val() : null,
	  "feelings_symptoms" : $('[name=symptoms]').val() ? $('[name=symptoms]').val() : null,
	  "additional_comments" : $('[name=additional-comments]').val()
	              ? $('[name=additional-comments]').val() : null
	};

	postData(data);
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

function submissionSuccess(){
  scrollToBottom();
  disableSubmit();
  refreshPosts();
  $('#submit-success').show();
  isSubmissionSuccess = true;
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
	  			'additional_comments':msg['additional_comments'],
	  			"tag": 
	  				$('[name=tag]:checked').val() != "other" 
	  				? $('[name=tag]:checked').val() : $('[name=tag-other]').val() 
	  				? $('[name=tag-other]').val() : null,
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
	isSubmissionSuccess = false;
	scrollToTop();
	document.getElementById("report-form").reset();
  	$('#report-submit').prop('disabled', false);
  	$('#file-upload').prop('disabled', false);
  	$('#submit-success').hide();
  	$('.thumbnails').html('');
  	$('.num-file-status').text('');
  	$('.photo-upload').hide();
  	$('#photo-date').val(new Date().toDateInputValue());
  	$('.required-error').removeClass('required-error');
}

$(function() {
  var geocoder = new google.maps.Geocoder();
  $('#report-form').submit(function(event){
    var required = $('[required]'); 
    var error = false;

    for(var i = 0; i <= (required.length - 1);i++){
      if(required[i].value == '') {
          $(required[i]).parent().addClass('required-error')
          scrollToElmMiddle($(required[i]));
          error = true; 
      }
    }

    if(error){
      return false; // stop the form from being submitted.
    }else{
      event.preventDefault();
      disableSubmit();
      geocodeAddress(geocoder, serializeForm);
    }
  });

  $('#submit-another-report').click(resetReport);

  $('[name=tag-other]').focus(function(ev){
  	$('[name=tag][value=other]').prop("checked", true);
  })

  $('[name=tag][value=other]').parent().click(function(ev){
  	$('[name=tag-other]').focus();
  })

  resetReport()
});


