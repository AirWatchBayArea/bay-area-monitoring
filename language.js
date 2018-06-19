function localizeInit(){
	localize();
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