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
}

function uploadInit(){

	uploader = $('.upload_field').unsigned_cloudinary_upload("u87zingl", 
	  { cloud_name: 'hpkutahah', tags: 'browser_uploads', context: ''}, 
	  { multiple: true, autoUpload: false, replaceFileInput: false}
	).bind('cloudinarydone', function(e, data) {
	  console.log('Upload to cloudinary complete');
	  progress.uploadComplete();
	  progress.showProgress();
	}).bind('cloudinaryprogress', function(e, data) { 
		progress.updateProgress((data.loaded * 100.0) / data.total);
		progress.showProgress();
	});

	uploader.bind('fileuploadadd', function (e, data) {
		var img = document.createElement("IMG"); 
		img.setAttribute("src", URL.createObjectURL(data.files[0])); 
		img.setAttribute("width", '100%');
		$.data(img, "img", data);
		var thumbnail = $('<div class="thumbnail-wrapper"><div class="delete-me"><i class="glyphicon glyphicon-trash"></i></div>');
		$(thumbnail).children('.delete-me').click(function(event){
			$(event.currentTarget).parent().remove();
			$('.num-file-status').text($('.thumbnails img').length + ' files selected for upload.');
			if($('.thumbnails img').length){
				$('.photo-upload').show();
			}else{
				$('.photo-upload').hide();
			}
		});
		thumbnail.prepend(img);
		$('.thumbnails').append(thumbnail);
		$('.num-file-status').text($('.thumbnails img').length + ' files selected for upload.');
		$('.photo-upload').show();
		$('#file-upload').val('');
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

function submitImgs(metadata){
	disableImageDelete();
	if(!($.isEmptyObject(metadata))){
		uploader.fileupload('option', 'formData').context = convertToPipeDelimited(metadata);
	}
	var img2upload = $('.thumbnails img');
	progress.initialize(img2upload.length);
	if(img2upload.length){
		$(img2upload).each(function(index, elm){
			$(elm).data('img').submit();
		});
	}else{
		submissionSuccess();
	}
	
}

$(uploadInit);


