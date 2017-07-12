// Spinner


function showSpinner(text) {
  SpinnerPlugin.activityStart(text, {dimBackground: true});
}


function hideSpinner() {
  SpinnerPlugin.activityStop(null, null);
}
