var localizedGoogleSheetUrls = {
    'en': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBeSMdS3IknhvHmCdKH_Cy2_Vkj5y8Hc68JKDm1KgmgYVwdt468MYNQhjEzrhcl_duXP1PiBbJgFuq/pub?output=tsv&single=true',
    'es': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSBHbVmNHU9feWZRqYvLVzeSVD_hiOKdgVMk0LwcCIxnGawGf0vwf1sfbEJVQjCMT5y7B4pD_kS-DrR/pub?output=tsv&single=true',
}

var custom = {
'summer_of_maps': ['<li>',
	"As part of the <a href='http://www.summerofmaps.com' target='_blank'>Summer of Maps project</a>, ",
	"<a href='https://www.azavea.com' target='_blank'>Azavea</a> intern <a href='https://www.fairtechcollective.org/collaborators' target='_blank'> Sarah Gates</a>",
	" created a series of infographics visualizing pollution released from refinery flaring, and sensitive receptors in close proximity to Bay area refineries.",
	"<a href='https://www.azavea.com/blog/2017/09/18/investigating-refinery-flaring-pollution' target='_blank'> Read her description of the project.</a> View or download the infographics:",
	"<ol>",
	"<li><a href='https://www.fairtechcollective.org/s/Bay-Area-Overview' target='_blank'>Bay area overview</a></li>",
	"<li><a href='https://www.fairtechcollective.org/s/flaring_animation.gif' target='_blank'>2 years of flaring</a></li>",
	"<li><a href='https://www.fairtechcollective.org/s/Chevron_Richmond.pdf' target='_blank'>Richmond</a></li>",
	"<li><a href='https://www.fairtechcollective.org/s/Phillips66_Rodeo.pdf' target='_blank'>Rodeo</a></li>",
	"<li><a href='https://www.fairtechcollective.org/s/Shell_Tesoro_Martinez.pdf' target='_blank'>Martinez</a></li>",
	"<li><a href='https://www.fairtechcollective.org/s/Valero_Benicia.pdf' target='_blank'>Benicia</a></li>",
	"</ol>",
	"</li>"].join('')
}

//Jumps to the index of post relative to the clicked link in R4A
function jumpToIndex(index){
  scrollToElmMiddle($('section.post').eq(index));
}

function getGoogleSheetURL(sheetGID, language){
	return localizedGoogleSheetUrls[language || 'en'] + '&gid=' + sheetGID;
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
    load(localizedGoogleSheetUrls[language || 'en'], 'text').then(function(gidList){
        gidList = gidList.split(/\r\n|\n/)[0].split('\t').slice(1);
        var loadList = gidList
                    .map(function(gid){
                        return getGoogleSheetURL(gid, language);
                    })
                    .map(function(url){
                        return load(url, 'text');
                    });
        return Promise.all(loadList)
    }).then(function(response){
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

function resources4ActionInit(){
    loadResources4Action('en');
}

$(resources4ActionInit)
