var rootCloudinaryListUrl = "http://www.res.cloudinary.com/hpkutahah/image/list/";
var rootCloudianrtFetchUrl = "http://res.cloudinary.com/hpkutahah/image/upload/";

var postList = [];
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

function generateSmellPosts(json){
	for (var i = 0; i < json.length; i++) {
		generatePostFromSmell(json[i]);
	}
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
	return dateFormat(dateStr, "mmmm d, yyyy, h:MMtt");
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
		postData['when']=formatDate(Date.parse(decodeURIComponent(context['when'])));
		postData['additional_comments']=decodeURIComponent(context['additional_comments']);
	}
	postList.push({
		html: generatePostHTML(postData), 
		when: Date.parse(decodeURIComponent(context['when'])), 
		post: Date.parse(resource['created_at']), 
		smell_report: smell_report,
	});
}

function generatePostFromSmell(smell_report){
	var postData = {
		'latitude': roundLatLng(smell_report['latitude']),
		'longitude':roundLatLng(smell_report['longitude']),
		'smell_value':smell_report['smell_value'],
		'alt': smell_report['smell_description'],
		'caption':smell_report['feelings_symptoms'],
		'when': formatDate(smell_report['created_at']*1000),
		'additional_comments': smell_report['additional_comments'],
	}
	postList.push({
		html: generatePostHTML(postData), 
		when: new Date(0).setUTCSeconds(smell_report['created_at']),
		post: new Date(0).setUTCSeconds(smell_report['created_at']),
		smell_report: smell_report,
	});
}

function getSmellColorStr(smellVal){
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
	return [
		'<div class="post">',
        	'<div class="smell-box" style="background-color: ',
        	(data['smell_value']) ? getSmellColorStr(escapeHTML(data['smell_value'])) : 'gray',
        	'"></div>',
        	'<h3 class="title">',(data['alt'] && data['alt'] != "null") ? escapeHTML(data['alt']) : '(No Description)','</h3><br>',
        	'<p class="info when">',(data['when']) ? escapeHTML(data['when']) : '?','</p>',
        	'<p class="info lat">',(data['latitude']) ? escapeHTML(data['latitude']) : '?','</p>',
        	'<p class="info long">',(data['longitude']) ? escapeHTML(data['longitude']) : '?','</p>',
        	(data['src']) ? '<img src="'+ encodeURI(data['src'])+'" width="100%">' : "",
        	'<h4 class="caption">',(data['caption']) ? escapeHTML(data['caption']) : "(No Caption)",'</h4>',
      		(data['additional_comments'] && data['additional_comments'] != "null") ? '<p class="info additional_comments">'+escapeHTML(data['additional_comments'])+'</p>' : "",
      	'</div>',
	].join("")
}

function appendPosts(){
	for (var i = 0; i < postList.length; i++) {
		$('#posts').append(postList[i].html);
	}
}

function refreshPosts(){
	postList.length = 0;
	Promise.all([getTagList('browser_uploads'), updateSmellList()]).then(function(response){
		generatePostsFromList(response[0]);
		generateSmellPosts(response[1])
		sortPostBy($("select option:selected" ).val())
	});
}

function sortPostBy(key){
	$('#posts').html('');
	postList.sort(function(a,b){return b[key] - a[key]});
	appendPosts();
}

$(function(){
	refreshPosts();
	$('select[name=sort]').change(function(ev){
		sortPostBy(ev.target.value);
	});
});