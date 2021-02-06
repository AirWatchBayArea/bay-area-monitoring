'use strict';

class FeedManager {
	static USE_AWBA_SERVER = false;
	static TARGET_CHANNELS = [
	  'Benzene',
	  'Toluene',
	  'Xylene', // Also matches 'm_p_Xylene' and 'o_Xylene'.
	  'Hydrogen_Sulfide',
	  'H2S',
	  'Black_Carbon',
	  'Ethylbenzene',
	  'Sulfur_Dioxide',
	  'SO2',
	  'voc',
	  'dust',
	  'PM_2_5', // Also matches 'PM2_5'.
	  'Carbon_Monoxide',
	  'Nitrogen_Dioxide',
	  'Nitrous_Oxide',
	  'Methane',
	  'Pentane',
	  'Wind',
	];//,'Ammonia','3_Methylpentane','N_Hexane']

	static FEED_MAP = [{"id":0,"name":"Atchison Village","feedIds":[4910,4909,38825]},{"id":1,"name":"North Richmond","feedIds":[4911,4912,38816,38818]},{"id":2,"name":"Point Richmond","feedIds":[4913,4914,38817]},{"id":3,"name":"North Rodeo","feedIds":[4902,38294]},{"id":4,"name":"South Rodeo","feedIds":[4901,10011,38295]},{"id":5,"name":"Benicia","feedIds":[26227,26224,26228,26229,26230]},{"id":6,"name":"Valero North","feedIds":[26345,26349,26350,26354,26348]},{"id":7,"name":"Valero South","feedIds":[26346,26347,26351,26394]},{"id":8,"name":"Vallejo","feedIds":[14840,14841,33095,36715,14933,14934,24327,24328,13470,13471,38638,38639,38649,38647,38641,38637,38643,38644,38645,38646]},{"id":9,"name":"El Sobrante","feedIds":[13310]},{"id":10,"name":"El Cerrito","feedIds":[13304]},{"id":11,"name":"Berkeley","feedIds":[12848]},{"id":12,"name":"Martinez","feedIds":[38674,38675,38676,38677,38678,38680,38681,38682,38683]},{"id":13,"name":"Clyde","feedIds":[17230]},{"id":14,"name":"BAAQMD","feedIds":[4850,4846,4857,4849]}];
	static WIND_FEEDS = [26394, 38294, 38684, 38816];

	constructor() {
		this.activeLocation = 'Atchison Village';
		this.activeFeedCache = new WeakMap();
		this.windFeedCache = new WeakMap();
		this.esdrFeedCache = {};
		this.feedMap = {};
		this.feedMapPromise = this.initFeedMap();
	}

	get locationId() {
		return this.feedMap[this.activeLocation]?.id;
	}

	get feedIds() {
		return this.feedMap[this.activeLocation]?.feedIds;
	}

	get feeds() {
		return this.feedIds.map(id => this.esdrFeedCache[id]);
	}

	makeAWBARequest(route) {
		const apiServerRoot = 'http://awba-api-server.herokuapp.com';
		return this.load(`${apiServerRoot}/${route}`, 'json');
	}
 
	makeESDRRequest(route) {
		const esdrServerRoot = 'https://esdr.cmucreatelab.org/api/v1';
		return this.load(`${esdrServerRoot}/${route}`, 'json');
	}

	load(url, responseType) {
	    return new Promise(function(resolve, reject){
	        const xhr = new XMLHttpRequest();
	        xhr.open('GET', url);
	        xhr.responseType = responseType;
	        xhr.onload = function() {
	          if(xhr.status == 200){
	              resolve(this.response);
	          } else {
	              reject(Error(xhr.responseText));
	          }
	        };
	        // Handle network errors
	        xhr.onerror = function() {
	          reject(Error('Network Error'));
	        };
	        xhr.send();
	    }); 
	}

	async initFeedMap() {
		const feeds = await (
			FeedManager.USE_AWBA_SERVER ? 
				this.makeAWBARequest('locations') : 
				Promise.resolve(FeedManager.FEED_MAP));
		const feedMap = {};
		feeds.forEach((feed) => {
			feed.name && (feedMap[feed.name] = feed);
		});
		this.feedMap = feedMap;
		return feedMap;
	}

