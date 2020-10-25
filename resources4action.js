const localizedTsvUrls = {
    en: [
            'r4a/facebook_en.tsv',
            'r4a/bay_orgs_en.tsv',
            'r4a/officials_en.tsv',
            'r4a/contact_en.tsv'
        ],
    es: [
            'r4a/facebook_es.tsv',
            'r4a/bay_orgs_es.tsv',
            'r4a/officials_es.tsv',
            'r4a/contact_es.tsv'
        ],
}

// Jumps to the index of post relative to the clicked link in R4A
function jumpToIndex(index){
  scrollToElmMiddle($('section.post').eq(index));
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
              reject(Error(xhr.responseText));
          }
        };
        // Handle network errors
        xhr.onerror = function() {
          reject(Error("Network Error"));
        };
        xhr.send();
    }); 
}  
function loadResources4Action(language){
    $('.resource-container>nav.table-of-contents>ul').html('');
    $('#resources-for-action-page .post').remove();
    var resources_spinner = new Spinner({
        radius: 8,
        color: "#666",
        opacity: .4,
        trail: 45,
    }).spin()
    document.getElementById('resources-spinner').appendChild(resources_spinner.el);
    Promise.all(localizedTsvUrls[language || 'en'].map(function(url){
        return load(url, 'text');
    }))
    .then(function(response){
        for(var i = 0; i < response.length; i++){
            processTSV(response[i]);
        }
        $('.resource-container>nav.table-of-contents>ul>li').each(function(index){
            $(this).find('a').click(function(){
                jumpToIndex(index)
            });
        })
        resources_spinner.stop()
    }).catch(function(reject){
        console.log(reject);
    });
}

function processTSV(tsv){
	var allTSVLines = tsv.split(/\r\n|\n/);
	var sectionTitle = escapeHTML(allTSVLines[0].split('\t')[0]);
	var sectionSubtitle = escapeHTML(allTSVLines[1].split('\t')[0]);
    var headers = allTSVLines[3].split(',');
    $('.resource-container>nav.table-of-contents>ul').append('<li><a>'+sectionTitle+'</a></li>')
    var restTSV = allTSVLines.slice(4)
    var $post = $([
    		'<section class="post">',
    		'<h3 class="resource-title">', sectionTitle, '</h3>',
    		'<p>', sectionSubtitle, '</p>',
    		'<ul>','</ul>',
    		'</section>'].join(''))

    for(var i = 0; i < restTSV.length; i++){
    	var entry = restTSV[i].split('\t').map(escapeHTML)
    	$entryHTML = entry[0] != "CUSTOM" ? $([
    		'<li>',
    			'<a href="' + entry[1] + '" target="_blank">',
    			entry[0],
    			'</a>',
    		'</li>',
    		].join(''))
    	: $(custom[entry[1]])
    	bullets = entry.slice(2)
    	if(bullets[0]){
    		$($entryHTML).append('<ul></ul>')
    		for(var j = 0; j < bullets.length; j++){
    			$($entryHTML).children('ul').append('<li>'+bullets[j]+'</li>')
    		}
    	}
    	$($post).children('ul').append($entryHTML)
    }
    $('#resources-for-action-page .resource-container').append($post)
}