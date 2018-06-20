var supportedLanguages = ["en", "es"];
//includes polyfill
Array.prototype.includes||Object.defineProperty(Array.prototype,"includes",{value:function(r,e){if(null==this)throw new TypeError('"this" is null or not defined');var t=Object(this),n=t.length>>>0;if(0===n)return!1;var i,o,a=0|e,u=Math.max(a>=0?a:n-Math.abs(a),0);for(;u<n;){if((i=t[u])===(o=r)||"number"==typeof i&&"number"==typeof o&&isNaN(i)&&isNaN(o))return!0;u++}return!1}});

function localizeInit(){
	var userLang = window.navigator.userLanguage || window.navigator.language || 'en'; 
	localize(supportedLanguages.includes(userLang) ? userLang : 'en');
	$('.language').click(function(event){
		var lang = event.target.dataset.lang;
	    localize(lang);
	    event.preventDefault();
	});
}

function localizeUserGuide(language){
	var googleDocLink = {
		'en': {
			'guide': 'https://docs.google.com/document/d/1RL5MGzxdswD37jXnv-9_Skl638ntj7_2OR87YZtcOoM/pub',
			'chem':  '#h.y2qt3fnrqosf'
		},
		'es': {
			'guide': 'https://docs.google.com/document/d/e/2PACX-1vSu8OQrIvnimES2bWpqrUbxtPOGAsa3gPNgLGXm2NoSBQFw5AFwTZqs4YT5V6vBvCLyYtdoIbIhQHTk/pub',
			'chem':  '#h.y2qt3fnrqosf'
		}
	}
	language = language || $("html").attr("lang");
	$('.user-guide-link').attr("href", googleDocLink[language].guide)
	$('.user-guide-chem-link').attr("href", googleDocLink[language].guide+googleDocLink[language].chem)
}

function localize(language){
	language = language || $("html").attr("lang");
	console.log("localizing:", language);
	$('.language').hide();
	$('.language').not('[data-lang="'+language+'"]').show();
	$("html").attr("lang", language);
	loadResources4Action(language);
	localizeUserGuide(language);
	$("[data-localize]").localize("localization/lang", { language: language, callback: cleanupLocalization});
}

function cleanupLocalization(data, defaultCallback){
	$('[data-localize="dashboard.share-dialogue"]').dialog(data['dashboard']['share-dialogue']);
	$('[data-localize="dashboard.share-dialogue"]').dialog('close');
	defaultCallback(data);
}

$(localizeInit);