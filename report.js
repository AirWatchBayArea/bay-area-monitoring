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

function getCategoryList(){
	return $('[name=tag]:checked').map(function () {
		return (this.value == "other") ? $('[name=tag-other]').val() : this.value;
	}).get();
}

function getCaptionList(){
	return $('[name=caption]').map(function () {
		return this.value;
	}).get();
}

function getDateTimeList(){
	var dates = $('[name=photo-date]').map(function () {
		return this.value;
	}).get();
	var times = $('[name=photo-time]').map(function () {
		return this.value;
	}).get();
	var dateTimeList = [];
	for(var i = 0; i < dates.length; i++){
		dateTimeList.push(dates[i]+"T"+times[i]);
	}
	return dateTimeList;
}

function geocodeAddress(geocoder) {
	var address = document.getElementById('address').value;
	return new Promise(function (resolve, reject){
		geocoder.geocode({'address': address, 'bounds': 
		new google.maps.LatLngBounds(
			new google.maps.LatLng(37.851624286540286, -122.56790076098628), 
			new google.maps.LatLng(38.14975803797967,-121.97875891528315))
		 }, function(results, status) {
		  if (status === 'OK') {
		    resolve(results);
		  } else if (status === 'ZERO_RESULTS'){
		    reportFailed('address to coordinate conversion failed.', 'being more exact in your location description, as if you were locating it on a map.');
		    reject(status);
		  }else if (status === 'OVER_QUERY_LIMIT'){
		    reportFailed('address to coordinate conversion failed because of too much traffic to the site', 'trying again later (sorry about that!)');
		    reject(status);
		  }else if (status === 'REQUEST_DENIED'){
		    reportFailed('address to coordinate conversion failed because Google denied your request for some reason (' + status + ': ' + results.error_message + ')', "taking screenshots and sending them to the email below.");
		    reject(status);
		  }else if (status === "INVALID_REQUEST"){
		    reportFailed('address to coordinate conversion failed because of an invalid request on our side. (' + status + ': ' + results.error_message + ')', "taking screenshots and sending them to the email below.");
		    reject(status);
		  }else{
		  	reportFailed('address to coordinate conversion failed because of Google internal error (' + status + ': ' + results.error_message + ')', "trying again (that's what Google says to do).");
		  	reject(status);
		  }
		});
	});
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
	  "additional_comments" : $('[name=additional-comments]').val() ? $('[name=additional-comments]').val() : null,
	};
	return data;
}

function postData(data){
	return new Promise(function (resolve, reject){
		$.ajax({
			method: 'POST',
			url: serverURL,
			data: data,
			success:function(msg){
				console.log("POST Result:", msg);
				if (msg.error) {
				  	reportFailed(msg.error, "checking that all of the required fields are entered.");
				  	reject(msg.error);
				}else {
				  	resolve(msg);
				}
			},
			error:function(err){
				reject(err);
				reportFailed(err, "checking your internet connection or see below.");			}
		});
	});
}

function processImgSubmissions(msg){
	return new Promise(function(resolve,reject){
		submitImgs(resolve, reject, {
			'smell_report':JSON.stringify(msg),
			'alt':msg['smell_description'], 
			'caption':getCaptionList(),
			'when':getDateTimeList(),
			'additional_comments':msg['additional_comments'],
			"tag": 
				getCategoryList().join(','),
		});	
	});
}

function resetReport(){
	isSubmissionSuccess = false;
	scrollToTop();
	document.getElementById("report-form").reset();
  	$('#report-submit').prop('disabled', false);
  	$('#file-upload').prop('disabled', false);
  	$('#submit-success').hide();
  	$('#uploading').hide();
  	$('#upload-error').hide();
  	$('.thumbnails').html('');
  	$('.num-file-status').text('');
  	$('.photo-upload').hide();
  	$('.required-error').removeClass('required-error');
}

function submissionUploading(){
  scrollToBottom();
  disableSubmit();
  $('#uploading').show();
  $('#submit-success').hide();
  $('#upload-error').hide();
}

function submissionSuccess(){
  scrollToBottom();
  $('#uploading').hide();
  $('#submit-success').show();
  $('#upload-error').hide();
  isSubmissionSuccess = true;
}

function reportFailed(reason, resolution){
	$('#submit-success').hide();
  	$('#uploading').hide();
	$('#upload-error-message').text(reason);
	$('#error-resolution').text(resolution);
	$('#upload-error').show();
	enableSubmit();
	alert('Report failed to upload: ' + reason + '\n\nResolve by: ' + resolution);
}

function disableSubmit(){
	$('#report-submit').prop('disabled', true);
	$('#file-upload').prop('disabled', true);
}

function enableSubmit(){
	$('#report-submit').prop('disabled', false);
	$('#file-upload').prop('disabled', false);
}

function formValidate(){
	var required = $('input.required'); 

    for(var i = 0; i <= (required.length - 1);i++){
      if(required[i].value == '') {
          $(required[i]).parent().addClass('required-error')
          scrollToElmMiddle($(required[i]));
          return false; 
      }
    }
    return true;
}

function submitForm(){
	console.log("submit pressed");
	event.preventDefault();
	if(!formValidate()){
		return false;
	}
	submissionUploading();
	disableSubmit();
	geocodeAddress(geocoder).then(function(results) {
		return postData(serializeForm(results));
	}).then(function(results){
		return processImgSubmissions(results);
	}).then(function(results){
		try{
			refreshPosts();
		}catch(err){
			console.log("Why does this fail????", err);
			ga('send', 'exception', {
			    'exDescription': err,
			    'exFatal': false,
			  });
		}finally{
			submissionSuccess();
		}
	}).catch(function(err){
		console.log(err);
		formValidate();
		ga('send', 'exception', {
		    'exDescription': err,
		    'exFatal': true,
		  });
	});
}

$(function() {
	//prevent submission on ENTER key
	$(window).keydown(function(event){
	    if(event.keyCode == 13) {
	      event.preventDefault();
	      return false;
	    }
	  });

	//polyfill report form
	$('#report-form').form();

	//init geocoder
	geocoder = new google.maps.Geocoder();
	//default bounds set to Bay Area
	var defaultBounds = new google.maps.LatLngBounds(
		new google.maps.LatLng(36.906913, -123.017998),
		new google.maps.LatLng(38.8286208, -121.209588));
	var input = $('[name=location]').get(0);
	var options = {
	  bounds: defaultBounds,
	};
	//sets up
	autocomplete = new google.maps.places.Autocomplete(input, options);
  	$('#report-form').submit(function(){
  		event.preventDefault();
  	});
	$('#report-submit').click(submitForm);
	$('#submit-another-report').click(resetReport);

	$('[name=tag-other]').focus(function(ev){
		$('[name=tag][value=other]').prop("checked", true);
	});

	upload_spinner = new Spinner({
		position:'relative',
		left:' 90%',
		radius: 8,
		color: "#666",
		opacity: .4,
		trail: 45,
	}).spin();
	document.getElementById('upload-spinner').appendChild(upload_spinner.el)
  	resetReport();
});


