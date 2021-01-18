const API_SERVER_ROOT = 'http://awba-api-server.herokuapp.com';

class FeedManager {
	constructor() {
		this.feedMapPromise = load(`${API_SERVER_ROOT}/locations`, 'json');
	}

	load(url, responseType) {
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

	getFeedMap() {
		return this.feedMapPromise;
	}
}