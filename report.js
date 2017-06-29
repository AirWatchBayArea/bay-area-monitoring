var serverURL = 'http://staging.api.smellpittsburgh.org/api/v1/smell_reports?area=BA';

function openReportDialog(){
	$("#reportDialog").dialog("open");
}

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
	  		submitImgs(msg);
	  		$('#report-submit').prop('disabled', true);
	  		$('#file-upload').prop('disabled', true);
			$('#submit-success').show();
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

function resetReport(){
	document.getElementById("report-form").reset();
  	$('#report-submit').prop('disabled', false);
  	$('#file-upload').prop('disabled', false);
  	$('#submit-success').hide();
  	$('.thumbnails').html('');
  	$('.num-file-status').text('');
  	$('.progress_bar').text('');
  	$('#photo-title').parent().hide();
  	$('#photo-description').parent().hide();
}

$(function() {
  $("#reportDialog").dialog({
    autoOpen: false,
    width: "60%"
  });
  
  var geocoder = new google.maps.Geocoder();
  $('#report-form').submit(function(event){
		 event.preventDefault();
		 geocodeAddress(geocoder, serializeForm);
	});

  $('#submit-another-report').click(resetReport);

  $('#close-report').click(function(event){
  	$("#reportDialog").dialog('close');
  });

  $('#reportDialog').on('dialogclose', resetReport);
  resetReport()
});


