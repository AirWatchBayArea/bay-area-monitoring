'use strict';
const TILE_BOUNDARY_SENTINEL_VALUE = -1e+308;

class ChartManager {
	constructor(plotManager, feedManager) {
		this.plotManager = plotManager;
		this.feedManager = feedManager;
		this.seriesIds = new Set();
	}

	reset() {
		this.plotManager.removeAllPlotContainers();
	}

	setupTileSource(channelName, feedAPIKey) {
	  return (level, offset, successCallback, failureCallback) => {
	  	new Promise((resolve, reject) => {
	  		$.ajax({
		      type: 'GET',
		      dataType: 'json',
		      url: `${ESDR_API_ROOT_URL}/feeds/${feedAPIKey}/channels/${channelName}/tiles/${level}.${offset}`,
		      success: resolve,
		      failure: reject,
		    });
	  	}).then((json) => {
	        for (let i = 0; i < json.data.data.length; i++) {
	          //if reading is 0, tell grapher not to draw it
	          if(json.data.data[i][1] == 0) {
	            json.data.data[i][1] = TILE_BOUNDARY_SENTINEL_VALUE;
	          }
	        }
	        successCallback(JSON.stringify(json.data));
	  	}).catch(failureCallback);
	  };
	};

	createAggregateChart(feed, channelName, feedAPIKey) {
		const channelLabel = feed.channels[channelName].graphMetaData.label;
		const seriesIdx = channelLabel.toLowerCase().replace(/\(.+\)/g, '').replace(/[\s.]/, '_');
		createChart(feed, channelName, feedAPIKey, channelLabel, seriesIdx);
	}

	createChart(feed, channelName, feedAPIKey, channelLabel, seriesIdx) {
		const datasource = this.setupTileSource(channelName, feedAPIKey);
		let plotContainerId = seriesIdx + '_plot_container';
		let plotId = seriesIdx + '_plot';
		let yAxisId = seriesIdx + '_yaxis';
		if (this.seriesIds.has(seriesIdx)) {
			const tmpId = new Date().getTime() + Math.ceil(Math.random() * 100000);
			plotId += tmpId;
			yAxisId = seriesIdx + '_yaxis';
			const plotContainer = this.plotManager.getPlotContainer(plotContainerId);
			plotContainer.addDataSeriesPlot(plotId, datasource, yAxisId);
		} else {
			this.seriesIds.add(seriesIdx);
			// Add chart html to page since this chart does not exist yet
			const row = $(`<tr class="chart" data-channel=${channelName}></tr>`);
			const $chartTitle = $(`<td class="chartTitle"><div class=title>${channelLabel}</div></td>`);
			const $chemicalInfo = $('<a class="chartButton user-guide-chem-link" title="View Chemical Info"href="https://docs.google.com/document/d/1RL5MGzxdswD37jXnv-9_Skl638ntj7_2OR87YZtcOoM/pub#h.y2qt3fnrqosf" target="_blank" data-localize="dashboard.chemical-info"></a>');
			const $dataView = $('<a class="chartButton user-guide-chem-link" title="View Data on ESDR" data-localize="dashboard.download"></a>');
			$dataView.click((event) => {
				const range = this.plotManager.getDateAxis().getRange();
				const cursor = this.plotManager.getDateAxis().getCursorPosition();
				const esdrLink = this.feedManager.makeESDRLink(range.min, range.max, cursor);
				const win = window.open(esdrLink, '_blank');
				if (win) {
					win.focus();
				} else {
					alert('Please allow popups for this website in order to go to detail view on ESDR');
				}
			});

			const $buttonContainer = $('<div class="chartButtonContainer"></div>')
			$buttonContainer.append($chemicalInfo);
			$buttonContainer.append($dataView);
			$chartTitle.append($buttonContainer);
			row.append($chartTitle);
			row.append('<td id="' + plotContainerId + '" class="chartContent"></td>');
			row.append('<td id="' + yAxisId + '" class="chartAxis"></td>');
			$('#grapher').append(row);

			this.addGraphOverlays(seriesIdx, channelLabel);

			this.plotManager.addDataSeriesPlot(plotId, datasource, plotContainerId, yAxisId);
			this.adjustGraphOverlays(seriesIdx, channelLabel);
			this.plotManager.getYAxis(yAxisId).addAxisChangeListener(() => {
				this.adjustGraphOverlays(seriesIdx, channelLabel);
			});
			window.setTimeout(() => $(window).trigger('resize'), 50);
		}
		this.plotManager.getPlot(plotId).addDataPointListener((val) => {
			const valueHoverElement = $('#valueHover' + seriesIdx);
			if (val === null) {
				valueHoverElement
					.empty()
					.hide();
			} else {
				valueHoverElement
					.text(`${val.valueString.substr(0,10)} at ${val.dateString}`)
					.show();
			}
		});
		const colorLine = this.feedManager.monitorTypeColor(feed.type);
		this.plotManager.getPlot(plotId).setStyle({
			'styles': [
				{
					'type' : 'line',
					'lineWidth' : 4,
					'show' : true,
					'color' : colorLine
				},
				{
					'type' : 'circle',
					'radius' : 2,
					'lineWidth' : 2,
					'show' : true,
					'color' : colorLine,
					'fill' : true
				}
			],
		});
		const plotContainer = this.plotManager.getPlotContainer(plotContainerId);
		this.setMinRangeToHealthLimit(plotContainer, channelLabel);
		plotContainer.setAutoScaleEnabled(true, true);
	}

