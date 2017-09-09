//NOTE: Smell report = incident report, keeping smell language for legacy support

var postList = [];
var showList = [];
var responseList;
var defaultKey = "posted";
var postsPerPage = 5;
var appendMoreTimer;
var spinner;

//generates a post from a given smell report
function generatePostFromSmell(smell_report){
	//parse the additional comments JSON from smell report
	try{
		var additionalCommentsData = JSON.parse(smell_report['additional_comments']);
	}catch(err){
		console.log(err);
		var additionalCommentsData = false;
	}

	var safe_imgs;
	if(additionalCommentsData){
		//IMPORTANT! Checks if JSON was parsed correctly (legacy support for non-stringified submissions)
		var unsafe_imgs = additionalCommentsData.img;
		var safe_imgs = {};
		//safely decode img source and caption/dates
		for(var unsafe_src in unsafe_imgs){
			var safe_src = escapeHTML(decodeURIComponent(unsafe_src));
			safe_imgs[safe_src] = {};
			for(var img_meta in unsafe_imgs[unsafe_src]){
				safe_img_meta = escapeHTML(decodeURIComponent(unsafe_imgs[unsafe_src][img_meta]));
				safe_imgs[safe_src][escapeHTML(img_meta)] = safe_img_meta;
			}
		}
		//safely decode tags into list
		var unsafe_tags = additionalCommentsData['tags'];
		var safe_tags = [];
		for (var i = unsafe_tags.length - 1; i >= 0; i--) {
			safe_tags.push(escapeHTML(decodeURIComponent(unsafe_tags[i])));
		}
	}else{
		//if JSON didn't successfully parse, we have a legacy submission (non-JSON additional comment)
		additionalCommentsData = {'additional_comments': escapeHTML(decodeURIComponent(smell_report['additional_comments']))};
		safe_imgs = {};
	}

	var postData = {
		'latitude': roundLatLng(escapeHTML(smell_report['latitude'])),
		'longitude':roundLatLng(escapeHTML(smell_report['longitude'])),
		'smell_value':parseInt(escapeHTML(smell_report['smell_value'])),
		'smell_description': escapeHTML(smell_report['smell_description']),
		'posted':formatDate(smell_report['created_at']*1000),
		'feelings_symptoms':escapeHTML(smell_report['feelings_symptoms']),
		'img':safe_imgs,
		'additional_comments': escapeHTML(decodeURIComponent(additionalCommentsData['additional_comments'])),
		'tags': safe_tags
	}
	postList.push(makePostItem(
		postData, 
		new Date(0).setUTCSeconds(smell_report['created_at']),
		postData['smell_value'],
		Object.keys(safe_imgs).length,
		additionalCommentsData['tags']
	));
}

//for each retrieved report, generate post
function generateIncidentPosts(json){
	for (var i = json.length - 1; i >= 0; i--) {
		generatePostFromSmell(json[i]);
	}
}

//make a post meta object
function makePostItem(data, posted, smell_value, type, tag){
	return {
		html: generatePostHTML(data),
		posted: posted,
		smell_value: smell_value,
		type: type,
		tag: tag,
	}
}

//get smell color name from value
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

//get hex color for map icon thumbnail
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

//generate a src for map thumbnail
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

//generate post HTML based on available data
function generatePostHTML(data){
	var smellColorStr = (data['smell_value']) ? getSmellColorStr(escapeHTML(data['smell_value'])) : 'gray';
	var imgElms = [];
	for (var src in data.img){
		var imgData = data.img[src];
		var $img = $(new Image());
		$($img).attr("src",src);
		$($img).attr("width",'100%');
		imgElms.push(
					 '<h4 class="caption">',(imgData['caption']) ? escapeHTML(imgData['caption']) : "(no caption)",'</h4>',
					 '<p class="info when">',(imgData['when']) ? escapeHTML(dateFormat(Date.parse(imgData['when']))) : '?','</p>',
					 $($img).prop('outerHTML'));
	}
	return [
		'<div class="post">',
        	'<div class="smell-box" style="background-color: ',
        	smellColorStr,
        	'"></div>',
        	'<h3 class="title">',(data['smell_description'] && checkFalseyString(data['smell_description'])) ? escapeHTML(data['smell_description']) : '(No Description)','</h3><br>',
        	'<p class="info posted">',(data['posted']) ? escapeHTML(data['posted']) : '?','</p>',
        	// '<p class="info lat">',(data['latitude']) ? escapeHTML(data['latitude']) : '?','</p>',
        	// '<p class="info long">',(data['longitude']) ? escapeHTML(data['longitude']) : '?','</p>',
        	'<p class="info tag">',(data['tags'] && checkFalseyString(data['tags'])) ? escapeHTML(data['tags']).split(',').join(', ') : '?','</p>',
        	'<h4 class="caption symptoms">',((data['feelings_symptoms']) && checkFalseyString(data['feelings_symptoms'])) ? escapeHTML(data['feelings_symptoms']) : "(no symptoms)",'</h4>',
        	'<img src="', generateStaticMapURL(data['latitude'],data['longitude'],data['smell_value']), '" width="100%">',
        	imgElms.join(""),
      		(data['additional_comments'] && checkFalseyString(data['additional_comments'])) ? '<p class="info additional_comments">'+escapeHTML(data['additional_comments'])+'</p>' : "",
      	'</div>'
	].join("");
}

//append more posts off the show list
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

//sort show list by key in post meta object
function sortPostsBy(key){
	showList = showList || postList;
	showList.sort(function(a,b){
		return b[key] - a[key] ? b[key] - a[key] : b[defaultKey] - a[defaultKey];
	});
}

//filter show list based on what tag is available
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

//reset posts to show list
function resetToShowList(){
	$('#posts').html('');
	appendMorePosts(showList);
}

//refresh posts
function refreshPosts(){
	console.log("refreshing posts.");
	postList.length = 0;
	updateSmellList().then(function(response){
		generateIncidentPosts(response);
		showList = postList;
		filterPostsBy($("[name=filter]:checked").val())
		sortPostsBy($("select option:selected").val())
		resetToShowList();
	});
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