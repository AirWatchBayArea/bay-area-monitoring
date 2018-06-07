function localize(language){
	$("html").attr("lang", language);
	$("[data-localize]").localize("localization/lang", { language: language });
}