	getChannelLabel(seriesIdx) {
	  return $(`#${seriesIdx}_plot_container`)
	  			.parent()
	  			.find('.chartTitle')
	  			.find('.title')
	  			.text();
	}

	addGraphOverlays(seriesIdx) {
	  const channelLabel = this.getChannelLabel(seriesIdx);
	  if (this.feedManager.healthLimit(chemicalLabel)) {
	    $(`#${seriesIdx}_plot_container`)
	    	.append(
	    		`<div id="healthDangerBox${seriesIdx} class='healthDangerBox'></div>`
	    	);
	  }
	  if (this.feedManager.communityDetectionLimit(channelLabel)) {
	    $(`#${seriesIdx}_plot_container`)
	    	.append(
	    		`<div id="greyAreaBox${seriesIdx} class='greyAreaBox'></div>`
	    	);
	  }
	  if (this.feedManager.refineryDetectionLimit(channelLabel)) {
	    $(`#${seriesIdx}_plot_container`)
	    	.append(
	    		`<div id="refineryDetectionLimit${seriesIdx} class='refineryDetectionLimit'></div>`
	    	);
	  }
	  $(`#${seriesIdx}_plot_container`)
	  	.append(
	  		`<div id="valueHover${seriesIdx} class='valueHover'></div>`
	  	);
	}

	adjustGraphOverlays(seriesIdx) {
	  const channelLabel = getChannelLabel(seriesIdx);
	  const axis = this.plotManager.getYAxis(seriesIdx + "_yaxis");
	  const chartHeight = $('.chart').height();
	  const range = axis.getRange();

	  const level = this.feedManager.healthLimit(chemicalLabel);
	  const overlayHeight = (range.max - level) / (range.max - range.min) * chartHeight;
	  $('#healthDangerBox' + seriesIdx)
	      .height(overlayHeight)
	      .css("max-height", chartHeight);

	  level = this.feedManager.communityDetectionLimit(channelLabel);
	  overlayHeight = (range.max - level) / (range.max - range.min) * chartHeight;
	  let borderVisible;
	  $('#greyAreaBox' + seriesIdx)
	      .height(overlayHeight)
	      .css({"max-height": chartHeight});

	  level = this.feedManager.refineryDetectionLimit(channelLabel);
	  overlayHeight = (range.max - level) / (range.max - range.min) * chartHeight;
	  overlayHeight > 2 ? borderVisible = "2px" : borderVisible = "0px";
	  $('#refineryDetectionLimit' + seriesIdx)
	      .height(overlayHeight)
	      .css({"max-height": chartHeight, "border-bottom-width": borderVisible});
	}

	setMinRangeToHealthLimit(plotContainer, channelLabel) {
	  const healthLimit = this.feedManager.healthLimit(chemicalLabel);
	  const pad = healthLimit * 0.1;
	  plotContainer.getYAxis().constrainMinRangeTo(-pad, healthLimit + pad);
	  plotContainer.getYAxis().setRange(-pad, healthLimit + pad);
	}

