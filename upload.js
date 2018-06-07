var rootCloudinaryListUrl = "http://www.res.cloudinary.com/hpkutahah/image/list/";
var rootCloudianaryFetchUrl = "http://res.cloudinary.com/hpkutahah/image/upload/";

//configure cloudinary with cloud name
$.cloudinary.config({ cloud_name: 'hpkutahah' })

var uploader;

var progress = {
	numUpload:0,
	numComplete:0,
	progress:0,
	uploadData: [], //data to be returned in Promise
	initialize: function(numUpload){
		this.numUpload = numUpload;
		this.progress = 0;
		this.numComplete = 0;
		this.uploadData = [];
	},
	uploadComplete: function(){
		//called when a given upload is complete
		this.numComplete += 1;
		this.progress = (this.numComplete*100.0)/this.numUpload;
		if(this.numComplete >= this.numUpload){
			this.progress = 100.0;
			this.finallyFinished(this.uploadData);
		} 
	},
	updateProgress: function(loadedPercent){
		//called as uploading is happening
		if (this.numUpload == 1) {
			this.progress = loadedPercent;
		}else if(this.numComplete >= this.numUpload || this.progress >= 100.0){
			this.progress = 100.0;
		}else{
			this.progress += 1;
		}		
	},
	getProgress: function(){
		//returns current progress
		return this.progress;
	},
	showProgress: function(){
		//show current progress on bar
		var percent = Math.round(this.progress);
	  	$('.progress_bar').css('width', percent + '%');
	  	$('.progress_wrapper .progress_text').text(percent + '%');
	},
	finallyFinished: submissionSuccess, //called when all files have been uploaded
	error: function(){console.log("Upload error")}
}

//(deprecated) returns a list of matched tags
// function makeListURL(tag){
// 	return rootCloudinaryListUrl + tag + ".json?context=true";
// }

//(deprecated) returns a list of resources based on tag
//             we don't need to do this anymore because 
//             smell report has everything we need
// function getCloudinaryTagList(tag){
// 	return new Promise(function(resolve, reject){
// 	    $.ajax({
// 	    url: makeListURL(tag),
// 	    // headers: { 'Access-Control-Allow-Origin': 'http://air-watch-bay-area-backend.herokuapp.com' },
// 	    success: function(json) {
// 	    	responseList = json;
// 	      	resolve(json);
// 	      },
// 	     error: function(err){
// 	     	reject(err);
// 	     }
// 	    });
// 	});
// }

//returns a cloudinary src url to fetch image from
function makeFetchURL(tag, ext){
	return rootCloudianaryFetchUrl + tag + "." + ext;
}

function uploadInit(){
	//global cloudinary uploader 
	uploader = $('.upload_field').unsigned_cloudinary_upload("u87zingl", 
	  { cloud_name: 'hpkutahah', //cloudname
	  	tags: 'browser_uploads', //tag
	  	context: '' //metadata
	  }, 
	  { multiple: false,  //whether multiple selection is allowed
	  	autoUpload: false, //whether to upload immediately 
	  	replaceFileInput: false //whether the uploader should reset or not
	  }
	).bind('cloudinarydone', function(e, data) {
		//executes when a single file completes an upload
		console.log('Upload to cloudinary complete', data);
		progress.uploadComplete();
		progress.showProgress();
	}).bind('cloudinaryprogress', function(e, data) {
		//executes while uploading, show progress
		progress.updateProgress((data.loaded * 100.0) / data.total);
		progress.showProgress();
	}).bind('cloudinaryfail', function(e, data) {
		//executes on upload file
		reportFailed('Photo upload failed ('+data+')', "reporting this error. We haven't come across this kind of error yet, so please report it (see next line).")
		progress.error(data);
	});

	uploader.bind('fileuploadadd', function (e, data) {
		//executes when a file is chosen to be uploaded
		e.preventDefault();
		var img = document.createElement("IMG"); 
		img.setAttribute("src", URL.createObjectURL(data.files[0])); 
		img.setAttribute("width", '100%');
		$.data(img, "img", data);
		var thumbnail = $('<div class="thumbnail-wrapper"><div class="delete-me"><i class="glyphicon glyphicon-trash"></i></div>');
		//bind delete event to red button
		$(thumbnail).children('.delete-me').click(function(event){
			$(event.currentTarget).parent().next().remove();
			$(event.currentTarget).parent().remove();
			$('.num-file-status').text($('.thumbnails img').length);
			if($('.thumbnails img').length){
				$('.photo-upload').show();
			}else{
				$('.photo-upload').hide();
			}
		});

		//append thumbnail and caption questions
		thumbnail.prepend(img);
		$('.thumbnails')
		.append(thumbnail)
		.append('<div class="report-form-section"><label class="textarea-label photo-upload">'+
		          '<strong data-localize="report.img-caption"></strong>'+
		          '<input type="text" name="caption"/>'+
		        '</label>'+
		        '<div class="textarea-label photo-upload">'+
		          '<strong class="required" data-localize="report.img-when"></strong>'+
		          '<br><button class="report-button now-button" data-localize="report.img-just-took"></button>'+
		          '<br><label style="display:inline"><strong data-localize="report.img-date"></strong> <input class="required" type="date" name="photo-date" required></label>'+
		          '<br><label style="display:inline"><strong data-localize="report.img-time"></strong> <input class="required" type="time" name="photo-time" required></label>'+
		        '<br></div></div>');		
		$('.num-file-status').text($('.thumbnails img').length);
		$('.photo-upload').show();
		$('#file-upload').val('');
		scrollToElmMiddle($('[name=caption]').last());
	});
	$('.thumbnails').on('click', '.now-button', function(event) {
		event.preventDefault();
		var datetime = new Date().toDateInputValue().split('T');
		$(event.currentTarget).siblings('label').children('[name=photo-date]').val(datetime[0]);
		$(event.currentTarget).siblings('label').children('[name=photo-time]').val(datetime[1]);
	});

}

//generate a public id to identify photo with
function makePublicID(){
	var userHash = localStorage.getItem('AWBAuser');
	var random = Math.floor(Math.random()*9007199254740991);
	var date = new Date();
	var epoch = ((date.getTime()-date.getMilliseconds())/1000);
	return MD5(userHash + random + epoch);
}

//disable image deletion
function disableImageDelete(){
	$('.delete-me').hide();
	$('#file-upload').prop('disabled', true);
}

//enable image deletion
function enableImageDelete(){
	$('.delete-me').show();
	$('#file-upload').prop('disabled', false);
}

//submit each image using cloudinary upload
function submitImgs(resolve, reject){
	progress.finallyFinished = resolve; //set finally finished to resolve Promise
	progress.error = reject;
	disableImageDelete();
	var img2upload = $('.thumbnails img');
	progress.initialize(img2upload.length);
	if(img2upload.length){
		progress.uploadData = [];
		$(img2upload).each(function(index, elm){
			//for each image, assign a public id, get file extension
			//add url to uploadData field, for return on Promise
			var public_id = makePublicID();
			var file_ext = $(elm).data('img')['files'][0]['type'].split('/').pop();
			progress.uploadData.push(makeFetchURL(public_id,file_ext));
			uploader.fileupload('option','formData').public_id = public_id;
			$(elm).data('img').submit();
		});
	}else{
		resolve([]);
	}
}

$(uploadInit);


