$.cloudinary.config({ cloud_name: 'hpkutahah', api_key: '439228982585447'})

function uploadInit(){

	$('.upload_field').unsigned_cloudinary_upload("u87zingl", 
	  { cloud_name: 'hpkutahah', tags: 'browser_uploads', replaceFileInput: false}, 
	  { multiple: true }
	).bind('cloudinarydone', function(e, data) {

	  $('.thumbnails').append($.cloudinary.image(data.result.public_id, 
	    { format: 'jpg', width: 150, height: 100, 
	      crop: 'thumb', effect: 'saturation:50' } ));
	
	  console.log(e, data);

	}).bind('cloudinaryprogress', function(e, data) { 

	  $('.progress_bar').text('Upload Progress: ' +  
	    Math.round((data.loaded * 100.0) / data.total) + '%'); 
	});
}

$(uploadInit);


