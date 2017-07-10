var rootCloudinaryListUrl = "http://res.cloudinary.com/hpkutahah/image/list/";
var rootCloudianrtFetchUrl = "http://res.cloudinary.com/hpkutahah/image/upload/";

var responseList;

function makeListURL(tag){
	return rootCloudinaryListUrl + tag + ".json?context=true";
}

function makeFetchURL(tag, ext){
	return rootCloudianrtFetchUrl + tag + "." + ext;
}

function getTagList(tag){
	return new Promise(function(resolve, reject){
	    $.ajax({
	    url: makeListURL(tag),
	    // headers: { 'Access-Control-Allow-Origin': 'http://air-watch-bay-area-backend.herokuapp.com' },
	    success: function(json) {
	    	responseList = json;
	      	resolve(json);
	      },
	     error: function(err){
	     	reject(err);
	     }
	    });
	  });
}

function generatePostsFromList(json){
	var resources = json.resources;
	for (var i = 0; i < resources.length; i++) {
		generatePostFromResource(resources[i]);
	}
}

function roundLatLng(val){
	return Math.floor(val*1000+0.5)/1000;
}

function formatDate(dateStr){
	return dateFormat(Date.parse(dateStr), "mmmm d, yyyy, h:MMtt");
}

function generatePostFromResource(resource){
	var postData = {
		src:makeFetchURL(resource['public_id'], resource['format']),
	}
	if(resource['context']){
		var context = resource['context']['custom'];
		var smell_report = JSON.parse(decodeURIComponent(context['smell_report']));
		postData['latitude']=roundLatLng(decodeURIComponent(smell_report['latitude']));
		postData['longitude']=roundLatLng(decodeURIComponent(smell_report['longitude']));
		postData['smell_value']=decodeURIComponent(smell_report['smell_value']);
		postData['alt']=decodeURIComponent(context['alt']);
		postData['caption']=decodeURIComponent(context['caption']);
		postData['when']=formatDate(decodeURIComponent(context['when']));
		postData['additional_comments']=decodeURIComponent(context['additional_comments']);
	}
	
	generatePostHTML(postData);
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

function generatePostHTML(data){
	$('#posts').append([
		'<div class="post">',
        	'<div class="smell-box" style="background-color: ',
        	(data['smell_value']) ? getSmellColor(escapeHTML(data['smell_value'])) : 'gray',
        	'"></div>',
        	'<h3 class="title">',(data['alt']) ? escapeHTML(data['alt']) : '(No Title)','</h3><br>',
        	'<p class="info when">',(data['when']) ? escapeHTML(data['when']) : '?','</p>',
        	'<p class="info lat">',(data['latitude']) ? escapeHTML(data['latitude']) : '?','</p>',
        	'<p class="info long">',(data['longitude']) ? escapeHTML(data['longitude']) : '?','</p>',
        	'<img src="',(data['src']) ? encodeURI(data['src']) : '/','" width="100%">',
        	'<h4 class="caption">',(data['caption']) ? escapeHTML(data['caption']) : "(No Caption)",'</h4>',
      		(data['additional_comments'] && data['additional_comments'] != "null") ? '<p class="info additional_comments">'+escapeHTML(data['additional_comments'])+'</p>' : "",
      	'</div>',
	].join(""));
}

function refreshPosts(){
	$('#posts').html('');
	getTagList('browser_uploads').then(generatePostsFromList);
}

$(refreshPosts);