'use strict';

class ChartManager {
	constructor() {
		this.grapherLoaded = new Promise((resolve) => {
			window.grapherLoad = resolve;
		});
		this.plotManager = this.grapherLoaded.then(() => {
			return new org.bodytrack.grapher.PlotManager("dateAxis");
		});
	}
}