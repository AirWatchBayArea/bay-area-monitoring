function localize(language){
	$("html").attr("lang", language);
	$("[data-localize]").localize("localization/lang", { language: language, callback: cleanupLocalization});
}

function cleanupLocalization(data, defaultCallback){
	$('[data-localize="dashboard.share-dialogue"]').dialog(data['dashboard']['share-dialogue']);
	defaultCallback(data);
}