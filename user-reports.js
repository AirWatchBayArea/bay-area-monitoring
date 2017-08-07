var rootCloudinaryListUrl = "http://www.res.cloudinary.com/hpkutahah/image/list/";
var rootCloudianrtFetchUrl = "http://res.cloudinary.com/hpkutahah/image/upload/";

var postList = [];
var showList = [];
var responseList;
var defaultKey = "when";
var postsPerPage = 5;
var appendMoreTimer;
var spinner;

function makeListURL(tag){
	return rootCloudinaryListUrl + tag + ".json?context=true";
}

function makeFetchURL(tag, ext){
	return rootCloudianrtFetchUrl + tag + "." + ext;
}

function getCloudinaryTagList(tag){
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
	for (var i = json.length - 1; i >= 0; i--) {
		generatePostFromSmell(json[i]);
	}
}

function generatePostsFromList(json){
	var resources = json.resources;
	for (var i = resources.length - 1; i >= 0; i--) {
		generatePostFromResource(resources[i]);
	}
}

function roundLatLng(val){
	return Math.floor(val*1000+0.5)/1000;
}

function formatDate(d){
	return dateFormat(d, "mmmm d, yyyy, h:MMtt");
}

function makePostItem(htmlStr, when, post, smell_report, type, tag){
	return {
		html: generatePostHTML(htmlStr),
		when: when,
		post: post,
		smell_value: smell_report['smell_value'],
		type: type,
		tag: tag,
	}
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
		postData['tag']=decodeURIComponent(context['tag']).split(',');
	}

	postList.push(makePostItem(
			postData,
			Date.parse(decodeURIComponent(context['when'])),
			Date.parse(resource['created_at']),
			smell_report,
			1,
			postData['tag']));
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
		'tag':'odor',
	}
	postList.push(makePostItem(
		postData, 
		new Date(0).setUTCSeconds(smell_report['created_at']),
		new Date(0).setUTCSeconds(smell_report['created_at']),
		smell_report,
		0,
		["odor"],
	));
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

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function getMapSmellColorStr(smellVal){
	switch(parseInt(smellVal)){
		case 1: 
			return rgbToHex(0,255,0)//"lime";
		break;
		case 2: 
			return rgbToHex(255,255,0)//"yellow";
		break;
		case 3: 
			return rgbToHex(255,165,0)//"orange";
		break;
		case 4: 
			return rgbToHex(255,0,0)//"crimson";
		break;
		case 5: 
			return rgbToHex(102,51,153)//"rebeccapurple";
		break;
		default:
			return rgbToHex(100,100,100)//"gray";
	}
}

function escapeHTML(text){
	return $("<div>").text(text).html()
}

function generateStaticMapURL(lat, lng, smellVal){
	// return ""
	return [
			"https://maps.googleapis.com/maps/api/staticmap?",
			"center=",
			"&zoom=13",
			"&scale=false",
			"&size=500x300",
			"&maptype=roadmap",
			"&format=png",
			"&visual_refresh=true",
			"&markers=size:mid%7Ccolor:",
			getMapSmellColorStr(smellVal),
			"%7Clabel:%7C",
			lat, ",", "+", lng,
			"&key=AIzaSyACnBtr47XRPi-D7l4jl5rPKMIOeZxXgSc",
			].join('');
}

function checkFalseyString(str){
	return (str != "null" && str != "undefined");
}

function generatePostHTML(data){
	var smellColorStr = (data['smell_value']) ? getSmellColorStr(escapeHTML(data['smell_value'])) : 'gray';
	return [
		'<div class="post">',
        	'<div class="smell-box" style="background-color: ',
        	smellColorStr,
        	'"></div>',
        	'<h3 class="title">',(data['alt'] && checkFalseyString(data['alt'])) ? escapeHTML(data['alt']) : '(No Description)','</h3><br>',
        	'<p class="info when">',(data['when']) ? escapeHTML(data['when']) : '?','</p>',
        	// '<p class="info lat">',(data['latitude']) ? escapeHTML(data['latitude']) : '?','</p>',
        	// '<p class="info long">',(data['longitude']) ? escapeHTML(data['longitude']) : '?','</p>',
        	'<p class="info tag">',(data['tag'] && checkFalseyString(data['tag'])) ? escapeHTML(data['tag']).split(',').join(', ') : '?','</p>',
        	'<img src="', data['src'] ? encodeURI(data['src']) : generateStaticMapURL(data['latitude'],data['longitude'],data['smell_value']), '" width="100%">',
        	'<h4 class="caption">',(data['caption']) ? escapeHTML(data['caption']) : "(No Caption)",'</h4>',
      		(data['additional_comments'] && checkFalseyString(data['additional_comments'])) ? '<p class="info additional_comments">'+escapeHTML(data['additional_comments'])+'</p>' : "",
      	'</div>',
	].join("");
}

function appendMorePosts(showList){
	showList = showList || postList;
	var i = $('#posts .post').length;
	var numAppended = postsPerPage;
	while(i < showList.length && numAppended--){
		$('#posts').append(showList[i].html);
		i++;
	}
	spinner.stop();
}

function refreshPosts(){
	console.log("refreshing posts.");
	postList.length = 0;
	Promise.all([getCloudinaryTagList('browser_uploads'), updateSmellList()]).then(function(response){
		generatePostsFromList(response[0]);
		generateSmellPosts(response[1]);
		showList = postList;
		filterPostsBy($("[name=filter]:checked").val())
		sortPostsBy($("select option:selected").val())
		resetToShowList();
	});
}

function sortPostsBy(key){
	showList = showList || postList;
	showList.sort(function(a,b){
		return b[key] - a[key] ? b[key] - a[key] : b[defaultKey] - a[defaultKey];
	});
}

function filterPostsBy(tag){
	$('#posts').html('');
	var tagList = $('[name=tag]').map(function (i,cb) { return cb.value} ).get();
	showList = tag ? 
		postList.filter(function(obj){
			if(tag=="other"){
				//returns -1 if not in array
				for (var i = obj.tag.length - 1; i >= 0; i--) {
					if($.inArray(obj.tag[i], tagList) == -1){
						return true;
					};
				}
				return false;
			}else{
				for (var i = obj.tag.length - 1; i >= 0; i--) {
					if(obj.tag[i] == tag){
						return true;
					};
				}
				return false;
			}
		}) : postList;
	$('.result-count').text(showList.length + ' of ' + postList.length);
}

function resetToShowList(){
	$('#posts').html('');
	appendMorePosts(showList);
}

$(function(){
	refreshPosts();
	$("[name=filter]").change(function(ev){
		filterPostsBy(ev.target.value);
		resetToShowList();
	});
	$('select[name=sort]').change(function(ev){
		sortPostsBy(ev.target.value);
		resetToShowList();
	});
	spinner = new Spinner({
		top: '100.2%',
		radius: 8,
		color: "#666",
		opacity: .4,
		trail: 45,
	}).spin()
	$(window).scroll(function() {
   		if(window.location.hash == "#user-reports" && postList.length > $('#posts .post').length && $(window).scrollTop() + $(window).height() == $(document).height()) {
	      console.log("got to bottom");
	      clearTimeout(appendMoreTimer);
	      spinner.spin();
	      document.getElementById('spinner').appendChild(spinner.el)
	      appendMoreTimer = setTimeout(function(){appendMorePosts(showList)}, 1000);
	   }
	});
});