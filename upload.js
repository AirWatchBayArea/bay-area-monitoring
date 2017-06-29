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
				$('#photo-title').parent().show();
				$('#photo-description').parent().show();
			}else{
				$('#photo-title').parent().hide();
				$('#photo-description').parent().hide();
			}
		});
		thumbnail.prepend(img);
		$('.thumbnails').append(thumbnail);
		$('.num-file-status').text($('.thumbnails img').length + ' files selected for upload.');
		$('#photo-title').parent().show();
		$('#photo-description').parent().show();
	});
}



function submitImgs(metadata){
	var img2upload = $('.thumbnails img')
	$(img2upload).each(function(index, elm){
		$(elm).data('img').submit();
	});
}

function getSmellColor(smellVal){
	switch(parseInt(smellVal)){
		case 1: 
			return "lime";
		break;
		case 2: 
			return "yellow";
		break;
		case 3: 
			return "orange";
		break;
		case 4: 
			return "crimson";
		break;
		case 5: 
			return "rebeccapurple";
		break;
		default:
			return "gray";
	}
}

function escapeHTML(text){
	return $("<div>").text(text).html()
}

function generatePost(data){
	var post = [
		'<div class="post">',
        	'<div class="smell-box" style="background-color: ',
        	(data['smell-val']) ? getSmellColor(escapeHTML(data['smell-val'])) : 'gray',
        	'"></div>',
        	'<h3 class="title">',(data['title']) ? escapeHTML(data['title']) : '(No Title)','</h3><br>',
        	'<p class="info when">',(data['time']) ? escapeHTML(data['time']) : '?','</p>',
        	'<p class="info lat">',(data['lat']) ? escapeHTML(data['lat']) : '?','</p>',
        	'<p class="info long">',(data['lng']) ? escapeHTML(data['lng']) : '?','</p>',
        	'<img src="',(data['src']) ? encodeURI(data['src']) : '/','" width="100%">',
        	'<h4 class="caption">',(data['caption']) ? escapeHTML(data['caption']) : "(No Caption)",'</h4>',
      	'</div>',
	];
	$('#posts').append(post.join(""));
}

$(uploadInit);


