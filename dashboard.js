"use strict";

jQuery.support.cors = true;

class Dashboard {
  constructor() {
    this.currentDate = (new Date()).toISOString().substring(0,10);
    this.area = 'bay-area';
    this.plotManager = null;
    this.feedManager = null;
    this.chartManager = null;
    this.$localePicker = null;
    this.initialize();
  }

  initialize() {
    return new Promise((resolve) => {
      window.grapherLoad = resolve;
    }).then(() => {
      const {maxTimeSecs, minTimeSecs} = this.getHashParams();
      this.plotManager = new org.bodytrack.grapher.PlotManager(
        'dateAxis',
        minTimeSecs,
        maxTimeSecs
      );
      this.feedManager = new FeedManager();
      this.chartManager = new ChartManager(this.plotManager, this.feedManager);
      var nextYear = new Date(`January 1, ${new Date().getFullYear() + 1}`)
                      .getTime() / 1000;
      this.plotManager.getDateAxis().constrainRangeTo(1262304000, nextYear);
      this.plotManager.setWillAutoResizeWidth(true, function() {
        return $('#grapher').width() - 34 - 136 - 26;
      });
      window.onhashchange = this.processHash;
      this.processHash();

      this.loadCalendar(this.currentDate);
      $(window).resize(() => {
        const {loc} = this.getHashParams();
        loc && this.setSizes();
      });

      // Zoom buttons
      $("#zoom-grapher-in").on("click", (event) => {
        if(!event.detail || event.detail==1){
          this.chartManager.zoomGrapher(0.7);
        }
      });
      $("#zoom-grapher-out").on("click", (event) => {
        if(!event.detail || event.detail==1){
          this.chartManager.zoomGrapher(1.3);
        }
      });
      $("#grapher-zoom-day").on("click", (event) => {
        if(!event.detail || event.detail==1){
          this.chartManager.grapherZoomToDay();
        }
      });
      $("#grapher-zoom-week").on("click", (event) => {
        if(!event.detail || event.detail==1){
          this.chartManager.grapherZoomToWeek();
        }
      });
      $("#grapher-zoom-month").on("click", (event) => {
        if(!event.detail || event.detail==1){
          this.chartManager.grapherZoomToMonth();
        }
      });
      $('[data-toggle="popover"]').popover();
      $("#dialog").dialog({ autoOpen: false , width: '60%'});

      //Initialize playback things
      this.plotManager.getDateAxis().addAxisChangeListener(this.dateAxisListener);
      $("#play").unbind().on("click", (event) => {
        if(!event.detail || event.detail === 1) {
          this.playCallback();
        }
      });
      $("#share").unbind().on("click", (event) => {
        if(!event.detail || event.detail === 1) {
          this.generateShareLink();
        }
      });
      $("#slider").slider();
      $('#calendar')
        .unbind()
        .on('click', (event) => {
          if(!event.detail || event.detail === 1){
            this.toggleCalendar();
          }
        });
      $('#calendarMenu').hide();

      window.addEventListener('keydown', (e) => {
        if(e.keyCode == 32 && e.target == document.body) {
          this.playCallback();
        }
      });

      const initTime = this.plotManager.getDateAxis().getRange().min;
      this.plotManager.getDateAxis().setCursorPosition(initTime);
      this.plotManager.getDateAxis().getWrappedAxis().isTwelveHour = true
      /* map.js */repaintCanvasLayer(initTime);
      return /* smells.js */initSmells();
    });
  }

  changeLocale(targetArea, locale) {
    if (targetArea) {
      this.area = targetArea;
      /* map.js */setMapCenter(this.area);
    }
    if (locale) {
      this.feedManager.locale = locale;
    } else {
      switch(targetArea) {
        case 'richmond':
          this.feedManager.locale = 'Atchison Village';
          break;
        case 'crockett-rodeo':
          this.feedManager.locale = 'North Rodeo';
          break;
        case 'benicia':
          this.feedManager.locale = 'Benicia (South)';
          break;
        case 'vallejo':
          this.feedManager.locale = 'Vallejo';
          break;
        case 'martinez':
          this.feedManager.locale = 'Martinez';
          break;
        default:
          this.feedManager.locale = '';
          break;
      }
    }
    this.updateLocalePicker();
  }

  refreshChannelPage() {
    this.plotManager.removeAllPlotContainers();
    
  }

  play() {
    this.chartManager.cursorInBound();
    const dateAxis = this.plotManager.getDateAxis();
    const currentTime = Number(dateAxis.getCursorPosition());
    const range = dateAxis.getRange().max - dateAxis.getRange().min;
    const delta = Math.abs($('#slider').slider('value') - 100) * 7 + 50;
    this.plotManager.getDateAxis()
                    .setCursorPosition(currentTime + (range / delta));
    this.playInterval = window.requestAnimation(() => this.play());
  }

  pause() {
    window.cancelAnimationFrame(this.playInterval);
  }

  playCallback() {
    this.chartManager.cursorInBound();
    var icon = $('#play i:nth-child(2)');
    icon.toggleClass('fa-play');
    icon.toggleClass('fa-pause');
    icon.hasClass('fa-pause') ? 
      $('#play').addClass('pause') : 
      $('#play').removeClass('pause');
    icon.hasClass("fa-pause") ? this.play() : this.pause();
  }

