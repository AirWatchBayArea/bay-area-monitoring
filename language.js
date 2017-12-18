var languages = ['en','es'];

function showLanguage(language){
	for (var i = languages.length - 1; i >= 0; i--) {
		$(':lang('+languages[i]+')').hide();
	}
	$(':lang('+language+')').show();
}