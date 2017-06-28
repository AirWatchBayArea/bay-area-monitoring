$.cloudinary.config({ cloud_name: 'hpkutahah', api_key: '439228982585447'})

var uploader;

function uploadInit(){

	uploader = $('.upload_field').unsigned_cloudinary_upload("u87zingl", 
	  { cloud_name: 'hpkutahah', tags: 'browser_uploads'}, 
	  { multiple: true, autoUpload: false, replaceFileInput: true}
	).bind('cloudinarydone', function(e, data) {
	  console.log('Upload to cloudinary complete')
	}).bind('cloudinaryprogress', function(e, data) { 

	  $('.progress_bar').text('Upload Progress: ' +  
	    Math.round((data.loaded * 100.0) / data.total) + '%'); 
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
				$('#photo-description').parent().show();
			}else{
				$('#photo-description').parent().hide();
			}
		});
		thumbnail.prepend(img);
		$('.thumbnails').append(thumbnail);
		$('.num-file-status').text($('.thumbnails img').length + ' files selected for upload.');
	});
}



function submitImgs(metadata){
	var img2upload = $('.thumbnails img')
	$(img2upload).each(function(index, elm){
		$(elm).data('img').submit();
	});
}

$(uploadInit);


