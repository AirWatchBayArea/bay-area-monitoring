$.cloudinary.config({ cloud_name: 'hpkutahah' })

var uploader;

var progress = {
	numUpload:0,
	numComplete:0,
	progress:0,
	initialize: function(numUpload){
		this.numUpload = numUpload;
		this.progress = 0;
		this.numComplete = 0;
	},
	uploadComplete: function(){
		this.numComplete += 1;
		this.progress = (this.numComplete*100.0)/this.numUpload;
		if(this.numComplete >= this.numUpload){
			this.progress = 100.0;
			this.finallyFinished();
		} 
	},
	updateProgress: function(loadedPercent){
		if (this.numUpload == 1) {
			this.progress = loadedPercent;
		}else if(this.numComplete >= this.numUpload || this.progress >= 100.0){
			this.progress = 100.0;
		}else{
			this.progress += 1;
		}		
	},
	getProgress: function(){
		return this.progress;
	},
	showProgress: function(){
		var percent = Math.round(this.progress);
	  	$('.progress_bar').css('width', percent + '%');
	  	$('.progress_wrapper .progress_text').text(percent + '%');
	},
	finallyFinished: submissionSuccess,
	error: function(){console.log("Upload error")},
}

function uploadInit(){

	uploader = $('.upload_field').unsigned_cloudinary_upload("u87zingl", 
	  { cloud_name: 'hpkutahah', tags: 'browser_uploads', context: ''}, 
	  { multiple: false, autoUpload: false, replaceFileInput: false}
	).bind('cloudinarydone', function(e, data) {
	  console.log('Upload to cloudinary complete');
	  progress.uploadComplete();
	  progress.showProgress();
	}).bind('cloudinaryprogress', function(e, data) {
		progress.updateProgress((data.loaded * 100.0) / data.total);
		progress.showProgress();
	}).bind('cloudinaryfail', function(e, data) {
		reportFailed('Photo upload failed ('+data+')', "reporting this error. We haven't come across this kind of error yet, so please report it (see next line).")
		progress.error(data);
	});

	uploader.bind('fileuploadadd', function (e, data) {
		e.preventDefault();
		var img = document.createElement("IMG"); 
		img.setAttribute("src", URL.createObjectURL(data.files[0])); 
		img.setAttribute("width", '100%');
		$.data(img, "img", data);
		var thumbnail = $('<div class="thumbnail-wrapper"><div class="delete-me"><i class="glyphicon glyphicon-trash"></i></div>');
		$(thumbnail).children('.delete-me').click(function(event){
			$(event.currentTarget).parent().next().remove();
			$(event.currentTarget).parent().remove();
			$('.num-file-status').text($('.thumbnails img').length + ' files selected for upload.');
			if($('.thumbnails img').length){
				$('.photo-upload').show();
			}else{
				$('.photo-upload').hide();
			}
		});

		thumbnail.prepend(img);
		$('.thumbnails')
		.append(thumbnail)
		.append('<div class="report-form-section"><label class="textarea-label photo-upload">'+
		          '<strong>Caption:</strong>'+
		          '<input type="text" id="caption" name="caption"/>'+
		        '</label>'+
		        '<div class="textarea-label photo-upload">'+
		          '<strong class="required">When did this photo occur?</strong>'+
		          '<br><button class="report-button now-button">I just took it</button>'+
		          '<br><label style="display:inline"><strong>Date:&ensp;</strong> <input class="required" type="date" name="photo-date" required></label>'+
		          '<br><label style="display:inline"><strong>Time:&ensp;</strong> <input class="required" type="time" name="photo-time" required></label>'+
		        '<br></div></div>');		
		$('.num-file-status').text($('.thumbnails img').length + ' files selected for upload.');
		$('.photo-upload').show();
		$('#file-upload').val('');
		scrollToElmBottom($('[aria-describedby="reportDialog"]'));
	});
	$('.thumbnails').on('click', '.now-button', function(event) {
		event.preventDefault();
		var datetime = new Date().toDateInputValue().split('T');
		$(event.currentTarget).siblings('label').children('[name=photo-date]').val(datetime[0]);
		$(event.currentTarget).siblings('label').children('[name=photo-time]').val(datetime[1]);
	});

}

function convertToPipeDelimited(metadata){
  	var data = [];
	for(var key in metadata){
		data.push(encodeURIComponent(key)+'='+encodeURIComponent(metadata[key]))
	}
  	return data.join("|");
}

function disableImageDelete(){
	$('.delete-me').hide();
	$('#file-upload').prop('disabled', true);
}

function enableImageDelete(){
	$('.delete-me').show();
	$('#file-upload').prop('disabled', false);
}

function submitImgs(resolve, reject, metadata){
	progress.finallyFinished = resolve;
	progress.error = reject;
	disableImageDelete();
	if(!($.isEmptyObject(metadata))){
		uploader.fileupload('option', 'formData').context = convertToPipeDelimited(metadata);
	}
	var img2upload = $('.thumbnails img');
	progress.initialize(img2upload.length);
	if(img2upload.length){
		$(img2upload).each(function(index, elm){
			var data = jQuery.extend(true, {}, metadata);
			data.caption = metadata['caption'][index];
			data.when = metadata['when'][index];
			uploader.fileupload('option', 'formData').context = convertToPipeDelimited(data);
			$(elm).data('img').submit();
		});
	}else{
		resolve();
	}
}

$(uploadInit);