  generateShareLink() {
    const range = this.plotManager.getDateAxis().getRange();
    const link = `https://airwatchbayarea.org#loc=${this.area}&monitor=${this.feedManager.locale ? 
      this.feedManager.locale.replace(/ /g,'-') : ''}&time=${range.min},${range.max}`;
    $('#shareLink').text(link).attr('href', link);
    $('#dialog').dialog('open');
  }

  toggleCalendar(){
    $('#calendarMenu').animate({
      width: 'toggle',
      opacity:'toggle'
    }, 800, 'easeInOutBack');
  }

  loadCalendar(startingDate) {
    this.currentDate = startingDate;
    const dateArray = startingDate.split('-');
    const selectDay = (dateText, dateElem) => {
      const date = $.datepicker.formatDate('yy-mm-dd', new Date(dateText));
      $('.gwt-PopupPanel').remove();
      this.currentDate = date;
      const dayStart = this.chartManager.setGraphTimeRange(date);
      this.plotManager.getDateAxis().setCursorPosition(dayStart);
      /* map.js */repaintCanvasLayer(dayStart);
    }
    $('#datepicker').datepicker({
      defaultDate : new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
      minDate : new Date(2015, 5),
      onSelect : selectDay,
      beforeShowDay : () => [true, 'date-highlight']
    });
    $('#datepicker').datepicker('show');
  }

  setSizes() {
    this.chartManager.setSizes();
    google.maps.event.trigger(map, 'resize');
  }

  dateAxisListener = (event) => {
    let timeInSecs = event.cursorPosition;
    const dateAxis = this.plotManager.getDateAxis();
    const dateAxisRange = dateAxis.getRange();
    drawSmellReports(dateAxis.getRange());
    if (timeInSecs > dateAxisRange.max) {
      timeInSecs = dateAxisRange.min;
      dateAxis.setCursorPosition(dateAxisRange.min);
    }
    const d = new Date(timeInSecs * 1000);
    const pad = (num) => {
      const norm = Math.abs(Math.floor(num));
      return (norm < 10 ? '0' : '') + norm;
    }
    const dateString =
      `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
    if (dateString != this.currentDate) {
      $('#datepicker').datepicker('setDate', dateString);
    }
    /* map.js */repaintCanvasLayer(timeInSecs);
  };

  getHashParams() {
    let maxTimeSecs, minTimeSecs, monitor;
    const hash = window.location.hash.slice(1).split("&");
    if (hash[1]) {
      var timeRange = hash[2].slice(5).split(",");
      minTimeSecs = timeRange[0];
      maxTimeSecs = timeRange[1];
      monitor = hash[1].slice(8).replace(/-/g," ");
    }
    else {
      maxTimeSecs = Date.now() / 1000;
      minTimeSecs = maxTimeSecs - 8 * 60 * 60;
    }
    var loc = hash[0].split("loc=")[1];
    return {hash, maxTimeSecs, minTimeSecs, monitor, loc};
  }

  processHash = () => {
    const {hash, maxTimeSecs, minTimeSecs, monitor, loc} = this.getHashParams();
    $('.active a').removeClass('custom-nav-link-active');
    $('.active a').addClass('custom-nav-link');
    $('.active').removeClass('active');
    if (loc) {
      this.plotManager.getDateAxis().setCursorPosition(Date.now() / 1000);
      $('#view-air-quality-tab').addClass('active');
      $('#view-air-quality-tab>a').addClass('custom-nav-link-active');
      $(`#${loc}-tab`).addClass('active');
      $(`#${loc}-tab a`).addClass('custom-nav-link-active');
    } else {
      $(`#${hash[0]}-tab`).addClass('active');
      $(`#${hash[0]}-tab a`).addClass('custom-nav-link-active');
    }
    $('[id*="-page"],[class*="-page"]').hide();
    /* user-reports.js */ refreshPosts();
    if (loc) {
      $('.dashboard-page').show()
      this.changeLocale(loc, monitor);
    } else if ($(`#${hash[0]}-page`).length){
      $(`#${hash[0]}-page`).show();
    } else {
      window.location.hash = "home";
    }
  }

  //generates the locale picker based on the current location.
  generateLocalePicker() {
    const $picker = $('<label id="locale-picker"><p>Locale</p><select></select></label>');
    this.$localePicker = $picker.find('select');
    this.$localePicker.on('change', (e) => this.changeLocale(this.area, e.target.value));
    window.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push($picker[0]);
  }

  updateLocalePicker() {
    if (this.$localePicker) {
      const localeList = this.area === 'bay-area' ? 
        Object.values(this.feedManager.locales).flat() : (this.feedManager.locales[this.area] || []);
      this.$localePicker.html(
        localeList
          .map((locale) => `<option value="${locale}">${locale}</option>`)
          .join('')
      );
      this.$localePicker[0].value = this.feedManager.locale;
    }
  }
}

window.requestAnimation =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback) {
    return window.setTimeout(callback, 10);
  };

window.dashboard = new Dashboard();