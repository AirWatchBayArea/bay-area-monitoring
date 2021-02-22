'use strict';

const FeedType = {	
	REFINERY: 'Refinery',
	BAAQMD: 'BAAQMD',
	PURPLEAIR: 'PurpleAir',
	COMMUNITY: 'Community',
}

class FeedManager {
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

	static HEALTH_LIMIT_MAP = {
	  "Benzene (ppb)" : 1,
	  "Black Carbon (µg/m³)": 5,
	  "Hydrogen Sulfide (ppb)": 8,
	  "Sulfur Dioxide (ppb)": 75,
	  "Toluene (ppb)": 70,
	  "Xylene (ppb)": 50,
	  "Ethylbenzene (ppb)": 60,
	  "VOC (ppb)": 345,
	  "Dust (µg/m³)": 10,
	  "PM 2 5 (µg/m³)": 35,
	  "PM2 5 (µg/m³)": 35,
	};

	static COMMUNITY_DETECTION_LIMIT_MAP = {
	  "Benzene (ppb)" : 0.5,
	  "Hydrogen Sulfide (ppb)": 2,
	  "Toluene (ppb)": 0.5,
	  "Xylene (ppb)": 0.5,
	  "Ethylbenzene (ppb)": 0.5,
	  "Black Carbon (µg/m³)": 0.05
	};

	static REFINERY_DETECTION_LIMIT_MAP = {
	  "Benzene (ppb)" : 5,
	  "Hydrogen Sulfide (ppb)": 30,
	  "Sulfur Dioxide (ppb)": 5,
	  "Toluene (ppb)": 5,
	  "Xylene (ppb)": 5
	};

	static MONITOR_TYPE_COLORS = {
	  [FeedType.REFINERY] : "rgb(245,124,0)",
	  [FeedType.BAAQMD] : "rgb(1,87,155)",
	  [FeedType.PURPLEAIR] : "rgb(103,58,183)",
	  [FeedType.COMMUNITY] : "rgb(170,68,170)"
	};

	constructor() {
		/** Current active location to show. */
		this.activeLocation = 'Atchison Village';
		/** Feed data keyed by feed object. */
		this.feedDataCache = new WeakMap();
		/** Feed metadata keyed by feed ID. */
		this.esdrFeedCache = {};
		/** Feeds keyed by location. */
		this.feedMap = {};
		/** Promise to wait on for feedMap initialization. */
		this.feedMapPromise = this.initFeedMap();
		/** Wind feed metadata and data.*/
		this.windFeeds = [];
		/** Promise to wait on for windFeeds initialization. */
		this.windFeedsPromise = this.initWindFeeds();
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

	get feedData() {
		return this.feeds.map(feed => this.feedDataCache.get(feed));
	}

	makeAWBARequest(route) {
		const apiServerRoot = 'http://awba-api-server-staging.herokuapp.com';
		return this.load(`${apiServerRoot}/${route.replace(/^\//, '')}`, 'json');
	}
 
	makeESDRRequest(route) {
		const esdrServerRoot = 'https://esdr.cmucreatelab.org/api/v1';
		return this.load(`${esdrServerRoot}/${route.replace(/^\//, '')}`, 'json');
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
		const feeds = await this.makeAWBARequest('/locations');
		const feedMap = {};
		feeds.forEach((feed) => {
			feed.name && (feedMap[feed.name] = feed);
		});
		this.feedMap = feedMap;
		return feedMap;
	}

	async initWindFeeds() {
		const feeds = await this.makeAWBARequest('/feeds/wind');
		this.windFeeds = feeds.map((feed) => Object.assign(feed, {
			requested_day: {},
	        channels: this.getChannels(feed),
	        fullTimeRange: {},
	        type: this.getType(feed),
		}));
		return this.windFeeds;
	}

	async loadFeeds() {
		const feedMap = await this.feedMapPromise;
		if (this.feedIds.some((id) => !(id in this.esdrFeedCache))) {
			let feeds = [];
			try {
				feeds = await this.makeAWBARequest(`feeds/location/${this.locationId}`);
			} catch {
				// Fallback to ESDR.
				feeds = await Promise.all(this.feedIds.map((id) => this.makeESDRRequest(`feeds/${id}`)))
			}
			feeds.forEach((feed) => {
				feed = feed.data || feed;
				feed.id && (feed.id in this.esdrFeedCache || (this.esdrFeedCache[feed.id] = feed));
			});
		}
		this.feedIds.map((id) => this.esdrFeedCache[id]).forEach((feed) => {
			this.feedDataCache.has(feed) || (this.feedDataCache.set(feed, {
				requested_day: {},
		        channels: this.getChannels(feed),
		        fullTimeRange: {},
		        type: this.getType(feed),
			}));
		});
	}

	getType(feed) {
		if(feed.name.match(/fenceline|valero|chevron/i)) {
			return FeedType.REFINERY;
		}
		else if(feed.name.match(/BAAQMD/i)) {
			return FeedType.BAAQMD;
		}
		else if (feed.name.match(/PurpleAir/i)) {
			return FeedType.PURPLEAIR;
		}
		else {
			return FeedType.COMMUNITY;
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
	        	label = label.replace(/\s(H2S|SO2|NO2|NO|CO)$/, '').trim();
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

	/**
	 * E.g. // https://environmentaldata.org/#channels=26231.PM2_5,26231.PM2_5&time=1611986393.792,1612591193.792&center=38.08323001621915,-122.09415435791016&zoom=13&search=AWBA
	 */
	makeESDRLink(minTime, maxTime, cursor) {
		const channels = this.feedData.reduce((feed, channels) => {
			return [
				...channels,
				...Object.keys(feed.channels).map(channel => `${feed.id}.${channel}`)
			];
		}, []).join(',');
		const center = `${this.feeds[0].latitude},${this.feeds[0].longitude}`;
		const link = `https://environmentaldata.org/#channels=${channels}&time=${minTime},${maxTime}&cursor=${cursor}&center=${center}&search=AWBA`;
	}

	healthLimit(chemicalLabel) {
		return FeedManager.HEALTH_LIMIT_MAP[chemicalLabel];
	}

	communityDetectionLimit(chemicalLabel) {
		return FeedManager.COMMUNITY_DETECTION_LIMIT_MAP[chemicalLabel];
	}

	refineryDetectionLimit(chemicalLabel) {
		return FeedManager.REFINERY_DETECTION_LIMIT_MAP[chemicalLabel];
	}

	monitorTypeColor(feedType) {
		return FeedManager.MONITOR_TYPE_COLORS[feedType];
	}
}