	async loadFeeds() {
		const feedMap = await this.feedMapPromise;
		if (this.feedIds.some((id) => !(id in this.esdrFeedCache))) {
			let feeds = [];
			if (FeedManager.USE_AWBA_SERVER) {
				feeds = await this.makeAWBARequest(`/feeds/location/${this.locationId}`);
			} else {
				feeds = await Promise.all(this.feedIds.map((id) => this.makeESDRRequest(`feeds/${id}`)))
			}
			feeds.forEach((feed) => {
				feed = feed.data || feed;
				feed.id && (feed.id in this.esdrFeedCache || (this.esdrFeedCache[feed.id] = feed));
			});
		}
		this.feedIds.map((id) => this.esdrFeedCache[id]).forEach((feed) => {
			this.activeFeedCache.has(feed) || (this.activeFeedCache.set(feed, {
				requested_day: {},
		        channels: this.getChannels(feed),
		        fullTimeRange: {},
		        type: this.getType(feed),
			}));
		});
	}

	async loadWindFeeds() {
		if (FeedManager.WIND_FEEDS.some((id) => !(id in this.esdrFeedCache))) {
			let feeds = [];
			if (FeedManager.USE_AWBA_SERVER) {
				feeds = await this.makeAWBARequest(`/feeds/wind`);
			} else {
				feeds = await Promise.all(FeedManager.WIND_FEEDS.map((id) => this.makeESDRRequest(`feeds/${id}`)))
			}
			feeds.forEach((feed) => {
				feed = feed.data || feed;
				feed.id && (feed.id in this.esdrFeedCache || (this.esdrFeedCache[feed.id] = feed));
			});
		}
		FeedManager.WIND_FEEDS.map((id) => this.esdrFeedCache[id]).forEach((feed) => {
			this.windFeedCache.has(feed) || (
				this.windFeedCache.set(feed, 
					this.activeFeedCache.get(feed) || {
						requested_day: {},
				        channels: this.getChannels(feed),
				        fullTimeRange: {},
				        type: this.getType(feed),
					}));
		});
	}

	getType(feed) {
		if(feed.name.match(/Fenceline|Valero|Chevron/i)) {
			return 'Refinery';
		}
		else if(feed.name.match(/BAAQMD/i)) {
			return 'BAAQMD';
		}
		else if (feed.name.match(/PurpleAir/i)) {
			return 'PurpleAir';
		}
		else {
			return 'Community';
		}
	}

	getChannels(feed) {
		const channels = {};
		const feedChannels = Object.keys(feed.channelBounds.channels)
								   .filter(
								   		(channel) => !channel.includes('qcCode')
								   	);
		for (const channel of feedChannels) {
			if (channel.match(/wind/i)) {
				channels[channel] = {
					show_graph: false,
					hourly: false,
					summary: {}
				};
				continue;
			}
			let label = channel.replace(/^(FTIR|TDL|UV)_/, '');
			const matches = FeedManager.TARGET_CHANNELS.filter((target) => {
	          const channelRegex = new RegExp(target.replace('_', '.*?'));
	          return label.match(channelRegex);
	        });
	        // Pick the shortest match.
	        const bestMatch = matches.sort((a, b) => b.length - a.length)[0];
	        if (bestMatch) {
	        	label = label.replace(/_|\.|(?:\s+)/g,' ').trim();
	        	label = label.replace(/\s(H2S|SO2|NO2|NO|CO)$/, '');
	        	switch(label) {
	        		case 'H2S':
	        			label = 'Hydrogen Sulfide';
	        			break;
	        		case 'Sulfor Dioxide':
					case 'SO2':
						label = 'Sulfur Dioxide';
						break;
					case 'PM2 5':
					case 'PM 2 5':
					case 'Fine Particulate Matter PM2 5':
						label = 'PM 2.5';
						break;
					case 'EthylBenzene':
					case 'Ethyl Benzene':
						label = 'Ethylbenzene';
	        	}
				const units = (new Set(['Black Carbon', 'PM 2.5'])).has(label) ?
				'(µg/m³)' : '(ppb)';
				channels[channel] = {
					show_graph: true,
					hourly: true,
					graphMetaData: {
					  label: `${label} ${units}`
					},
					summary: {}
				};
	       }
		}
		return channels;
	}
}
