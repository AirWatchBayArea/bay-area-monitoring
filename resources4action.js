var googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBeSMdS3IknhvHmCdKH_Cy2_Vkj5y8Hc68JKDm1KgmgYVwdt468MYNQhjEzrhcl_duXP1PiBbJgFuq/pub?output=tsv&single=true';

function getGoogleSheetURL(sheetGID){
	return googleSheetUrl + '&gid=' + sheetGID
}

function load(url, responseType) {
    return new Promise(function(resolve, reject){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = responseType;
        xhr.onload = function() {
          if(xhr.status == 200){
              resolve(this.response);
          }else{
              reject(Error(xhr.statusText));
          }
        };
        // Handle network errors
        xhr.onerror = function() {
          reject(Error("Network Error"));
        };
        xhr.send();
    }); 
  }

function resources4ActionInit(){
	load(googleSheetUrl, 'text').then(function(gidList){
		gidList = gidList.split(/\r\n|\n/)[0].split('\t').slice(1);
		var loadList = gidList
					.map(getGoogleSheetURL)
					.map(function(url){
							return load(url, 'text');
						})
		return Promise.all(loadList)
	}).then(function(response){
		for(var i = 0; i < response.length; i++){
			processCSV(response[i]);
		}
	}).catch(function(reject){
		console.log(reject);
	});
}

function processCSV(csv){
	var allCSVLines = csv.split(/\r\n|\n/);
	var sectionTitle = escapeHTML(allCSVLines[0].split('\t')[0]);
	var sectionSubtitle = escapeHTML(allCSVLines[1].split('\t')[0]);
    var headers = allCSVLines[3].split(',');
    $('.resource-container>nav.table-of-contents>ul').append('<li><a onclick="jumpToIndex(this)">'+sectionTitle+'</a></li>')
    var restCSV = allCSVLines.slice(4)
    var $post = $([
    		'<section class="post">',
    		'<h3 class="resource-title">', sectionTitle, '</h3>',
    		'<p>', sectionSubtitle, '</p>',
    		'<ul>','</ul>',
    		'</section>'].join(''))

    for(var i = 0; i < restCSV.length; i++){
    	var entry = restCSV[i].split('\t').map(escapeHTML)
    	$entryHTML = $([
    		'<li>',
    			'<a href="' + entry[1] + '" target="_blank">',
    			entry[0],
    			'</a>',
    		'</li>',
    		].join(''))
    	bullets = entry.slice(2)
    	if(bullets[0]){
    		$($entryHTML).append('<ul></ul>')
    		for(var j = 0; j < bullets.length; j++){
    			$($entryHTML).children('ul').append('<li>'+bullets[j]+'</li>')
    		}
    	}
    	$($post).children('ul').append($entryHTML)
    }
    $('.resource-container').append($post)
}

$(resources4ActionInit)
