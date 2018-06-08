function localize(language){
	$("html").attr("lang", language);
	loadResources4Action(language);
	$("[data-localize]").localize("localization/lang", { language: language, callback: cleanupLocalization});
}

function cleanupLocalization(data, defaultCallback){
	$('[data-localize="dashboard.share-dialogue"]').dialog(data['dashboard']['share-dialogue']);
	$('[data-localize="dashboard.share-dialogue"]').dialog('close');
	defaultCallback(data);
}