	refreshGrapher(){
	  const min_time = this.plotManager.getDateAxis().getRange().min;
	  const max_time = this.plotManager.getDateAxis().getRange().max;
	  this.plotManager.getDateAxis().setRange(min_time - .001, max_time);
	}

	zoomGrapher(scale) {
	  const min_time = this.plotManager.getDateAxis().getRange().min;
	  const max_time = this.plotManager.getDateAxis().getRange().max;
	  const mean_time = (max_time+min_time)/2;
	  const range_half_scaled = scale*(max_time-min_time)/2;
	  this.plotManager
	  	  	.getDateAxis()
	  	  	.setRange(
	  	  		mean_time - range_half_scaled,
	  	  		mean_time + range_half_scaled);
	}

	grapherZoomToDay() {
	  const max_time = Date.now()/1000;
	  const dayLength = 82918;
	  this.plotManager.getDateAxis().setRange(max_time - dayLength, max_time);
	}

	grapherZoomToWeek() {
	  const max_time = Date.now()/1000;
	  const weekLength = 590707;
	  this.plotManager.getDateAxis().setRange(max_time - weekLength, max_time);
	}

	grapherZoomToMonth() {
	  const max_time = Date.now()/1000;
	  const length = 2487540;
	  this.plotManager.getDateAxis().setRange(max_time - length, max_time);
	}

	cursorInBound(){
	  const dateAxis = this.plotManager.getDateAxis();
	  const dateProperties = dateAxis.getRange();
	  dateProperties.cursorPosition = dateAxis.getCursorPosition();
	  if (dateProperties.cursorPosition < dateProperties.min || 
	  	  !dateProperties.cursorPosition) {
	      this.plotManager.getDateAxis().setCursorPosition(dateProperties.min);
	  } else if(dateProperties.cursorPosition > dateProperties.max) {
	      this.plotManager.getDateAxis().setCursorPosition(dateProperties.max);
	  }
	}

	setSizes() {
		if ($('.chart').length && !$('.no-feeds').length) {
			$('#map_parent').css('height', '45%');
			const chartsAreaHeight = Math.floor(.3 * window.innerHeight);
			const height = clamp(
				Math.floor(chartsAreaHeight/$('.chart').length),
				100,
				250
			);
			$('.chart').height(height);
			$('.chartContent').height(height - 1);
			$('.chartTitle').height(height - 23);
			$('.chartAxis').height(height - 1);
			this.plotManager.forEachPlotContainer((pc) => {
				if(pc.getElementId()[0] != "0") {
					pc.setHeight(height);
				}
			});
			for (let i = 1; i < series.length; i++) {
				this.adjustGraphOverlays(i);
			}
		} else {
			console.log('no charts');
			const totalHeight = $('#map_parent').parent().height();
			const siblingHeights = 
				$('#loc-nav').height() + 
				$('#grapher_toolbar').height() + 
				$('#grapher_parent').height();
			const buffer = 20;
			$('#map_parent').height(totalHeight - siblingHeights - buffer);
		}
	}

	setGraphTimeRange(date) {
	  const axis = this.plotManager.getDateAxis();
	  if (!axis) return;
	  const dayStartString = `${date} 00:00:00`;
	  const dayEndString = `${date} 23:59:59`;
	  const dayStart = (new Date((dayStartString).replace(/-/g,'/')).getTime()) / 1000;
	  const dayEnd = (new Date((dayEndString).replace(/-/g,'/')).getTime()) / 1000;
	  axis.setRange(dayStart, dayEnd);
	  return dayStart;
	}

	toggleYAxisAutoScaling() {
	  this.plotManager.forEachPlotContainer((pc) => {
	    pc.setAutoScaleEnabled(!isAutoScaleOn, false);
	    if(!isAutoScaleOn) {
	      const channelLabel = getChannelLabel(pc.getElementId()[0]);
	      this.setMinRangeToHealthLimit(pc, channelLabel);
	    }
	    else {
	      pc.getYAxis().clearMinRangeConstraints();
	    }
	  });
	}
}