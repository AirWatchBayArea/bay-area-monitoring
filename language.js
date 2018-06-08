function localize(language){
	$("html").attr("lang", language);
	$("[data-localize]").localize("localization/lang", { language: language});
}

function cleanupLocalization(data){
	// $('[data-localize="dashboard.share-dialogue"]').dialog({'title':data['dashboard']['share-dialogue']});
}