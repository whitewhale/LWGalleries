/*global gapi:true, jQuery:true */

/*
 * Polyfills
 */
if (!Date.prototype.toISOString) {
  (function() {
    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }
    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };
  }());
}

//
// requirements:
//
//
(function($, _) {
  var LW            = window.livewhale || {},
      $body         = $('body'),
      $wrapper      = $('#lw_cal'),
      protocol      = (LW.logged_in && LW.has_ssl) ? 'https:' : window.location.protocol,
      page_url      = protocol + '//' + window.location.host + livewhale.page,
      $tmpl_wrapper;

  if (!LW.lib) LW.lib = {};

  // provides access objects in calendar.js from outside
  LW.lwCalendar = {};

  // use mustache style syntax in js templates
  _.templateSettings = {
    evaluate: /\{\[(.+?)\]\}/g,
    interpolate: /\{\{(.+?)\}\}/g
  };

  var utils = {
    getWidgetSyntaxFromArgObject: function(args) {
      var xml = '<widget type="events_calendar">';
      args = args || {};

      // iterate through widget_args and build syntax
      $.each(args, function(key, value) {
        if ($.isArray(value)) {
          $.each(value, function(index, value_value) {
            xml += '<arg id="' + key + '">' + value_value + '</arg>';
          });
        } else {
          xml += '<arg id="' + key + '">' + value + '</arg>';
        }
      });
      xml += '</widget>';
      return encodeURIComponent(xml);
    }
  };

  function initCalendar(options) {

    // check pushstate config.  The option is set in livewhale.calendar for CORS calendars
    var use_pushstate = LW.lwc_use_pushstate || false;

    // use pushstate if enabled in config and browser supports it
    var use_history_api = (window.history && window.history.pushState && use_pushstate) ? true : false;

    // this adds #! to the beginning of all calendar relative urls
    var hashbang = (!use_history_api) ? '#!' : '';

    var calendar_path = window.location.pathname;

    // append SEO link
    if (use_history_api && LW.page) {
      calendar_path = LW.page ? LW.page.substring(0, LW.page.lastIndexOf('/') + 1) : '/';
    }
    $body.append('<a href="' + calendar_path + hashbang + 'view/seo' + '" style="display:none;" aria-hidden="true">All Events</a>');
    // Formats dates using PHP date format strings
    // IX adapted code from http://phpjs.org/functions/date/
    var DateFormatter = function(date_obj) {
      this._dt = date_obj;
    };

    $.extend(DateFormatter.prototype, {
      format: function(format) {
        return format.replace(this._formatChr, $.proxy(this._formatChrCb, this));
      },
      _txt_words: [
        "Sun", "Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur",
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"
      ],
      // trailing backslash -> (dropped)
      // a backslash followed by any character (including backslash) -> the character
      // empty string -> empty string
      _formatChr: /\\?(.?)/gi,
      _formatChrCb: function(t, s) {
        return this[t] ? this[t]() : s;
      },
      _pad: function(n, c) {
        n = String(n);
        while (n.length < c) {
          n = '0' + n;
        }
        return n;
      },

      // Day
      d: function() { // Day of month w/leading 0; 01..31
        return this._pad(this.j(), 2);
      },
      D: function() { // Shorthand day name; Mon...Sun
        return this.l().slice(0, 3);
      },
      j: function() { // Day of month; 1..31
        return this._dt.getDate();
      },
      l: function() { // Full day name; Monday...Sunday
        return this._txt_words[this.w()] + 'day';
      },
      N: function() { // ISO-8601 day of week; 1[Mon]..7[Sun]
        return this.w() || 7;
      },
      S: function() { // Ordinal suffix for day of month; st, nd, rd, th
        var j = this.j(),
          i = j % 10;
        if (i <= 3 && parseInt((j % 100) / 10, 10) === 1) {
          i = 0;
        }
        return ['st', 'nd', 'rd'][i - 1] || 'th';
      },
      w: function() { // Day of week; 0[Sun]..6[Sat]
        return this._dt.getDay();
      },
      z: function() { // Day of year; 0..365
        var a = new Date(this.Y(), this.n() - 1, this.j()),
          b = new Date(this.Y(), 0, 1);
        return Math.round((a - b) / 864e5);
      },

      // Week
      W: function() { // ISO-8601 week number
        var a = new Date(this.Y(), this.n() - 1, this.j() - this.N() + 3),
            b = new Date(a.getFullYear(), 0, 4);
        return this._pad(1 + Math.round((a - b) / 864e5 / 7), 2);
      },

      // Month
      F: function() { // Full month name; January...December
        return this._txt_words[6 + this.n()];
      },
      m: function() { // Month w/leading 0; 01...12
        return this._pad(this.n(), 2);
      },
      M: function() { // Shorthand month name; Jan...Dec
        return this.F().slice(0, 3);
      },
      n: function() { // Month; 1...12
        return this._dt.getMonth() + 1;
      },
      t: function() { // Days in month; 28...31
        return (new Date(this.Y(), this.n(), 0)).getDate();
      },

      // Year
      L: function() { // Is leap year?; 0 or 1
        var j = this.Y();
        return j % 4 === 0 & j % 100 !== 0 | j % 400 === 0;
      },
      o: function() { // ISO-8601 year
        var n = this.n(),
          W = this.W(),
          Y = this.Y();
        return Y + (n === 12 && W < 9 ? 1 : n === 1 && W > 9 ? -1 : 0);
      },
      Y: function() { // Full year; e.g. 1980...2010
        return this._dt.getFullYear();
      },
      y: function() { // Last two digits of year; 00...99
        return this.Y().toString().slice(-2);
      },

      // Time
      a: function() { // am or pm
        if (options.ampm_with_dots) {
          return this._dt.getHours() > 11 ? " p.m." : " a.m.";
        } else {
          return this._dt.getHours() > 11 ? "pm" : "am";
        }
      },
      A: function() { // AM or PM
        return this.a().toUpperCase();
      },
      q: function() { // non-standard a.m/p.m format option added for Simorn Fraser
        return this._dt.getHours() > 11 ? " p.m." : " a.m.";
      },
      B: function() { // Swatch Internet time; 000..999
        // not supported
        return '';
      },
      g: function() { // 12-Hours; 1..12
        return this.G() % 12 || 12;
      },
      G: function() { // 24-Hours; 0..23
        return this._dt.getHours();
      },
      h: function() { // 12-Hours w/leading 0; 01..12
        return this._pad(this.g(), 2);
      },
      H: function() { // 24-Hours w/leading 0; 00..23
        return this._pad(this.G(), 2);
      },
      i: function() { // Minutes w/leading 0; 00..59
        return this._pad(this._dt.getMinutes(), 2);
      },
      s: function() { // Seconds w/leading 0; 00..59
        return this._pad(this._dt.getSeconds(), 2);
      },
      u: function() { // Microseconds; 000000-999000
        return this._pad(this._dt.getMilliseconds() * 1000, 6);
      },

      // Timezone
      e: function() { // Timezone identifier; e.g. Atlantic/Azores, ...
        // The following works, but requires inclusion of the very large
        // timezone_abbreviations_list() function.
        /*              return that.date_default_timezone_get();
         */
        throw 'Not supported (see source code of date() for timezone on how to add support)';
      },
      I: function() { // DST observed?; 0 or 1
        // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
        // If they are not equal, then DST is observed.
        var a = new Date(this.Y(), 0),
          // Jan 1
          c = Date.UTC(this.Y(), 0),
          // Jan 1 UTC
          b = new Date(this.Y(), 6),
          // Jul 1
          d = Date.UTC(this.Y(), 6); // Jul 1 UTC
        return ((a - c) !== (b - d)) ? 1 : 0;
      },
      O: function() { // Difference to GMT in hour format; e.g. +0200
        var tzo = this._dt.getTimezoneOffset(),
          a = Math.abs(tzo);
        return (tzo > 0 ? "-" : "+") + this._pad(Math.floor(a / 60) * 100 + a % 60, 4);
      },
      P: function() { // Difference to GMT w/colon; e.g. +02:00
        var O = this.O();
        return (O.substr(0, 3) + ":" + O.substr(3, 2));
      },
      Z: function() { // Timezone offset in seconds (-43200...50400)
        return -this._dt.getTimezoneOffset() * 60;
      },

      // Full Date/Time
      c: function() { // ISO-8601 date.
        return 'Y-m-d\\TH:i:sP'.replace(this._formatChr, this._formatChrCb);
      },
      r: function() { // RFC 2822
        return 'D, d M Y H:i:s O'.replace(this._formatChr, this._formatChrCb);
      },
      U: function() { // Seconds since UNIX epoch
        return this._dt._date / 1000 | 0;
      }
    });


    var CalDate = LW.lib.LWCDate = function(timestamp, tz_offset, date_obj) {
      if (timestamp) {
        tz_offset = ($.isNumeric(tz_offset)) ? parseInt(tz_offset, 10) : 0;
        this._date = new Date((parseInt(timestamp, 10) * 1000) + (parseInt(tz_offset, 10) * 1000));
      } else if (date_obj) {
        // convert to UTC so it works with getUTC based methods
        this._date = new Date(date_obj.valueOf() - date_obj.getTimezoneOffset() * 60 * 1000);
      }
      this._formatter = new DateFormatter(this);
    };

    // static methods and properties for gettting/setting time and date formats
    CalDate.time_format = {
      us:   LW.time_format_us,
      euro: LW.time_format_euro
    };
    CalDate.date_format = {
      us:   LW.date_format_us,
      euro: LW.date_format_euro
    };
    CalDate.user_format_zone = 'us'; // default format zone
    CalDate.setUserFormatZone = function(format_zone) {
      CalDate.user_format_zone = format_zone;
    };
    CalDate.getUserFormatZone = function() {
      return CalDate.user_format_zone;
    };
    CalDate.getUserDateFormat = function() {
      return (CalDate.date_format[CalDate.user_format_zone]) ? CalDate.date_format[CalDate.user_format_zone] : 'm/d/Y';
    };
    CalDate.getUserTimeFormat = function() {
      return (CalDate.time_format[CalDate.user_format_zone]) ? CalDate.time_format[CalDate.user_format_zone] : 'g:ia';
    };

    $.extend(CalDate.prototype, {
      month_names_short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
      getFormattedDate: function(format) {
        return this._formatter.format(format);
      },
      getDateObject: function() {
        return this._date;
      },
      // uses user time format if no format zone param
      getTimeString: function(format_zone) {
        var format = (format_zone && CalDate.time_format[format_zone])
          ? CalDate.time_format[format_zone]
          : CalDate.getUserTimeFormat();

        return this._formatter.format(format);
      },
      // uses user date format if no format zone param
      getShortDateString: function(format_zone) {
        var format = (format_zone && CalDate.date_format[format_zone])
          ? CalDate.date_format[format_zone]
          : CalDate.getUserDateFormat();

        return this._formatter.format(format);
      },
      getDateTimeString: function() {
        return this.month_names_short[ this._date.getUTCMonth() ] + ' '
               + this._date.getUTCDate() + ', '
               + this.getTimeString();
      },
      isDayStart: function() {
        return (0 === this.getHours() && 0 === this.getMinutes());
      },
      // We use UTC because we've already made the
      // offset adjustment for local time
      getHours: function() {
        return this._date.getUTCHours();
      },
      getMinutes: function() {
        return this._date.getUTCMinutes();
      },
      getSeconds: function() {
        return this._date.getUTCSeconds();
      },
      getMilliseconds: function() {
        return this._date.getUTCMilliseconds();
      },
      getFullYear: function() {
        return this._date.getUTCFullYear();
      },
      getMonth: function() {
        return this._date.getUTCMonth();
      },
      getDate: function() {
        return this._date.getUTCDate();
      },
      getDay: function() {
        return this._date.getUTCDay();
      },
      getTime: function() {
        return this._date.getTime();
      },
      setTimeToZero: function() {
        this._date.setUTCHours(0);
        this._date.setUTCMinutes(0);
        this._date.setUTCSeconds(0);
      },
      setHours: function(h, m, s, ms) {
        this._date.setHours(h, m, s, ms);
      },
      setDate: function(date) {
        this._date.setUTCDate(date);
      }
    });

    var viewHelpers = {
      makePhoneLinks: function(str) {
        if (!str || typeof str !== 'string') {
          return str;
        }
        // replace phone numbers with phone links
        var regex = /\b([(]{0,1}[0-9]{3}[)]{0,1}[-\s.]{0,1}[0-9]{3}[-\s.]{0,1}[0-9]{4})\b(?!([^<]*>|<\/a>))/g;
        return str.replace(regex, function(match, p1) {
          return '<a href="tel:' + p1.replace(/[^\d]/g, '') + '">' + p1 + '</a>';
        });
      },
      makeMailtoLinks: function(str) {
        if (!str || typeof str !== 'string') {
          return str;
        }
        // replace phone numbers with phone links, this won't replace email addresses already wrapped in mailto links
        return str.replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/ig, function(match, email) {
          return '<a href="mailto:' + email + '">' + email + '</a>';
        });
      },
      setImageDimensions: function(image, width, height) {
        // do nothing if neither width nor height set
        if (!width && !height) return ;

        var width_replace = (width) ? '/width/' + width : '';
        var height_replace = (height) ? '/height/' + height : '';
        image = image.replace(/\/width\/[\d]+/, width_replace);
        image = image.replace(/\/height\/[\d]+/, height_replace);

        // remove crop and src_region
        image = image.replace(/\/crop\/[\d]+/, '');
        image = image.replace(/\/src_region\/[\d,]+/, '');
        return image;
      },
      formatDate: function(date, format) {
        return (format && date)
          ? new CalDate(null, null, date).getFormattedDate(format)
          : '';
      },
      formatTimestamp: function(ts, tz_offset, format) {
        var ts_string = '' + ts;
        var offset_string = '' + tz_offset;

        return (format && ts_string.match(/^[\d]+$/) && offset_string.match(/^-?[\d]*$/))
          ? new CalDate(ts, tz_offset).getFormattedDate(format)
          : '';
      }
    };

    // preserve backward compatability - do not remove
    viewHelpers.formattedDate = viewHelpers.formatTimestamp;

    //
    // controller class maintains application state, and all user initated state
    // changes are made by interacting with the controller.  View changes are made
    // by calling the controllers load() method, which loads view data, and triggers
    // events that views listen for
    //
    // Events:
    //     calBeforeInit.lwcal   - fires after exported symbols exposed and before controller initialization
    //     calInit.lwcal         - fires after first view data loads
    //     calBeforeChange.lwcal - fires before loading new view data
    //     calChange.lwcal       - fires after loading new view data
    //     calLoad.lwcal         - fires after each view finishes loading
    //
    var hash_controller = {
      initUrlChangeHandler: function() {
        var that = this;

        // bind handler to load on hashchange event - provided by hashchange plugin
        $(window).hashchange(function() {
          var hash = window.location.hash;
          hash = hash.replace(/^#!?/, ''); // disregard bang

          // do nothing if the hash is the same as current state of this.vars, which happens when
          // calling setHash() to set hash to state of this.vars.  Also do nothing if no view
          // and no date are present.  This prevents conflicts other code that may use hashes
          if (hash && (hash === that.getHash()
              || (hash.length > 2 && hash.indexOf('view/') === -1 && hash.indexOf('date/') === -1))) {
            return;
          }
          that.parseHash();
          that.load($.noop, true);
        });

        if (!this.hashHasBang()) {
          this.addBangToHash();
        }
        // parse hash and load calendar
        this.parseHash();
        this.load(function() {
          $body.trigger('calInit.lwcal', [that]);
        }, true);
      },
      hashHasBang: function() {
        return (1 === window.location.hash.indexOf('!')) ? true : false;
      },
      addBangToHash: function() {
        var hash = window.location.hash;

        if (hash.length > 1) {
          window.location.hash = '#!' + hash.substr(1);
        }
      },
      updateUrl: function() {
        var hash = this.getHash();
        if (hash) {
          window.location.hash = '!' + hash;
        }
      },
      buildUrlArgString: function() {
        var vars = [];
        var key;

        // add qstring item for each var
        for (key in this.vars) {
          // mapping to tmp necessary to encode coponents without encoding comma
          var tmp = [];
          for (var i in this.vars[key]) {
            tmp.push(encodeURIComponent(this.vars[key][i]));
          }
          vars.push(key + '/' + tmp.join('|'));
        }

        // sort but with view first
        vars = vars.sort(function(a, b) {
          if (a.match(/^view/)) {
            return -1;
          } else if (b.match(/^view/)) {
            return 1;
          } else {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          }
        });

        // return string of vars joined with slashes
        return (vars.length) ? vars.join('/') : '';
      }
    };

    var pushstate_controller = {
      initUrlChangeHandler: function() {
        var that = this;

        // popstate listener
        window.addEventListener('popstate', function(e) {
          that.parseUrl();
          that.load($.noop, use_current_url);
        });

        // assume this is an old hash based url if there is a hash and no url args
        if (window.location.hash && !this.getUrlArgString()) {
          this.convertDeprecatedHashBasedUrl();
        } else {
          this.parseUrl();

          // update the url if this is the old view/{view_name} style url
          // or if using 'event' for view name when custom value set
          var use_current_url = true;
          if (use_history_api) {
            var url = this.getUrlArgString();
            if (url.indexOf('view/') === 0) {
              use_current_url = false;
            }
            if (options.event_view_name !== 'event' && url.indexOf('event/') === 0) {
              use_current_url = false;
            }
          }

          this.load(function() {
            $body.trigger('calInit.lwcal', [that]);
          }, use_current_url);
        }
      },
      convertDeprecatedHashBasedUrl: function() {
        this.parseHash();
        var new_url = this.buildUrlArgString();
        var base_path = LW.page.substring(0, LW.page.lastIndexOf('/') + 1);
        window.location.href = base_path + new_url;
      },
      updateUrl: function() {
        var new_url = this.buildUrlArgString();
        var base_path = LW.page.substring(0, LW.page.lastIndexOf('/') + 1);

        if (new_url !== this.getUrlArgString()) {
          window.history.pushState(null, null, base_path + new_url);
        }
      },
      buildUrlArgString: function() {
        var view = this.getView();
        var url = view;

        if (view === options.event_view_name) {
          var event_id = this.getVar('event_id');
          if (event_id.length) {
            url += '/' + event_id[0];
          }
        } else {
          var vars = [];

          // add item for each var excluding view
          _.each(this.vars, function(val, key) {
            // skip view
            if (key === 'view') {
              return true;
            }
            // mapping to tmp necessary to encode coponents without encoding comma
            var tmp = [];
            _.each(val, function(value) {
              // encode
              value = encodeURIComponent(value);

              // double encode slashes to avoid apache security feature that triggers 404s when slashes in url path
              value = value.replace('%2F', '%252F');

              tmp.push(value);
            });
            vars.push(key + '/' + tmp.join('|'));
          });

          // sort vars
          vars = vars.sort(function(a, b) {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          });

          if (vars.length) {
            url += '/' + vars.join('/');
          }
        }
        return url;
      }
    };

    // extend controller with pushstate or hash-url mixins
    var controller = LW.lwCalendar.controller = _.extend({
      vars: {},
      // all get vars
      qstring: {},
      data: null,
      // view data from most recent request
      is_today: true,
      init: function() {
        var that = this;

        $body.trigger('beforeCalInit.lwcal');

        this.history = [];
        this.default_view = options.default_view || 'day';

        // maintain this property through first load - used my metadata code
        this.is_first_load = true;
        $body.on('calLoad.lwcal', function(e) {
          that.is_first_load = false;
          return true;
        });

        // convert qstring to a hash and refresh page if it exists
        // this.convertQueryStringAndRefresh();

        // handler for view menu click
        $body.on('lw.calendarViewClick', function(evt, link_href) {
          that.setVarsInRelativeUrl(link_href);

          // remove date if clicking "List All"
          if ('all' === that.getView()) {
            that.clearVar('date');
          }

          that.clearVar('more'); // remove more var when changing views
          that.load();

          return true;
        });

        this.initUrlChangeHandler();
      },
      getTimezone: function() {
        var dt, tz, stored_tz, now;

        // if tz not set get from localStorage if it's there, otherwise get from browser
        if (!this._user_tz && LW.lib.localStore.has() && localStorage.lwLocalTimezone
            && -1 !== localStorage.lwLocalTimezone.lastIndexOf('}')) {
          stored_tz = JSON.parse(localStorage.lwLocalTimezone);
          now = new Date().getTime();

          // expire after 5 days, or this is an old-style saved timezone
          if ($.isPlainObject(stored_tz) && stored_tz.timestamp && now - stored_tz.timestamp < 86400000 * 5) {
            this._user_tz = stored_tz.value;
          }
        }

        if (!this._user_tz) {
          dt = new Date().toString();

          // first regex works on majority of modern browsers, second works for IE
          tz = dt.match(/\(([^)]+)\)$/) || dt.match(/([A-Z]+) [\d]{4}$/);

          // use EST if we can't get anything from the browser
          this._user_tz = 'EST';

          if ($.isArray(tz) && tz.length > 1) {
            var tz_matches = tz[1].match(/[A-Z]/g);

            if (tz_matches) {
              this._user_tz = tz_matches.join('');
            }
          }

          var offset = dt.split(' ')[5];

          // fix bug in Win FF that causes it to return the wrong timezone abbreviation
          if ($.browser.mozilla && navigator.appVersion.indexOf("Win") !== -1) {
            if (offset === 'GMT-0700') {
              this._user_tz = 'PDT';
            }
            if (offset === 'GMT-0400') {
              this._user_tz = 'EDT';
            }
          }
        }
        return this._user_tz;
      },
      setTimezone: function(tz) {
        var stored_tz;

        this._user_tz = tz;

        // set local storage
        if (LW.lib.localStore.has()) {
          stored_tz = {
            value: tz,
            timestamp: new Date().getTime()
          };
          localStorage.lwLocalTimezone = JSON.stringify(stored_tz);
        }
      },
      // always returns an array
      getVar: function(key) {
        return ($.isArray(this.vars[key])) ? this.vars[key] : [];
      },
      getView: function() {
        // we can't set the default view using setVar() before initial
        // load when no view in hash because adding an item to the hash
        // at that point makes it impossible to use the browser's back
        // button to return to the page visited prior to landing on calendar
        // therefore we allow getView to return it when nothing set
        return (this.getVar('view').length) ? this.getVar('view')[0] : this.default_view;
      },
      setDate: function(year, month, day) {
        year = year.toString();
        month = month.toString();
        day = day.toString();

        if (month.length === 1) month = '0' + month;
        if (day.length === 1) day = '0' + day;

        this.setVar('date', year + month + day);
      },
      // trim and remove html
      sanitizeVar: function(value) {
        // remove double quotes
        value = value.replace(/"/g, '');

        // strip html
        value = $('<p>' + value + '</p>').text().replace(/>/g, '&gt;').replace(/</g, '&lt;');

        return $.trim(value);
      },
      // value can be a string (used when setting a single value) or an array
      setVar: function(key, value) {
        if (!key || !value) return;

        // string to array
        if (!$.isArray(value)) {
          value = [ value ];
        }
        this.vars[key] = _.map(value, this.sanitizeVar);
      },
      // appends to array at key, creates new array if one doesn't exist
      appendVar: function(key, value) {
        if (!$.isArray(this.vars[key])) this.vars[key] = [];
        this.vars[key].push(this.sanitizeVar(value));
      },
      // remove a particular value from key's array
      removeVar: function(key, value) {
        if ($.isArray(this.vars[key])) {
          var val_index = $.inArray($.trim(value), this.vars[key]);

          // remove value if in array
          if (-1 !== val_index) {
            this.vars[key].splice(val_index, 1);

            // also remove key if array now empty
            if (!this.vars[key].length) {
              this.clearVar(key);
            }
          }
        }
      },
      // remove variable entirely
      clearVar: function(key) {
        delete this.vars[key];

        // we need to make sure the view is set in the url here because the url
        // won't update if removing this key wipes away what's left of the hash
        if (!this.vars.view) {
          this.setVar('view', this.default_view);
        }
      },
      // remove variable entirely
      clearVars: function(remove_sticky_vars) {
        var that = this;
        var sticky_vars = {
          language: true
        };
        _.each(this.vars, function(val, key) {
          if (remove_sticky_vars || !sticky_vars[key]) {
            delete that.vars[key];
          }
        });
      },
      getValue: function(key) {
        return ($.isArray(this.vars[key])) ? this.vars[key] : false;
      },
      // builds query string from this.vars, performs get, and filters
      // response for header and body portions that should be replaced
      load: function(callback, use_current_url, exclude_from_history) {
        var that = this,
            view = this.getView();

        $body.trigger('calBeforeChange.lwcal', [that, view]);

        if (!exclude_from_history) {
          this.history.push(_.clone(this.vars));
        }

        // update url with current controller state - this allows us to modify state
        // then call this.load() to update the calendar
        if (!use_current_url) {
          this.updateUrl();
        }

        // code to execute when both ajax and non-ajax views load
        function onLoad(data) {
          if (!data) data = {};

          // Views listen for this event
          $body.trigger('calChange.lwcal', [that, view, data]);

          // execute callback
          if ($.isFunction(callback)) callback.apply(that);

          that.registerGoogleAnalyticsPageView();
        }

        if (view === 'feed_builder') {
          onLoad();
        } else {
          // get data, set title and hash, and trigger change and load events
          var ajax_opts = {
            url: this.getAjaxUrl(),
            dataType: 'json',
            success: function(data) {
              // set user's tz with full string from server if current
              // value is abbreviation from date object's toString
              if (that.getTimezone().length < 5 && data.user_tz) {
                that.setTimezone(data.user_tz);
              }

              // set user's timezone format zone - "us" or "euro"
              // this determines which time and date formats the calendar uses
              if (data.user_format && data.user_format !== CalDate.getUserFormatZone()) {
                CalDate.setUserFormatZone(data.user_format);
              }

              onLoad(data);
            }
          };

          // add withCredentials if this is a cors request and the Access-Control-Allow-Credentials
          // header has been configured for the domain
          if (options.with_credentials) {
            $.extend(ajax_opts, { xhrFields: { withCredentials: true } });
          }

          $.ajax(ajax_opts);
        }
      },
      // track page view if Google Analytics
      registerGoogleAnalyticsPageView: function() {
        var tracker_command = 'send',
            pageview, trackers;

        // return right away if no google analytics or custom tracking present
        if (!(window._gaq && window._gaq.push) && !(_.isObject(window.ga) && window.ga.getByName) && !(typeof LW.custom_tracking === 'function')) return;

        // register hit to event details page if event view, otherwise register calendar view
        pageview = (options.event_view_name === this.getView())
          ? LW.liveurl_dir + '/events/' + this.getVar('event_id')[0]
          : window.location.pathname + window.location.hash;

        // if a custom tracking function exists, use that instead
        if (typeof LW.custom_tracking === 'function') {
          LW.custom_tracking(pageview);
          return;
        }

        // if old GA
        if (window._gaq) {
          window._gaq.push(['_trackPageview', pageview]);
        }
        // if GA Universal
        if (window.ga && window.ga.getAll) {
          // use the first tracker
          trackers = window.ga.getAll();
          if (trackers.length && trackers[0].get('name')) {
            tracker_command = trackers[0].get('name') + '.send';
          }
          window.ga(tracker_command, 'pageview', pageview);
        }
      },
      // parse a link to an event detail page, and
      // load the event in the calendar
      loadEventDetailHref: function(href) {
        var event_id = href.substr(href.lastIndexOf('/') + 1).match(/^\d+/);

        if (!event_id) return false;

        this.clearVars();
        this.setVar('event_id', event_id[0]);
        this.setVar('view', 'event');
        this.load();

        return true;
      },
      // returns hash built from internal state - this.vars
      getHash: function() {
        return this.buildUrlArgString();
      },
      getUrlArgString: function() {
        var path = window.location.pathname,
            base_path = LW.page.substring(0, LW.page.lastIndexOf('/') + 1);

        // if the path isn't the current page and it starts with base_path then return path minus base_path
        return (path !== LW.page && 0 === path.indexOf(base_path))
          ? path.substr(base_path.length)
          : '';
      },
      parseUrl: function() {
        var that = this;
        var path = this.getUrlArgString();

        // remove any trailing slash from path
        path = path.replace(/\/$/, '');

        // clear previous state
        that.clearVars();

        if (!path) {
          return;
        }

        // set view if first piece of url is valid view
        var pieces = path.split('/');
        var view = pieces[0].trim();
        var is_event = false;

        // set view if the first url segment is a valid view
        if (_.includes(options.valid_views, view)) {
          that.setVar('view', (view === options.event_view_name) ? 'event' : view);
          pieces.shift();

          // set event ID if this is an event
          if (view === options.event_view_name) {
            is_event = true;
            if (pieces.length && pieces[0].match(/^\d+.*/)) {
              that.setVar('event_id', pieces[0]);
            }
          }
        }

        // set controller vars with url key/val pairs if this isn't an event and we have an
        // even number of url segments
        if (!is_event && pieces.length && pieces.length % 2 === 0) {
          _.each(this.parseUrlArgString(pieces.join('/')), function(val, key) {
            that.setVar(key, val);
          });
        }
      },
      // parses hash and saves result in this.vars
      parseHash: function() {
        var that = this,
            hash;

        // reset vars
        this.vars = {};

        // unusual syntax necessary to account for FF bug
        hash = window.location.href.split("#")[1] || "";
        hash = hash.replace(/^!/, ''); // disregard bang

        if (!hash) return;

        _.each(this.parseUrlArgString(hash), function(val, key) {
          that.setVar(key, val);
        });
        return;
      },
      parseUrlArgString: function(hash) {
        var pairs = (typeof hash === 'string') ? hash.split('/') : [],
            result = {},
            val;

        // append value for each item set for each var
        for (var i = 0; i < pairs.length; i += 2) {
          // decode and convert html brackets
          val = decodeURIComponent(pairs[i + 1]).replace(/</g, '&lt;').replace(/>/g, '&gt;');

          // decode slashes, which ware double encoded to avoid apache features that triggers 404 when they're present
          val = val.replace('%2F', '/');

          result[ pairs[i] ] = val.split('|');
        }
        return result;
      },
      // we use this to set the vars contained in a relative url string
      // by not setting clear_existing_vars we can set vars without clearing ones that are
      // already set.  the primary use-case are links that contain values that should
      // change the values specified in them without clearing the rest of the calendar's state
      setVarsInRelativeUrl: function(url, clear_existing_vars) {
        // do nothing if url is falsey
        if (!url) return;

        // if '#' char, get href portion of string
        if (-1 !== url.indexOf('#')) {
          url = url.substring( url.indexOf('#') + 1 );
          url = url.replace(/^!/, ''); // disregard bang
        }
        var data = controller.parseUrlArgString(url);

        if (clear_existing_vars) {
          controller.clearVars();
        }
        _.each(data, function(val, key) {
          controller.setVar(key, val);
        });
      },
      setVarsWithQueryString: function(qstring) {
        var qs = this.parseQueryString(qstring);
        for (var key in qs) {
          this.setVar(key, decodeURIComponent(qs[key]).split('|'));
        }
      },
      parseQueryString: function(url) {
        var qstring = url.substr(url.lastIndexOf('?') + 1),
          // qstring is everything after ?
          vars = qstring.split('&'),
          qs_obj = {};

        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split("=");
          qs_obj[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return qs_obj;
      },
      // refresh with hash instead of qstring
      convertQueryStringAndRefresh: function() {
        if (LW.is_remote || !window.location.search) return;
        this.setVarsWithQueryString(window.location.search);
        window.location = page_url + '#!' + this.getHash();
      },
      getAjaxQueryString: function() {
        var qstring_vars = [],
              qstring = '';

          // add qstring item for each var
          for (var key in this.vars) {
            qstring_vars.push(key + '=' + encodeURIComponent(this.vars[key].join('|')));
          }

          // join vars
          if (qstring_vars.length) {
              qstring = '&' + qstring_vars.join('&');
          }

          // add view if it's not in vars
          if (!_.includes(this.vars, 'view')) {
              qstring += '&view=' + this.getView();
          }

          qstring += '&user_tz=' + encodeURIComponent(this.getTimezone());
          qstring += '&syntax=' + this.getWidgetSyntax();

          return qstring;
      },
      getValidYmd: function(ymd) {
        var day, days;

        // if ymd not 8 digits, return todays date.  Othewise check whether the day
        // is within the month's range, and return the first day of month if not
        if (!ymd.match(/^\d{8}$/)) {
          return viewBase.getYmdFromDate(new Date());
        } else {
          days = new Date(parseInt(ymd.substring(0, 4), 10), parseInt(ymd.substring(4, 6), 10), 0).getDate();
          day  = parseInt(ymd.substring(6, 8), 10);
          return (day >= 1 && day <= days) ? ymd : ymd.substring(0, 6) + '01';
        }
      },
      getViewTemplateVariables: function() {
        return calView.getTemplateVariables(this.getView());
      },
      getEventTemplateVariables: function() {
        return calView.getEventTemplateVariables(this.getView());
      },
      getAjaxUrl: function(extra_vars) {
        var vars = (extra_vars) ? _.extend(this.vars, extra_vars) : this.vars;
        var that = this;
        var url;

        if (LW.remote_host) {
          url = LW.remote_host + LW.liveurl_dir;
        } else {
          url = LW.liveurl_dir;
        }
        url += '/calendar/view/' + this.getView();

        // add items in this.vars to url as key/value pairs
        _.each(vars, function(vals, key) {
          if ('view' === key || 'language' === key) {
            return true;
          }
          var val;
          if ('date' === key) {
            val = that.getValidYmd(vals[0]);
          }
          else if ('event_id' === key) {
            val = vals[0].replace(/^(\d+)(_draft)*.*/, '$1$2');
            //val = vals[0].replace(/^(\d+).*/, '$1');
          } else {
            val = encodeURIComponent(vals.join('|'));

            // double encode slashes to avoid apache security feature that returns 404 when they're present
            val = val.replace('%2F', '%252F');
          }
          url += '/' + key + '/' + val;
        });
        url += '?user_tz=' + encodeURIComponent(this.getTimezone());

        // add language to query string
        if (this.getVar('language').length) {
          url += '&language=' + encodeURIComponent(this.getVar('language')[0]);
        }

        var event_template_vars = this.getEventTemplateVariables(); // add template vars to url
        url += '&template_vars=' + event_template_vars.join(',');

        // add 'show' GET var to include separate single and repearting events, if single_events
        // or repeating_events variables exist in template,
        var view_template_vars = this.getViewTemplateVariables();
        if (view_template_vars.length) {
          var show = [];
          if (-1 !== $.inArray('single_events', view_template_vars)) {
            show.push('single_events');
          }
          if (-1 !== $.inArray('repeating_events', view_template_vars)) {
            show.push('repeating_events');
          }
          if (show.length) {
            url += '&show=' + encodeURIComponent(show.join(','));
          }
        }

        var syntax = this.getWidgetSyntax();

        // remove group args from syntax if options.search_all_groups and search string exists
        if (options.search_all_groups && this.getVar('search').length) {
          syntax = decodeURIComponent(syntax);
          syntax = syntax.replace(/<arg id="group">[^<]+<\/arg>/g, '');
          syntax = encodeURIComponent(syntax);
        }

        // add widget to request
        url += '&syntax=' + syntax;
        return url;
      },
      back: function() {
        var that = this;

        // do nothing unless a previous page exists
        if (this.history.length <= 1) return;

        this.clearVars(true); // remove everything including sticky vars
        this.history.pop(); // remove this view

        // set vars and load
        _.each(this.history.pop(), function(val_array, key) {
          _.each(val_array, function(val) {
            that.appendVar(key, val);
          });
        });
        this.load();
      },
      getWidgetSyntax: function() {
        var $syntax;

        if (!this.syntax) {
          $syntax = $('#lw_cal .lw_widget_syntax,#lw_cal_body_wrapper .lw_widget_syntax');

          // if remote calendar, or if syntax not found
          if (LW.is_remote || !$syntax.length) {
            this.syntax = utils.getWidgetSyntaxFromArgObject(options.widget_args || {});
          } else {
            this.syntax = $syntax.attr('title');
          }
        }
        return this.syntax;
      }
      /*
      getViewVariables: function(view) {
        var tmpl = _.template($('#lw_cal_event_template', $tmpl_wrapper).html());
        var matches = tmpl.match(/{{\s*([A-Za-z0-9_-]+)\s*}}/);
        return matches;
      }
      */
    }, (use_history_api ? pushstate_controller : hash_controller));

    var monthAndDayNames = {
      month_names: [
        "Jan<span>uary</span>", "Feb<span>ruary</span>", "Mar<span>ch</span>",
        "Apr<span>il</span>", "May", "Jun<span>e</span>",
        "Jul<span>y</span>", "Aug<span>ust</span>", "Sept<span>ember</span>",
        "Oct<span>ober</span>", "Nov<span>ember</span>", "Dec<span>ember</span>"
      ],
      month_names_short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      day_names: [
        'Sun<span>day</span>', 'Mon<span>day</span>', 'Tue<span>sday</span>', 'Wed<span>nesday</span>',
        'Thu<span>rsday</span>', 'Fri<span>day</span>', 'Sat<span>urday</span>'
      ]
    };

    // init timezone dialog if timezone support
    var tzDialog = {
      init: function() {
        var that = this,
            tz   = controller.getTimezone();

        // insert timezone menu from template
        var tmpl = _.template($('#lw_cal_timezone_menu_template', $tmpl_wrapper).html());
        $('#lw_cal_body').append(tmpl({ timezones: LW.calendar.timezones }));

        var $el      = this.$el      = $('#lw_cal_tz', $wrapper);
        var $content = this.$content = $('.lw_cal_tz_selector_content', $el);
        var $sel     = this.$sel     = $content.find('.lw_cal_tz_select');
        this.$wrapper = null;

        // set default timezone
        if (tz.match(/[A-Z]{3,5}/)) {
          $sel.find('option[data-tz-abbrv="' + tz + '"]').eq(0).prop('selected', true);
        } else {
          $sel.val(tz);
        }

        // submit handler
        $el.find('.lw_submit').on('click', function(e) {
          var $option = $('option:selected', $sel),
              val     = $option.val();

          // only update if tz has changed
          if (val && controller.getTimezone() !== val) {
            controller.setTimezone(val);
            controller.load();
          }
          that.close();
        });

        // close handler
        $el.find('.lw_cancel').on('click', function(e) {
          that.close();
        });
        $body.trigger('calTzDialogInit.lwcal');
      },
      open: function($wrapper) {
        var that = this;

        if (!this.$el) {
          this.init();
        }
        $wrapper.hoverbox({
          position: 'top',
          autoOpen: true,
          html: this.$el.show(),
          beforeOpen: function() {
            // close any hoverbox
            $body.trigger('click');
          },
          close: function() {
            // move tz select div to body so it doesn't get removed
            that.$el.hide().appendTo('body');
            $(this).hoverbox('destroy');
          }
        });

        this.$wrapper = $wrapper;
      },
      close: function() {
        this.$wrapper.hoverbox('close');
      }
    };

    //
    // Menu used to change calendar view
    //
    var ViewMenu = function(cal) {
      var that = this;
      var timestamp = Math.floor(Date.now() / 1000);
      var date_formatter = new DateFormatter(new CalDate(timestamp, LW.calendar.default_timezone_offset));

      // insert header from template
      var tmpl = _.template($('#lw_cal_view_selector_template', $tmpl_wrapper).html());
      $('#lw_cal_view_selector').replaceWith(tmpl({
        date: date_formatter.format('Ymd'),
        display_date: date_formatter.format('F j, Y')
      }));

      this.$el = $('#lw_cal_view_selector');

      // do nothing if no view menu found
      if (!this.$el.length) return;

      // menu click just triggers a custom event that includes value of href
      // in the future we may replace button with gif that indicates loading
      this.$el.on('click', 'a', function(evt) {
        var $this = $(this);

        if ($this.closest('li').hasClass('add_new')) {
          return true;
        }

        evt.preventDefault();

        $body.trigger('lw.calendarViewClick', [$(this).attr('href')]);

        return true;
      }).removeClass('lw_hidden').show();

      // exclude view if
      if (options.exclude_view) {
        // convert exclude_view to array if it's a string
        if (typeof options.exclude_view === 'string') options.exclude_view = [options.exclude_view];

        if ($.isArray(options.exclude_view)) {
          _.each(options.exclude_view, function(val, key) {
            if (val === 'day') {
              that.$el.find('li.day').remove();
              that.$el.find('li.today').remove();
            } else {
              that.$el.find('li.' + val).remove();
            }
          });
        }
      }

      this.$add_event_link = this.$el.find('#lw_cal_add_event a');
      this.add_event_url = this.$add_event_link.attr('href');

      //
      // Highlight tab, and set events badge
      //
      $body.on('calLoad.lwcal', _.bind(function(e, controller, data) {
        // highlight tab
        var view = controller.getView();

        this.$el.find('.active').removeClass('active');

        // today is the default
        var tab = (!options.enable_home_view && (!view || ('day' === view && cal.getView().is_today))) ? 'today' : view;
        this.$el.find('.' + tab).addClass('active');

        // add current date "add event" link
        this.$add_event_link.attr('href', this.add_event_url);

        //
        // set events badge
        //
        this.$el.find('#lw_cal_events_badge').remove(); // remove existing badge
        if (data.event_count) {
          this.$el.find('li.all a').append('<div id="lw_cal_events_badge" class=>' + data.event_count + '</div>');
        }
      }, this));
    };

    var HeaderView = function() {
      // insert header from template
      var tmpl = _.template($('#lw_cal_header_template', $tmpl_wrapper).html());
      $('#lw_cal_header').replaceWith(tmpl());

      var $header = this.$header = $('#lw_cal_header');

      this.$title = $('#lw_cal_this_day', $header);
      this.$scroll_links = $('#lw_cal_scroll_links', $header);
      this.$date_sel = $('#lw_cal_date_selector');
      this.scroll_template = _.template($('#lw_cal_scroll_link_template', $tmpl_wrapper).html());

      // scroll links
      $header.on('click', '.lw_cal_date_scroll a, #lw_cal_date_selector a', function(evt) {
        evt.preventDefault();

        controller.setVarsInRelativeUrl($(this).attr('href'));
        controller.load();

        return true;
      });

      // date picker
      $body.on('change', '.lw_cal_date_picker', function(evt) {
        evt.preventDefault();

        var val = $(this).val();

        if (val) {
          controller.setVar('date', val);
          controller.load();
        }
        return true;
      });

      // gets var name from class by replacing lw_cal_showing, then removes var
      $body.on('click', '#lw_cal_showing a:not(.lw_cal_clear_filters)', function(evt) {
        evt.preventDefault();

        var $this = $(this),
            key   = $this.attr('class').replace('lw_cal_showing_', ''),
            href  = decodeURIComponent($this.attr('href'));

        // Work around for shitty IE bug -
        // in IE8, attr('href') returns encoded href value with current page's url prepended to it
        if (href.indexOf('/')) {
          href = href.substr(href.lastIndexOf('/') + 1);
        }
        if (key) {
          controller.removeVar(key, href);
          controller.load();
        }
        return true;
      });

      $body.on('click', '.lw_cal_clear_filters', function(e) {
        e.preventDefault();
        controller.clearVar('categories');
        controller.clearVar('audience');
        controller.clearVar('campus');
        controller.clearVar('tags');
        controller.clearVar('groups');
        controller.clearVar('locations');
        controller.clearVar('search');
        controller.clearVar('date');
        controller.clearVar('end_date');
        controller.clearVar('only_online');
        controller.load();
        return true;
      });

      $body.on('mouseover', '#lw_cal_showing a', function(evt) {
        $(this).addClass('X');
        return true;
      });

      $body.on('mouseover', '#lw_cal_showing a', function(evt) {
        $(this).removeClass('X');
        return true;
      });

      $body.on('click', '.lw_cal_back', function(e) {
        e.preventDefault();

        if (controller.history.length > 1) {
          controller.back();
        } else {
          controller.clearVars();
          controller.load();
        }
        return false;
      });
    };

    HeaderView.prototype = {
      setTitle: function(title) {
        this.$title.html(title);
      },
      clearScrollLinks: function() {
        this.$scroll_links.html('');
      },
      insertScrollLinks: function(prev_date, next_date) {
        this.$scroll_links.html(this.scroll_template({
          prev_date: prev_date,
          next_date: next_date
        }));
      },
      show: function() {
        this.$header.css('visibility', 'visible');
      },
      hide: function() {
        this.$header.css('visibility', 'hidden');
      },
      showBackLink: function() {
        this.$scroll_links.html('<a href="" class="lw_cal_back"><span class="lw-icon-2x lw-icon-times-circle"></span><span class="lw_sr_only">Close Event</span></a>');
      },
      clearDateSelector: function() {
        this.$date_sel.html('');
      },
      insertDateSelector: function(str) {
        this.$date_sel.html(str);
      },
      getTitle: function() {
        return this.$header.find('h5').text();
      }
    };

    // class inherited by all view classes
    var viewBase = _.extend({}, monthAndDayNames, {
      $el:                 $wrapper,
      $body:               $('#lw_cal_body'),
      $events:             $('#lw_cal_events'),
      is_mobile:           ($(window).width() <= 480) ? true :  false,
      $subscription_menu:  null,  // event and scroll templates used by most views
      event_template:      _.template($('#lw_cal_event_template', $tmpl_wrapper).html()),
      date_sel_template:   _.template($('#lw_cal_date_selector_template', $tmpl_wrapper).html()),
      show: function() {
        this.$events.removeClass('lw_cal_loading');
        this._cal.getHeader().show();
      },
      hide: function() {
        this.$events.css('visibility', 'hidden');
        this._cal.getHeader().hide();
      },
      getDateFromTimestamp: function(timestamp, tz_offset) {
        return new Date((parseInt(timestamp, 10) * 1000) + (parseInt(tz_offset, 10) * 1000));
      },
      hasDifferentLocalTimezone: function(event) {
        var daylight_abbrv = event.tz_abbrv.replace(/^(\w)(\w+)(\w)$/, function(match, p1, p2, p3, offset, string) {
          return p1 + p2.replace(/S/g, 'D') + p3;
        });
        var non_daylight_abbrv = event.tz_abbrv.replace(/^(\w)(\w+)(\w)$/, function(match, p1, p2, p3, offset, string) {
          return p1 + p2.replace(/D/g, 'S') + p3;
        });
        // check user tz against event tz, plus possible daylight versions of event tz
        return (event.user_abbrv !== event.tz_abbrv
                && event.user_abbrv !== daylight_abbrv
                && event.user_abbrv !== non_daylight_abbrv)
          ? true
          : false;
      },
      getEventTimeRange: function(e, hide_timezone, hide_localtime) {
        var diff_local_tz  = this.hasDifferentLocalTimezone(e),
            show_localtime = (options.hide_local_timezone || hide_localtime || !diff_local_tz) ? false : true,
            from_day_start = false,
            to_other_day = false,
            str = "",
            dt_start,
            dt_end,
            local_time;

        // start time
        dt_start = new CalDate(e.ts_start, e.tz_offset);
        dt_end   = (e.ts_end) ? new CalDate(e.ts_end, e.tz2_offset) : null;

        if (dt_start.isDayStart()) {
          from_day_start = true;
        }

        if (dt_end && (dt_start.getMonth() !== dt_end.getMonth() || dt_start.getDate() !== dt_end.getDate())) {
          to_other_day = true;
        }

        // return right away if all day event
        if (e.is_all_day) {
          str = 'All Day';

          if (to_other_day && dt_end) {
            str += ' <span class="lw_until">(until ';

            if (!dt_end.isDayStart()) {
              str += dt_end.getTimeString(e.tz_format);
            }
            if (LW.timezone_format === 'euro') {
              str += ' ' + dt_end.getDate() + ' ' + this.month_names[ dt_end.getMonth() ] + ')</span>';
            } else {
              str += ' ' + this.month_names[ dt_end.getMonth() ] + ' ' + dt_end.getDate() + ')</span>';
            }
          }

          // append postfix if it exists
          if (e.time_postfix) str += ' <span class="postfix">' + e.time_postfix + '</span>';
          return str;
        }

        // get time range and append tz abbreviation
        str = this.getTimes(dt_start, dt_end, from_day_start, to_other_day, e.tz_format);

        // append timezone
        if (((!hide_timezone && !options.hide_local_timezone) || diff_local_tz) && !options.disable_timezone) {
          str += ' <span class="lw_cal_tz_abbrv' + (!show_localtime ? ' tz_editable' : '') + '">'
              + e.tz_abbrv + '</span>';
        }

        // also show the user's TZ if native event timezone is not the
        // same as the user's TZ, and this isn't an all day event
        if (show_localtime && !options.disable_timezone) {
          local_time = this.getLocalTimeRange({
            ts_start:   e.ts_start,
            ts_end:     e.ts_end,
            tz_offset:  e.user_offset,
            tz2_offset: e.user_offset,
            tz_abbrv:   e.user_abbrv
          }, e, from_day_start, to_other_day);
          str += ' <span class="lw_user_time">(' + local_time + ')</span>';
        }

        // append postfix if it exists
        if (e.time_postfix) str += ' <span class="postfix">' + e.time_postfix + '</span>';
        return str;
      },
      getDateRangeFromTimestamps: function(ts_start, ts_end, tz_offset, tz2_offset) {
        var dt_start = new CalDate(ts_start, tz_offset),
            dt_end;

        if (ts_end) {
          dt_end = new CalDate(ts_end, tz2_offset);
        }
        return this.getDateRange(dt_start, dt_end);
      },
      getDateRange: function(dt_start, dt_end) {
        var result;

        if (dt_end && dt_start.getMonth() !== dt_end.getMonth()) {
          if (LW.timezone_format === 'euro') {
            result = '<span class="lw_date_range">'
                   + '<span class="lw_date">' + dt_start.getDate() + '</span> ' + this.month_names_short[dt_start.getMonth()]
                   + '<span class="lw_date_range_separator"> - </span>'
                   + '<span class="lw_date">' + dt_end.getDate() + '</span> ' + this.month_names_short[dt_end.getMonth()]
                   + '</span>';
          } else {
            result = '<span class="lw_date_range">'
                   + this.month_names_short[dt_start.getMonth()] + ' <span class="lw_date">' + dt_start.getDate() + '</span>'
                   + '<span class="lw_date_range_separator"> - </span>'
                   + this.month_names_short[dt_end.getMonth()] + ' <span class="lw_date">' + dt_end.getDate() + '</span>'
                   + '</span>';
          }
        } else if (dt_end && dt_start.getDate() !== dt_end.getDate()) {
          if (LW.timezone_format === 'euro') {
            result = '<span class="lw_date_range lw_same_month">'
                   + '<span class="lw_date">' + dt_start.getDate() + '</span> ' + this.month_names_short[dt_start.getMonth()]
                   + '<span class="lw_date_range_separator"> - </span>'
                   + '<span class="lw_date">' + dt_end.getDate() + '</span> ' + this.month_names_short[dt_end.getMonth()]
                   + '</span>';
          } else {
            result = '<span class="lw_date_range lw_same_month">'
                   + this.month_names[dt_start.getMonth()]
                   + ' <span class="lw_date">' + dt_start.getDate() + ' - ' + dt_end.getDate() + '</span>'
                   + '</span>';
          }
        } else {
          result = this.month_names[dt_start.getMonth()] + ' <span class="lw_date">' + dt_start.getDate() + '</span>';
        }
        result += '<span class="lw_year">, ' + (dt_end ? dt_end.getFullYear() : dt_start.getFullYear()) + '</span>';
        return result;
      },
      getLocalTimeRange: function(e, orig_evt, from_day_start, to_other_day, hide_timezone) {
        var dt_start = new CalDate(e.ts_start, e.tz_offset),
            orig_dt  = new CalDate(orig_evt.ts_start, orig_evt.tz_offset),
            dt_end   = (e.ts_end) ? new CalDate(e.ts_end, e.tz2_offset) : null,
            one_day  = 86400000,
            str,
            local_day_offset;

        // get time range and append tz abbreviation
        str = this.getTimes(dt_start, dt_end, from_day_start, to_other_day, null);

        // add +/- day if the local timezone moves time to the next calendar date
        orig_dt.setTimeToZero();
        dt_start.setTimeToZero();
        local_day_offset = (dt_start.getTime() - orig_dt.getTime()) / one_day;

        if (0 !== local_day_offset) {
          str += ' ' + (local_day_offset < 0 ? '-' : '+') + Math.abs(local_day_offset) + ' Day';
          if (Math.abs(local_day_offset) > 1) str += 's';
        }

        if (!hide_timezone && !options.hide_local_timezone) {
          str += ' <span class="lw_cal_tz_abbrv tz_editable">' + e.tz_abbrv + '</span>';
        }

        return str;
      },
      getTimes: function(dt_start, dt_end, from_day_start, to_other_day, tz_format) {
        var str;

        if (from_day_start && dt_end) {
          str = 'until <span class="lw_end_time">' + dt_end.getTimeString(tz_format) + '</span>';

          if (to_other_day) {
            str += ' <span class="lw_end_date">'
                 + this.month_names[ dt_end.getMonth() ] + ' ' + dt_end.getDate()
                 + '</span>';
          }
        } else {
          str = '<span class="lw_start_time">' + dt_start.getTimeString(tz_format) + '</span>';

          if (dt_end) {
            // add time if the end day is not all-day, which the backend
            // represents as a 12:00am en  d time
            if (0 !== dt_end.getHours() || 0 !== dt_end.getMinutes()) {
              str += ' - <span class="lw_end_time">' + dt_end.getTimeString(tz_format) + '</span> ';
            }

            // append end date if
            if (to_other_day) {
              str += ' <span class="lw_start_date">';
              str += (LW.timezone_format === 'euro')
                ? dt_start.getDate() + ' ' + this.month_names[ dt_start.getMonth() ]
                : this.month_names[ dt_start.getMonth() ] + ' ' + dt_start.getDate();
              str += '</span>';
              str += ' - ';

              str += '<span class="lw_end_date">';
              str += (LW.timezone_format === 'euro')
                ? dt_end.getDate() + ' ' + this.month_names[ dt_end.getMonth() ]
                : this.month_names[ dt_end.getMonth() ] + ' ' + dt_end.getDate();
              str += '</span>';
            }
          }
        }
        return str;
      },
      getDateFromYmd: function(ymd) {
        var year  = parseInt(ymd.substr(0, 4), 10),
            month = parseInt(ymd.substr(4, 2), 10),
            day   = parseInt(ymd.substr(6, 2), 10);
        return new Date(year, month - 1, day);
      },
      getYmdFromDate: function(dt) {
        var y = dt.getFullYear(),
            m = dt.getMonth() + 1,
            d = dt.getDate();

        y = y.toString();
        m = m.toString();
        d = d.toString();

        if (1 === m.length) m = '0' + m;
        if (1 === d.length) d = '0' + d;

        return y + m + d;
      },
      getMonthAndDayFromTimestamp: function($timestamp, $tz_offset) {
        var dt = this.getDateFromTimestamp($timestamp, $tz_offset);
        return this.month_names[dt.getMonth()] + ' ' + dt.getDate();
      },
      getMdYFromDate: function(dt) {
        return this.month_names[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear();
      },
      getFormattedListDate: function(obj_date) {
        return this.day_names[ obj_date.getDay() ] + ', '
               + this.month_names[ obj_date.getMonth() ] + ' '
               + obj_date.getDate();
      },
      setViewClass: function(view) {
        // remove existing view class
        this.$el.removeClass(function(i, css) {
          return (css.match(/lw_cal_\w+_view/g) || []).join(' ');
        });
        this.$el.addClass('lw_cal_' + view + '_view');

        // remove existing body view class
        $body.removeClass(function(i, css) {
          return (css.match(/lw_cal_view_\w+/g) || []).join(' ');
        });
        $body.addClass('lw_cal_view_' + view);

        // add class to indicate that this is a search if search val
        if (controller.getVar('search').length) {
          $body.addClass('lw_cal_view_search');
        }

        if (view === options.event_view_name) {
          $body.addClass('lw_cal_event_detail');
        } else {
          $body.removeClass('lw_cal_event_detail');
        }
      },
      getEventTitleLink: function(event_data) {
        var str = '';
        var classes = [];
        var url;

        if (event_data.external_url) {
          url = event_data.external_url;
          classes.push('external_url');
        }
        // We don't want to create links for events without an href.
        // Its absence signifies that the event has no details
        else if (event_data.href) {
          url = event_data.href;
        }
        if (url) {
          if (event_data.status === 2) {
            classes.push('hidden_event');
          }
          str = '<a href="' + url + '"';
          if (classes.length) {
            str += ' class="' + classes.join(' ') + '"';
          }
          str += '>' + event_data.title + '</a>';
        } else {
          str = event_data.title;
        }
        return str;
      },
      slugify: function(text) {
        return text.toString().toLowerCase()
          .replace(/\s+/g, '-')           // Replace spaces with -
          .replace(/[^\w-]+/g, '')        // Remove all non-word chars
          .replace(/--+/g, '-')           // Replace multiple - with single -
          .replace(/^-+/, '')             // Trim - from start of text
          .replace(/-+$/, '');            // Trim - from end of text
      },
      getEventUrl: function(id, title) {
        var url;

        if (use_history_api) {
          url = options.event_view_name + '/' + String(id) + '-' + this.slugify(title);
        } else {
          url = hashbang + 'view/event/event_id/' + id;
        }
        if (calendar_path) {
          url = calendar_path + url;
        }
        return url;
      },
      addHostToSrcSetFilter: function(str, host) {
        return str.replace(/\bsrcset="([^"]*)"/g, function(match, val) {
          var urls = val.split(', ');
          var result = [];

          _.each(urls, function(url) {
            // if url starts with / and not //
            if (url.length > 1 && url.charAt(0) === '/' && url.charAt(1) !== '/') {
              result.push(host + url);
            } else {
              result.push(url);
            }
          });
          return 'srcset="' + result.join(', ') + '"';
        });
      },
      addHostToLinks: function(str, host) {
        return str.replace(/\shref="([^"]*)"/, function(match, href) {
            var result = match;

            if (0 !== href.indexOf('http') && 0 !== href.indexOf('//') && -1 === href.indexOf('mailto:')) {
              // prepend slash to href if it doesn't start with one
              if (0 !== href.indexOf('/')) {
                href = '/' + href;
              }
              result = ' href="' + host + href + '"';
            }
            return result;
        });
      },
      formatEventObject: function(data) {
        var defaults = {
          'location': '',
          'summary':  '',
          'href':     '',
          'title':    ''
        };

        // set defaults
        _.each(defaults, function(val, key) {
          if (!_.has(data, key)) {
            data[key] = val;
          }
        });

        if (!data.external_url && data.href && calendar_path) {
          data.href = calendar_path + data.href;
        }

        // convert category classes to string for each type
        if (_.isArray(data.category_classes)) {
          data.category_classes = data.category_classes.join(' ');
        }
        if (_.isArray(data.category_audience_classes)) {
          data.category_audience_classes = data.category_audience_classes.join(' ');
        }
        if (_.isArray(data.category_campus_classes)) {
          data.category_campus_classes = data.category_campus_classes.join(' ');
        }
        // create link strings for each category type
        if (_.isArray(data.categories)) {
          var category_links = _.map(data.categories, function(cat) {
            return '<a href="' + hashbang + 'all/categories/' + encodeURIComponent(cat) + '">' + cat + '</a>';
          });
          data.category_links = category_links.join(', ');
        }
        if (_.isArray(data.categories_audience)) {
          var category_audience_links = _.map(data.categories_audience, function(cat) {
            return '<a href="' + hashbang + 'all/categories/' + encodeURIComponent(cat) + '">' + cat + '</a>';
          });
          data.category_audience_links = category_audience_links.join(', ');
        }
        if (_.isArray(data.categories_campus)) {
          var category_campus_links = _.map(data.categories_campus, function(cat) {
            return '<a href="' + hashbang + 'all/categories/' + encodeURIComponent(cat) + '">' + cat + '</a>';
          });
          data.category_campus_links = category_campus_links.join(', ');
        }

        if ($.isArray(data.tag_classes) && data.tag_classes.length) {
          data.tag_classes = data.tag_classes.join(' ');
        }
        if (_.isArray(data.tags)) {
          var tag_links = _.map(data.tags, function(tag) {
            return '<a href="' + hashbang + 'all/tags/' + encodeURIComponent(tag) + '">' + tag + '</a>';
          });
          data.tag_links = tag_links.join(', ');
        }

        data.title_link = this.getEventTitleLink(data);
        data.date_title = this.getWeekDayAndDateFormatFromTimestamp(data.ts_start, data.tz_offset);

        var start_cal_date = new CalDate(data.ts_start, data.tz_offset);
        data.date_start = start_cal_date.getShortDateString();
        data.date_start_day = start_cal_date.getFormattedDate('d');
        data.date_start_month = start_cal_date.getFormattedDate('F');
        data.date_start_month_short = start_cal_date.getFormattedDate('M');
        data.date_start_year = start_cal_date.getFormattedDate('Y');
        data.date_start_day_of_week = start_cal_date.getFormattedDate('l');
        data.time       = this.getEventTimeRange(data);
        data.time_start = start_cal_date.getTimeString();
        data.datetime_start = start_cal_date.getFormattedDate('o-m-dTH:i');

        // set end date and time values if ts_end
        if (data.ts_end && data.tz2_offset) {
          var end_cal_date = new CalDate(data.ts_end, data.tz2_offset);
          data.date_end = end_cal_date.getShortDateString();
          data.date_end_day = end_cal_date.getFormattedDate('d');
          data.date_end_month = end_cal_date.getFormattedDate('F');
          data.date_end_month_short = end_cal_date.getFormattedDate('M');
          data.date_end_year = end_cal_date.getFormattedDate('Y');
          data.date_end_day_of_week = end_cal_date.getFormattedDate('l');

          data.time_end = end_cal_date.getTimeString();
          data.datetime_end = end_cal_date.getFormattedDate('o-m-dTH:i');
        }

        // format repeats_start and repeats_end
        var repeats_format = data.is_all_day ? 'F j' : 'F j, g:ia';
        if (data.repeats_start) {
          var repeats_start = new CalDate(data.repeats_start, data.tz_offset);
          data.repeats_start = repeats_start.getFormattedDate(repeats_format);
        } else {
          data.repeats_start = '';
        }
        if (data.repeats_end) {
          var repeats_end = new CalDate(data.repeats_end, data.tz_offset);
          data.repeats_end = repeats_end.getFormattedDate(repeats_format);
        } else {
          data.repeats_end = '';
        }

        // set thumb dimensions
        if (data.image_src) {
          data.thumb_width = options.thumb_width;
          data.thumb_height = options.thumb_height;

          data.image_orientation = '';
          if (data.image_width && data.image_height) {
            data.image_orientation = (data.image_width > data.image_height) ? 'horizontal' : 'vertical';
          }

          // prepend remote_host to image_src if it exists and is not already part of the image_src
          if (LW.remote_host && -1 === data.image_src.indexOf(LW.remote_host)) {
            data.image_src = LW.remote_host + data.image_src;
          }

          // replace with webp image if browser and server support it
          if (LW.lib.hasWebPSupport()) {
            if (0 !== data.image_src.indexOf('http') && 0 !== data.image_src.indexOf('//') && data.image_src.match(/\.jpe?g$/i)) {
              data.image_src = data.image_src.replace(/\.jpe?g$/i, '.webp');
            }
          }
        }

        // add ical download link
        if (LW.is_remote) {
          data.ical_download_href = LW.remote_host;
        } else {
          data.ical_download_href = '//' + window.location.hostname;
        }
        data.ical_download_href += LW.liveurl_dir + '/ical/events/id/' + data.id;
        data.add_to_google = this.getAddToGoogleLink(data);
        data.add_to_yahoo  = ''; // leave for BC

        // add remote host to image_raw src
        if (data.image_raw && LW.remote_host) {
          var raw = data.image_raw;
          var src = raw.match(/\ssrc="([^"]*)"/);

          // if url starts with / and not //
          if (src && src.length === 2
              && src[1].charAt(0) === '/' && (src[1].length === 1 || src[1].charAt(1) !== '/')) {
            raw = raw.replace(/\ssrc="([^"]*)"/, ' src="' + LW.remote_host + src[1] + '"');
          }

          // add remote host to image srcset
          raw = this.addHostToSrcSetFilter(raw, LW.remote_host);

          data.image_raw = raw;
        }

        // impose limit on location length
        if (data.location && data.location.length > options.location_char_limit && data.location.substr(0, 1)!='<') {
          data.location = data.location.substr(0, options.location_char_limit) + '...';
        }

        // add viewHelpers
        _.extend(data, viewHelpers);

        return data;
      },
      getWeekDayAndDateFormat: function(ymd) {
        var date_obj = this.getDateFromYmd(ymd);
        return this.day_names[ date_obj.getDay() ] + ', ' + this.month_names[date_obj.getMonth()] + ' ' + date_obj.getDate() + '<span>, ' + date_obj.getFullYear() + '</span>';
      },
      getWeekDayAndDateFormatFromTimestamp: function(timestamp, tz_offset) {
        var date_obj = this.getDateFromTimestamp(timestamp, tz_offset);
        return this.day_names[date_obj.getUTCDay()] + ', ' + this.month_names[date_obj.getUTCMonth()] + ' ' + date_obj.getUTCDate() + '<span>, ' + date_obj.getUTCFullYear() + '</span>';
      },
      getICalDate: function(ts, tz_offset) {
        var dt;

        if (!ts) return '';

        dt = new CalDate(ts, 0);
        return dt.getFormattedDate('Ymd') + 'T' + dt.getFormattedDate('His') + 'Z';
      },
      // google's link generator here:
      // https://support.google.com/calendar/answer/3033039
      getAddToGoogleLink: function(data) {
      // ts_start, ts_end, is_all_day, title, summary, location
        var lnk = 'http://www.google.com/calendar/event?action=TEMPLATE&',
            args = [],
            sdate = this.getICalDate(data.ts_start),
            ts_end, edate;

        // google requires an end time, so use a sensible value if no data.ts_end
        if (data.ts_end) {
          ts_end = data.ts_end;
        } else {
          ts_end = (data.is_all_day) ? data.ts_start + 3600 * 24 : data.ts_start + 3600;
        }
        edate = this.getICalDate(ts_end);

        args.push('text=' + encodeURIComponent(data.title));
        args.push('dates=' + sdate + '/' + edate);

        if (data.summary) {
          args.push('details=' + encodeURIComponent( LW.lib.htmlDecode(data.summary) ));
        }
        if (data.location) {
          args.push('location=' + encodeURIComponent(data.location));
        }
        return lnk + args.join('&') + '&trp=false&sprop=&sprop=name:';
      },
      getVariablesInTemplate: function(template) {
        var var_matches = template.match(/{{\s*[\w\d._-]+\s*}}/g);
        return (var_matches)
          ? var_matches.map(function(x) { return x.match(/[\w._-]+/)[0]; })
          : [];
      },
      getTemplateVariables: function(view) {
        var result = [];
        if ('day' === view) {
          result =  this.getVariablesInTemplate($('#lw_cal_day_template', $tmpl_wrapper).html() || '');
        } else if ('week' === view) {
          result = this.getVariablesInTemplate($('#lw_cal_week_template', $tmpl_wrapper).html() || '');
        } else if ('all' === view) {
          result = this.getVariablesInTemplate($('#lw_cal_all_template', $tmpl_wrapper).html() || '');
        } else if ('month' === view) {
          result = this.getVariablesInTemplate($('#lw_cal_month_template', $tmpl_wrapper).html() || '');
        }
        return result;
      },
      getEventTemplateVariables: function(view) {
        var result = [];
        if ('event' === view) {
          result =  this.getVariablesInTemplate($('#lw_cal_event_detail_template', $tmpl_wrapper).html() || '');
        } else if ('week' === view || 'all' === view || 'day' === view || 'home' === view) {
          result = this.getVariablesInTemplate($('#lw_cal_event_template', $tmpl_wrapper).html() || '');
        } else if ('month' === view) {
          result = this.getVariablesInTemplate($('#lw_cal_month_event_template', $tmpl_wrapper).html() || '');
        }
        result = _.map(result, function(val) { return val.replace(/^obj\./, ''); });
        return _.uniq(result);
      },
      buildEventList: function(events) {
        var that = this,
            str = "";

        // return an empty string if events not a non-empty object
        if (!events || !$.isPlainObject(events) || $.isEmptyObject(events)) {
          return str;
        }

        // set list template if not already set
        if (!this.list_tmpl) {
          this.list_tmpl = _.template($('#lw_cal_list_template', $tmpl_wrapper).html());
        }

        // loop through days, and create
        _.each(events, function(events, date_str) {
          var events_str = "",
              dt = that.getDateFromYmd(date_str);

          // loop through events, and insert in template to build string of all events
          _.each(events, function(event) {
            events_str += that.event_template( that.formatEventObject(event) );
          });
          str += that.list_tmpl(_.extend({
            date: that.getFormattedListDate(dt),
            date_raw: dt,
            year: dt.getFullYear(),
            events: events_str
          }, viewHelpers));
        });
        return str;
      },
      getStaticMapImageSrc: function(latitude, longitude) {
        var map_url = livewhale.liveurl_dir + '/places/thumb?url='
          + encodeURIComponent('http://maps.googleapis.com/maps/api/staticmap?sensor=false&size=320x320'
          + '&zoom=17&markers=size:small|' + latitude + ',' + longitude);
        if (livewhale.remote_host) {
          map_url = livewhale.remote_host + map_url;
        }
        return map_url;
      }
    });

    var FeaturedContent = function() {
      this.feature_tmpl = _.template($('#lw_cal_feature', $tmpl_wrapper).html());
      this.feature_top_tmpl = _.template($('#lw_cal_feature_top', $tmpl_wrapper).html());
      this.feature_item_tmpl = _.template($('#lw_cal_feature_item', $tmpl_wrapper).html());

      $wrapper.on('click', '.lw_cal_feature_top,.lw_cal_feature_item', function(e) {
        e.preventDefault();

        if ($(e.target).hasClass('tz_editable')) return true;

        var href = $(this).find('a').attr('href');
        controller.loadEventDetailHref(href);

        return true;
      });
    };

    FeaturedContent.prototype = $.extend(viewBase, {
      build: function(features) {
        var that          = this,
            feature_top   = "",
            feature_items = "",
            view          = controller.getView(),
            sub_feature_count = 0,
            feature_item;

        // return empty string if no data
        if (!features || (!features.top || $.isEmptyObject(features.top)) && (!features.other || !features.other.length)) {
          return "";
        }

        if (features.top) {
          features.top = this.formatEventObject(features.top);

          // add date time string
          features.top.date_time = (view === 'week')
            ? this.getMonthAndDayFromTimestamp(features.top.ts_start, features.top.tz_offset) + ' '
            : '';
          features.top.date_time += features.top.is_all_day ? 'All Day' : that.getFormattedDateTime(features.top);
          feature_top = that.feature_top_tmpl(features.top);
        }

        // only show others if we have three of them
        //if (features.other && 3 === features.other.length) {
        if (features.other && features.other.length) {
          sub_feature_count = features.other.length;
          for (var i = 0; i < sub_feature_count; i++) {
            feature_item = features.other[i];

            feature_item = this.formatEventObject(feature_item);

            //// date time string
            feature_item.date_time = (view === 'week') ? this.getMonthAndDayFromTimestamp(feature_item.ts_start, feature_item.tz_offset, true) + ' ' : '';
            feature_item.date_time += (feature_item.is_all_day) ? 'All Day' : that.getFormattedDateTime(feature_item);

            // adds 'first' class to first item for css
            if (0 === i) feature_item.is_first = true;

            feature_items += that.feature_item_tmpl(feature_item);
          }
        }
        return this.feature_tmpl({
          feature_top: feature_top,
          feature_items: feature_items,
          sub_feature_count: sub_feature_count
        });
      },
      getFormattedDateTime: function(e) {
        var dt = viewBase.getDateFromTimestamp(e.ts_start, e.tz_offset);
        return viewBase.month_names_short[dt.getMonth()] + ' ' + dt.getDate() + ' ' + viewBase.getEventTimeRange(e);
      }
    });
    var featuredContent = new FeaturedContent();

    var FeedBuilderView = LW.lwCalendar.FeedBuilderView = function(cal) {
      this._cal = cal;
      this.name = 'feed_builder_view';
      this.tag_mode = 'any';
      this.category_mode = 'any';

      var that = this,
          $tmpl = $('#lw_cal_feed_template', $tmpl_wrapper),
          $selector_tmpl   = $('#lw_cal_feed_selector_template', $tmpl_wrapper);

      this.preview_template = _.template($('#lw_cal_preview_template', $tmpl_wrapper).html());

      // do nothing if feed template missing
      if (!$tmpl.length || !$selector_tmpl.length) return;

      this.tmpl = _.template($tmpl.html());
      this.selector_tmpl = _.template($selector_tmpl.html());

      this.selected = {};

      // checkbox handler
      this.$events.on('change', '.lw_cal_feed_selectors input[type=checkbox]', function(e) {
        var $this = $(this),
            $wrap = $this.closest('.lw_cal_feed_selector'),
            type  = $wrap.attr('class').replace(/.*lw_cal_feed_selector_type_([\w_-]+).*/, '$1'),
            value = $this.val();

        // make type an array
        if (typeof that.selected[type] === 'undefined' || !_.isArray(that.selected[type])) {
          that.selected[type] = [];
        }
        if ($this.is(':checked')) {
          that.selected[type].push(value);
        } else {
          that.selected[type] = _.without(that.selected[type], value);
        }
        that.buildFeed();
        that.updatePreview();
      });

      // filter search handler
      this.$events.on('keyup', '.lw_cal_feed_selectors input[type=text]', function(e) {
        var $this = $(this),
            search_str = $(this).val().toLowerCase(),
            $wrap = $this.closest('.lw_cal_feed_selector'),
            $items = $wrap.find('ul').children();

        if (search_str) {
          $items.each(function() {
            var $this = $(this),
                $checkbox = $this.find('input'),
                tag = $this.text().toLowerCase();

            // hide unchecked items that don't contain string
            if (true === $checkbox.prop('checked') || -1 !== tag.indexOf(search_str)) {
              $this.show();
            } else {
              $this.hide();
            }
          });
        } else {
          $items.show();
        }
      });

      this.$events.on('click', '.lw_filter_mode_toggle a', function(e) {
        e.preventDefault();
        var $this = $(this),
            mode, $wrap, type;

        // do nothing if this is the already selcted tag
        if ($this.hasClass('selected')) return true;

        $wrap = $this.closest('.lw_filter_mode_toggle');
        type = $wrap.attr('class').replace(/.*lw_filter_mode_type_(\w+).*/, '$1');
        mode = $this.hasClass('lw_any') ? 'any' : 'all';

        if (type === 'tag') {
          that.tag_mode = mode;
        } else if (type === 'category') {
          that.category_mode = mode;
        }
        $this.addClass('selected').siblings('a').removeClass('selected');
        that.buildFeed();
        that.updatePreview();
        return true;
      });
    };
    _.extend(FeedBuilderView.prototype, viewBase, {
      render: function() {
        var that = this,
            filters = options.feed_builder_filters,
            selectors = {};

        if (!_.isArray(filters)) {
          return false;
        }

        // do nothing if no templates
        if (!this.tmpl || !this.selector_tmpl) return;

        this.setViewClass('feed_builder');
        this._cal.getHeader().setTitle('Feed Builder');

        // template expects items to be an array of objects with id and title properties
        _.each(filters, function(type) {
          var items = that.getSelectorItemByType(type);

          if (items.length) {
            selectors[type] = that.selector_tmpl({
              type: type,
              items: items
            });
          }
        });
        this.$events.html(this.tmpl({ selectors: selectors, }));
        this.show();

        // reset state
        if (!_.isEmpty(this.selected)) {
          this.selected = {};
        }
        this.$ical_result = this.$events.find('#lw_cal_feed_ical_result');
        this.$rss_result = this.$events.find('#lw_cal_feed_rss_result');
        this.$json_result = this.$events.find('#lw_cal_feed_json_result');
        this.$cms_result = this.$events.find('#lw_cal_feed_cms_result');
        this.$preview     = this.$events.find('.lw_cal_feed_preview');

        if (calView.feed_builder_vars && !_.isEmpty(calView.feed_builder_vars)) {
          this.setFeedToCalendarState();
        }
        this.buildFeed();
        this.updatePreview();
      },
      setFeedToCalendarState: function() {
        var that = this,
            vars = calView.feed_builder_vars || {};

        var selectors = {
          category:  vars.categories || [],
          audience:  vars.audience || [],
          campus:    vars.campus || [],
          group:     vars.groups || [],
          tag:       vars.tags || []
        };

        // loop through selectors and click selected checkboxes for each
        _.each(selectors, function(items, key) {
          _.each(items, function(val) {
            that.$events.find('.lw_cal_feed_selector_type_' + key + ' input[type="checkbox"][value="' + val + '"]')
              .each(function() {
                $(this).trigger('click');
              });
          });
        });
      },
      close: function() {
        // reset feed_builder_vars
        calView.feed_builder_vars = {};
      },
      updatePreview: function() {
        var that = this,
            json_url = this.getLink('json', this.selected) + '/max/10',
            events_str;

        // add spinner
        var $spinner = $('<div class="lw_spinner"></div>').appendTo(this.$preview);

        $.getJSON(json_url, function(data) {
          //remove spinner
          $spinner.remove();

          // build event list and add to preview
          if (data && data.length) {
            events_str = '<ul>';
            $.each(data, function(i, event) {
              // #FIXME: formatEventObject isn't compatible with JSON endpoint
              // events_str += that.preview_template( that.formatEventObject(event) );
              events_str += '<li>' + event.date + ', ' + event.date_time + '<br/><a href="' + event.url + '">' + event.title + '</a></li>';
            });
            events_str += '</ul>';
          } else {
            events_str = '<p>The selected feed does not contain any events.</p>';
          }
          that.$preview.html(events_str);
        });
      },
      getSelectorItemByType: function(type) {
        var result = [];

        switch(type) {
          case 'category':
            if (_.isArray(LW.calendar.categories)) {
              result = _.map(LW.calendar.categories, function(val) { return { id: val, title: val }; });
            }
            break;
          case 'audience':
            if (_.isArray(LW.calendar.categories_audience)) {
              result = _.map(LW.calendar.categories_audience, function(val) { return { id: val, title: val }; });
            }
            break;
          case 'campus':
            if (_.isArray(LW.calendar.categories_campus)) {
              result = _.map(LW.calendar.categories_campus, function(val) { return { id: val, title: val }; });
            }
            break;
          case 'tag':
            if (_.isArray(LW.calendar.tags)) {
              result = _.map(LW.calendar.tags, function(val) { return { id: val, title: val }; });
            }
            break;
          case 'group':
            if (_.isArray(LW.calendar.groups)) {
              result = _.map(LW.calendar.groups, function(val) { return { id: val.fullname, title: val.fullname }; });
            }
            break;
        }
        return result;
      },
      buildFeed: function() {
        var feed_base = options.feed_base_path ? options.feed_base_path : false;
        this.$ical_result.val(this.getLink('ical', this.selected, feed_base));
        this.$rss_result.val(this.getLink('rss', this.selected));
        this.$json_result.val(this.getLink('json', this.selected, feed_base));
        this.$cms_result.val(this.getLink('cms', this.selected, feed_base));
      },
      getLink: function(type, filters, feed_base) {
        type = (type === 'cms') ? 'json' : type;
        var that = this,
            link = LW.liveurl_dir + '/' + type + '/events';

        _.each(filters, function(filter, key) {
          if (key === 'category' && that.category_mode === 'any') {
            link += '/category_mode/any';
          }
          if (key === 'tag' && that.tag_mode === 'any') {
            link += '/tag_mode/any';
          }
          _.each(filter, function(val) {
            link += '/' + key + '/' + encodeURIComponent(val).replace(/'/g, "%27");
          });
        });

        // we need to prepend the remote host if this is a remote calendar
        if (feed_base) {
          link = link.replace(LW.liveurl_dir + '/' + type + '/events', ''); // for NYU's redirect thingy
          link = feed_base + '/' + type + link;
        } else {
          if (LW.is_remote) {
            link = LW.remote_host + link;

            // the client sometimes sends the remote host starting with double slashes
            if (link.match(/^\/\//)) {
              link = window.location.protocol + link;
            }
          } else {
            link = window.location.protocol + '//' + window.location.host + link;
          }
          // replace https? with webcal protocol if webcal_feed_links true
          if (type === 'ical' && options.webcal_feed_links) {
            link = 'webcal://' + link.replace(/^https?:\/\//, '');
          }
        }
        return link;
      }
    });

    //
    // Day View
    //
    var DayView = LW.lwCalendar.DayView = function(cal) {
      this._cal     = cal;
      this.name     = 'day_view';
      this.template = _.template($('#lw_cal_day_template', $tmpl_wrapper).html());

      var no_results_tmpl = '<div class="no"><p>No events found.</p></div>';
      this.no_results_tmpl = _.template(
        $('#lw_cal_no_results_template', $tmpl_wrapper).html() || no_results_tmpl
      );

      this.is_today = false;
    };

    _.extend(DayView.prototype, viewBase, {
      render: function(controller, view, data) {
        var that = this,
            events_str = "",
            single_events_str = "",
            repeating_events_str = "",
            upcoming_str = "",
            i;

        this.is_today = data.is_today;
        this.setViewClass((this.is_today) ? 'today' : 'day');

        this._cal.getHeader().setTitle(data.title);
        this._cal.getHeader().insertScrollLinks(data.prev_date, data.next_date);
        this.insertDateSelector(data.date);

        // build day's event list
        if ($.isArray(data.events) && data.events.length) {
          for (i = 0; i < data.events.length; i++) {
            events_str += this.event_template( this.formatEventObject(data.events[i]) );
          }
        } else {
          events_str = this.no_results_tmpl({view: view});
        }

        // build day's single event list
        if ($.isArray(data.single_events) && data.single_events.length) {
          for (i = 0; i < data.single_events.length; i++) {
            single_events_str += this.event_template( this.formatEventObject(data.single_events[i]) );
          }
        }

        // build day's repeating event list
        if ($.isArray(data.repeating_events) && data.repeating_events.length) {
          for (i = 0; i < data.repeating_events.length; i++) {
            repeating_events_str += this.event_template( this.formatEventObject(data.repeating_events[i]) );
          }
        }

        // build upcoming event list
        _.each(data.upcoming_events, function(events, date_str) {
          var dt = that.getDateFromYmd(date_str);

          upcoming_str += '<h4>' + that.getFormattedListDate(dt) + '</h4>';

          for (var i = 0; i < events.length; i++) {
            upcoming_str += that.event_template( that.formatEventObject(events[i]) );
          }
        });

        var dt = this.getDateFromYmd(data.date);

        // format weather description and location
        if (data.weather.description) {
          var descr = $.trim(data.weather.description);
          var space = descr.indexOf(' ');
          if (-1 !== space) {
            data.weather.description = descr.substr(space + 1) + ', ' + descr.substring(0, space);
          }
        }
        if (data.weather.location) {
          var loc = $.trim(data.weather.location);
          var comma = loc.indexOf(',');
          if (-1 !== comma) {
            data.weather.location = loc.substring(0, comma);
          }
        }

        this.$events.html(this.template({
          feature: featuredContent.build(data.features),
          month: this.month_names_short[dt.getMonth()],
          date: that.getFormattedListDate(dt),
          day: dt.getDate(),
          today_facts: (data.today_facts && typeof data.today_facts === 'string') ? data.today_facts : '',
          weather: (data.weather.description !== undefined && data.weather.location !== undefined) ? data.weather : '',
          events: events_str,
          single_events: single_events_str,
          repeating_events: repeating_events_str,
          event_count: data.events.length,
          upcoming_events: upcoming_str
        }));
        this.show();
      },
      insertDateSelector: function(date_ymd) {
        var current_date = this.getDateFromYmd(date_ymd),
            dates = [],
            str = '',
            dt, label, value;

        var date_default = {
          label: '',
          value: '',
          selected: false
        };

        // build select menu
        for (var i = -4; i < 5; i++) {
          dt = new Date(current_date.getTime());
          dt.setDate(dt.getDate() + i);

          label = this.getMdYFromDate(dt);
          value = this.getYmdFromDate(dt);

          // add dates to array for template
          if (i === 0) {
            dates.push(_.extend({}, date_default, { label: 'Jump to Day', selected: true }));
            str += '<option selected="selected">Jump to Day</option>';
          } else {
            dates.push(_.extend({}, date_default, { label: label, value: value }));
            str += '<option value="' + value + '">' + label + '</option>';
          }
        }
        this._cal.getHeader().insertDateSelector(this.date_sel_template({
          dates: dates,
          options: str
        }));
      }
    });

    var HomeView = LW.lwCalendar.HomeView = function(cal) {
      this._cal     = cal;
      this.name     = 'home_view';
      this.is_today = false;

      // use day template if it exists, otherwise fall back to day template
      var $home_template = $('#lw_cal_home_template', $tmpl_wrapper);
      if ($home_template.length) {
        this.template = _.template($home_template.html());
      } else {
        this.template = _.template($('#lw_cal_day_template', $tmpl_wrapper).html());
      }

      // use home event template is it exists
      var $home_event_template = $('#lw_cal_home_event_template', $tmpl_wrapper);
      if ($home_event_template.length) {
        this.home_event_template = _.template($home_event_template.html());
      }
      var no_results_tmpl = '<div class="no"><p>No events found.</p></div>';
      this.no_results_tmpl = _.template(
        $('#lw_cal_no_results_template', $tmpl_wrapper).html() || no_results_tmpl
      );
    };

    HomeView.prototype.insertDateSelector = DayView.prototype.insertDateSelector;

    _.extend(HomeView.prototype, viewBase, {
      render: function(controller, view, data) {
        var that         = this,
            events_str   = "",
            events       = [],
            upcoming_str = "",
            event_template = this.home_event_template || this.event_template;

        this.is_today = data.is_today;
        this.setViewClass(view);
        this._cal.getHeader().setTitle(data.title);
        this._cal.getHeader().insertScrollLinks(data.prev_date, data.next_date);
        this.insertDateSelector(data.date);

        // reduce to array if an object was returned.  this happens the events and upcoming events are combined
        if ($.isPlainObject(data.events)) {
          _.each(data.events, function(val, key) {
            if ($.isArray(val)) {
              events = events.concat(val);
            }
          });
        } else {
          events = data.events;
        }

        // build day's event list
        if (events.length) {
          for (var i = 0; i < events.length; i++) {
            events_str += event_template( this.formatEventObject(events[i]) );
          }
        } else {
          events_str = this.no_results_tmpl({view: view});
        }

        // build upcoming event list
        _.each(data.upcoming_events, function(events, date_str) {
          var dt = that.getDateFromYmd(date_str);

          upcoming_str += '<h4>' + that.getFormattedListDate(dt) + '</h4>';

          for (var i = 0; i < events.length; i++) {
            upcoming_str += event_template( that.formatEventObject(events[i]) );
          }
        });

        var dt = this.getDateFromYmd(data.date);

        this.$events.html(this.template({
          month: this.month_names_short[dt.getMonth()],
          day: dt.getDate(),
          today_facts: '',
          weather: '',
          events: events_str,
          upcoming_events: upcoming_str
        }));
        this.show();
      }
    });

    //
    // List View - for Week and All Events
    //
    var ListView = LW.lwCalendar.ListView = function(cal) {
      var that = this,
          page_tmpl, no_results_tmpl;

      this._cal = cal;
      this.name = 'list_view';
      this.all_tmpl  = _.template($('#lw_cal_all_template', $tmpl_wrapper).html() || '{{ events }}');
      this.week_tmpl = _.template($('#lw_cal_week_template', $tmpl_wrapper).html() || '{{ events }}');

      page_tmpl = 'Showing {{ range }} events | <a href="#" class="lw_cal_next">Show {{ more }} more</a>';
      this.page_tmpl = _.template($('#lw_cal_pagination_template', $tmpl_wrapper).html() || page_tmpl);

      no_results_tmpl = '<div class="no"><p>No events found.</p></div>';
      this.no_results_tmpl = _.template(
        $('#lw_cal_no_results_template', $tmpl_wrapper).html() || no_results_tmpl
      );

      // pagination handler
      this.$body.on('click', '.lw_cal_pagination > a', function(e) {
        e.preventDefault();
        var show_all = ($(this).hasClass('lw_cal_all')) ? true : false;
        that.showMore(show_all);
        return true;
      });
    };

    _.extend(ListView.prototype, viewBase, {
      render: function(controller, view, data) {
        var cal  = this._cal,
            headline = data.title,
            events_obj;

        if (data.date && data.end_date) {
          headline = this.getDateRange(this.getDateFromYmd(data.start_date), this.getDateFromYmd(data.end_date));
        }

        this.setViewClass(view);
        this._cal.getHeader().setTitle(headline);

        if ('week' === view) {
          cal.getHeader().insertScrollLinks(data.prev_date, data.next_date);
          this.insertDateSelector(data.start_date);
        } else {
          cal.getHeader().clearScrollLinks();
          cal.getHeader().clearDateSelector();
        }

        var tmpl = ('week' === view) ? this.week_tmpl : this.all_tmpl;

        if ((data.events && !$.isEmptyObject(data.events))
            || (data.single_events && !$.isEmptyObject(data.single_events))
            || (data.repeating_events && !$.isEmptyObject(data.repeating_events))) {
          events_obj = {
            events: this.buildEventList(data.events),
            repeating_events: this.buildEventList(data.repeating_events),
            single_events: this.buildEventList(data.single_events)
          };
        } else {
          events_obj = {
            events: this.no_results_tmpl({view: view}),
            single_events: this.no_results_tmpl({view: view})
          };
        }

        // init pagination
        if (data.event_count > data.per_page) {
          this.page = 1;
          this.per_page = data.per_page;
          this.count = data.event_count;
          this.events = data.events;
          this.$pagination = $('<p/>').addClass('lw_cal_pagination pagination-controls');
          this.$body.append(this.$pagination);
          this.showPaginationMenu();
        }

        this.$events.html(tmpl(events_obj));
        this.show();
      },
      showPaginationMenu: function(show_all) {
        var pages = Math.ceil(this.count / this.per_page),
            pagination = '', more;

        // hide the pagination menu if this is the last page
        if (show_all || this.page === pages) {
          this.$pagination.hide();
          return;
        }

        // get remaining events if this is the second to last page
        more = this.per_page;

        // get remaining events if this is the second to last page, and last page has few than per_page amount
        if (this.page === pages - 1 && (this.count % this.per_page !== 0)) {
          more = this.count % this.per_page;
        }

        pagination = this.page_tmpl({
          range: (this.page * this.per_page) + ' of ' + (this.count),
          page: String(this.page + 1),
          more: String(more)
        });

        // add Show All if there's more than one page left, and the total is less than 400 (too expensive if more)
        if (this.count < 400 && (this.count - (this.page * this.per_page) > this.per_page)) {
          pagination += ' <a href="#" class="list-button caret-button lw_cal_all">Show All</a>';
        }
        this.$pagination.html(pagination);
      },
      showMore: function(show_all) {
        var that = this,
            url;

        this.$events.css({ opacity: 0.5 });
        this.page++;
        url = controller.getAjaxUrl() + '&page=' + this.page;
        if (show_all) url += '&show_all=1';

        $.ajax({
          url: url,
          dataType: 'json',
          success: function(data) {
            if (show_all) {
              that.events = data.events;
            } else {
              _.each(data.events, function(event_array, key) {
                if (that.events[key]) {
                  that.events[key] = that.events[key].concat(event_array);
                } else {
                  that.events[key] = event_array;
                }
              });
            }
            that.$events.html(that.buildEventList(that.events));
            that.showPaginationMenu(show_all);

            $body.trigger('calPaginate.lwcal', [controller, data]);

            that.$events.fadeTo(200, 1);
          }
        });
      },
      close: function(controller) {
        // clean up pagination markup and data
        if (this.$pagination && this.$pagination.length) {
          delete this.events; // this is a potentially large data structure
          this.$pagination.remove();
          delete this.$pagination;
        }
      },
      insertDateSelector: function(date_ymd) {
        var that = this,
            dates = [],
            str = '',
            curr_date = this.getDateFromYmd(date_ymd),
            start_date, end_date,
            label, value;

        var formatWeekDisplay = function(start_date, end_date) {
          if (start_date.getMonth() === end_date.getMonth()) {
            return that.month_names[start_date.getMonth()] + ' '
              + start_date.getDate() + '-'
              + end_date.getDate() + ', '
              + start_date.getFullYear();
          } else {
            if (start_date.getFullYear() === end_date.getFullYear()) {
              return that.month_names[start_date.getMonth()] + ' '
                + start_date.getDate() + ' - '
                + that.month_names[end_date.getMonth()] + ' '
                + end_date.getDate() + ', '
                + start_date.getFullYear();
            } else {
              return that.month_names[start_date.getMonth()] + ' '
                + start_date.getDate() + ', '
                + start_date.getFullYear() + ' - '
                + that.month_names[end_date.getMonth()] + ' '
                + end_date.getDate() + ', '
                + end_date.getFullYear();
            }
          }
        };
        var date_default = {
          label: '',
          value: '',
          selected: false
        };
        // build select menu
        for (var i = -4; i <= 4; i++) {
          if (i === 0) {
            dates.push(_.extend({}, date_default, { label: 'Jump to Week', selected: true }));
            str += '<option selected="selected">Jump to Week</option>';
          } else {
            start_date = new Date(curr_date.getFullYear(), curr_date.getMonth(), curr_date.getDate() + 7 * i);
            end_date = new Date(start_date.getFullYear(), start_date.getMonth(), start_date.getDate() + 6);
            label = formatWeekDisplay(start_date, end_date);
            value = this.getYmdFromDate(start_date);

            dates.push(_.extend({}, date_default, {
              label: label,
              value: value
            }));
            str += '<option value="' + value + '">' + label + '</option>';
          }
        }
        this._cal.getHeader().insertDateSelector(this.date_sel_template({
          dates: dates,
          options: str
        }));
      }
    });

    //
    // Month View
    //
    var MonthView = LW.lwCalendar.MonthView = function(cal) {
      this._cal = cal;
      this.name = 'month_view';
      this.template = _.template($('#lw_cal_month_template', $tmpl_wrapper).html());
      this.day_template = _.template($('#lw_cal_month_day_template', $tmpl_wrapper).html());

      // use a different event template for the month view.  use the standard one if the
      // month-specific one doesn't exist
      var $event_template = $('#lw_cal_month_event_template', $tmpl_wrapper);
      if ($event_template.length) {
        this.event_template = _.template($event_template.html());
      }
    };
    _.extend(MonthView.prototype, viewBase, {
      render: function(controller, view, data) {
        var that = this,
            month_str = '<tr>',
            week_days = this.day_names.slice(0),
            tmp_day;

        this.setViewClass(view);
        this._cal.getHeader().setTitle(data.title);
        this._cal.getHeader().insertScrollLinks(data.prev_date, data.next_date);
        this.insertDateSelector(data.date);

        var day_count = data.days.length;

        if (options.week_start_offset > 0) {
          for (var i = 0; i < options.week_start_offset; i++) {
            tmp_day = week_days.shift();
            week_days.push(tmp_day);
          }
        }

        _.each(data.days, function(day, i) {
          var events_str = "";

          // insert table row if eigth day and not first or last row
          if (i !== 0 && i + 1 !== day_count && i % 7 === 0) {
            month_str += '</tr><tr>';
          }

          // build event list
          _.each(day.events, function(event, i) {
            event = that.formatEventObject(event);

            // time string with hidden timezone and local time
            event.time = that.getEventTimeRange(event, true, true);

            events_str += that.event_template(event);
          });

          day.events = events_str;

          // append day cell
          month_str += that.day_template(day);
        });

        month_str += '</tr>';

        this.$events.html(that.template({
          week_days: '<th>' + week_days.join('</th><th>') + '</th>',
          days: month_str,
          events: this.buildEventList(data.events),
          repeating_events: this.buildEventList(data.repeating_events),
          single_events: this.buildEventList(data.single_events)
        }));

        // disable clicking day links if no day view
        if (_.includes(options.exclude_view, 'day')) {
          this.$events.off('click', '.lw_cal_date a');
          this.$events.on('click', '.lw_cal_date a', function() {
            return false;
          });
        }
        // hide events beyond limit set when day view present - we don't hide events
        // when no day view because there's no way to see all events in a day
        else {
          this.hideExcessEvents(data);
        }
        this.show();
      },
      insertDateSelector: function(date_ymd) {
        var current_date = this.getDateFromYmd(date_ymd.substring(0, 6) + '01'),
            dates = [],
            str = '',
            value, label;

        var date_default = {
          label: '',
          value: '',
          selected: false
        };

        // build select menu
        for (var i = -6; i <= 6; i++) {
          var dt = new Date(current_date.getTime());
          dt.setMonth(dt.getMonth() + i);

          label = this.month_names[dt.getMonth()] + ' ' + dt.getFullYear();
          value = this.getYmdFromDate(dt);

          if (i === 0) {
            dates.push(_.extend({}, date_default, { label: 'Jump to Month', selected: true }));
            str += '<option selected="selected">Jump to Month</option>';
          } else {
            dates.push(_.extend({}, date_default, {
              label: label,
              value: value
            }));
            str += '<option value="' + value + '">' + label + '</option>';
          }
        }
        this._cal.getHeader().insertDateSelector(this.date_sel_template({
          dates: dates,
          options: str
        }));
      },
      hideExcessEvents: function(data) {
        var limit = options.month_view_day_limit || 2;

        this.$events.find('td').each(function(index, td) {
          var $td        = $(td),
              $events    = $td.find('.lw_cal_event'),
              event_href = $td.find('.lw_cal_date a').attr('href'),
              event_count = (typeof data.days[index] !== 'undefined') ? data.days[index].event_count : 0,
              $visible;

          if (limit < $events.length) {
            $events.eq(limit - 1).nextAll().hide();
          }
          $visible = $events.filter(':visible');
          if (event_count && event_count > $visible.length) {
            $td.append($('<a />', {
              text: 'and ' + (event_count - $visible.length) + ' more...',
              href: event_href,
              'aria-label': 'and ' + (((event_count - $visible.length) > 1) ? (event_count - $visible.length) + ' more events' : '1 more event') + ' on this day...',
              'class': 'lw_cal_show_day'
            }));
          }
        });
      }
    });

    /*
     * SEO View
     */
    var SeoView = LW.lwCalendar.SeoView = function(cal) {
      this._cal = cal;
      this.name = 'seo_view';
    };
    _.extend(SeoView.prototype, viewBase, {
      render: function(controller, view, data) {
        $('head').append('<meta name="robots" content="noindex">');

        this.setViewClass(view);
        this._cal.getHeader().setTitle('All Upcoming Events');

        var str = '<ul>';
        _.each(data, function(event) {
          str += '<li><a href="' + event.href + '">'
               + event.title
               + '</a></li>';
        });
        str += '</ul>';
        this.$events.html(str);
        this.show();
      },
      close: function() {
        $('head meta[content="noindex"]').remove();
      }
    });

    //
    // Event View extends calView
    //
    var EventView = LW.lwCalendar.EventView = function(cal) {
      var that = this;

      this._cal = cal;
      this.name = 'event_view';
      this.$map = null;
      this.template = _.template($('#lw_cal_event_detail_template', $tmpl_wrapper).html());

      this.$body.on('click', '.lw_cal_event_tags a', function(e) {
        e.preventDefault();

        controller.setVar('view', 'all');
        controller.setVar('tags', $(this).text().toLowerCase());
        controller.load();

        return false;
      });

      this.$body.on('click', '.lw_cal_event_edit a', function(e) {
        e.preventDefault();
        var id = controller.getVar('event_id')[0],
            returl = encodeURIComponent(that.getEventUrl(id, ''));

        window.location = $(this).attr('href') + '&return_url=' + returl;

        return true;
      });

      // "Add to my calendar" click handler
      this.$events.on('click', '#lw_cal_add_to_calendar > a:not(.lw-direct-link)', function(e) {
        e.preventDefault();

        var $this = $(this),
            $ul   = $this.closest('#lw_cal_add_to_calendar').find('ul');

        e.preventDefault();

        if ($ul.is(':visible')) {
          $this.removeClass('lw_active');
        } else {
          $this.addClass('lw_active');
        }
        $ul.slideToggle(200);
        return true;
      });

      this.render = function(controller, view, data) {
        var that = this;
        var matches;

        // redirect to login if private event
        if (data && data.is_private) {
          if (LW.is_remote) {
            document.location.href=LW.remote_host+'/livewhale/?login&url='+window.location.href;
          } else {
            document.location.href='/livewhale/?login&url='+window.location.href;
          }
          return false;
        }

        // redirect if event details no longer accessible, which is also true when the event is hidden
        if (!data || !data.event || !data.event.title) {
          if (controller.history.length > 1) {
            controller.back();
          } else {
            controller.clearVars();
            controller.load();
          }
          return true;
        }

        // replace with webp image if browser and server support it
        if (LW.lib.hasWebPSupport()) {
          if (0 !== data.event.image_src.indexOf('http') && 0 !== data.event.image_src.indexOf('//') && data.event.image_src.match(/\.jpe?g$/i)) {
            data.event.image_src = data.event.image_src.replace(/\.jpe?g$/i, '.webp');
          }
        }

        // redirect if url present
        if (data.event.url) {
          // if url is path to event's live url, then extract event id and load
          // otherwise redirect the browser to what we assume is an external url
          if (0 === data.event.url.indexOf(LW.liveurl_dir + '/events/')) {
            matches = data.event.url.match(/\/events\/(\d+)/);

            if ($.isNumeric(matches[1])) {
              controller.setVar('event_id', matches[1]);
              controller.load(null, true, true); // third param excludes replacement from history
            }
          } else {
            window.location.href = data.event.url;
          }
        }

        var evt = data.event;

        if (!use_history_api || !controller.is_first_load) {
          this.updateMetaData(evt);
        }

        // add logged in status to data
        evt.logged_in = LW.logged_in;

        evt.date_range = '';
        if (data.event.ts_start) {
          evt.date_range = this.getDateRangeFromTimestamps(evt.ts_start, evt.ts_end, evt.tz_offset, evt.tz2_offset);
        }

        evt.date_title = this.getWeekDayAndDateFormatFromTimestamp(evt.ts_start, evt.tz_offset);

        var start_cal_date = new CalDate(evt.ts_start, evt.tz_offset);
        evt.date_start = start_cal_date.getShortDateString();
        evt.date_start_day = start_cal_date.getFormattedDate('d');
        evt.date_start_month = start_cal_date.getFormattedDate('F');
        evt.date_start_month_short = start_cal_date.getFormattedDate('M');
        evt.date_start_year = start_cal_date.getFormattedDate('Y');
        evt.date_start_day_of_week = start_cal_date.getFormattedDate('l');
        evt.time       = this.getEventTimeRange(evt);
        evt.time_start = start_cal_date.getTimeString();
        evt.datetime_start = start_cal_date.getFormattedDate('o-m-dTH:i');

        // set end date and time values if ts_end
        if (evt.ts_end && evt.tz2_offset) {
          var end_cal_date = new CalDate(evt.ts_end, evt.tz2_offset);
          evt.date_end = end_cal_date.getShortDateString();
          evt.date_end_day = end_cal_date.getFormattedDate('d');
          evt.date_end_month = end_cal_date.getFormattedDate('F');
          evt.date_end_month_short = end_cal_date.getFormattedDate('M');
          evt.date_end_year = end_cal_date.getFormattedDate('Y');
          evt.date_end_day_of_week = end_cal_date.getFormattedDate('l');

          evt.time_end = end_cal_date.getTimeString();
          evt.datetime_end = end_cal_date.getFormattedDate('o-m-dTH:i');
        }

        this.setViewClass(view);
        cal.getHeader().setTitle(evt.date_range);
        cal.setDocumentTitle($('<p>' + evt.title + '</p>').text());
        cal.getHeader().showBackLink();
        cal.getHeader().clearDateSelector();

        // add ical download link
        if (LW.is_remote) {
          evt.ical_download_href = LW.remote_host;
        } else {
          evt.ical_download_href = '//' + window.location.hostname;
        }
        evt.ical_download_href += LW.liveurl_dir + '/ical/events/id/' + evt.id;
        evt.ical_all_series = evt.ical_download_href;
        evt.ical_download_href += '/hide_repeats/true';
        evt.add_to_google = that.getAddToGoogleLink(evt);
        evt.add_to_yahoo  = ''; // leave for BC

        evt.date_time = that.getEventDetailTimeRange(evt);
        evt.day_of_week = that.getDayOfWeek(evt);

        // add share_links
        var share_links = this.getSaveAndShareLinks(evt.title, evt.summary, evt.image_src, start_cal_date);
        var $share_template = $('#lw_cal_event_share_icons', $tmpl_wrapper);
        if ($share_template.length) {
          var share_template = _.template($share_template.html());
          evt.share_links = share_template(share_links);
        } else {
          evt.share_links = this.getDefaultSaveAndShareLinks(share_links);
        }

        // add related_content
        if (!_.isEmpty(evt.related_content)) {
          // prepend remote_host to href if it exists
          if (LW.remote_host) {
            evt.related_content = _.map(evt.related_content, function(obj) {
              if (!obj.href.match(/^http/)) {
                obj.href = LW.remote_host + obj.href;
              }
              return obj;
            });
          }
          // get markup
          var $related_template = $('#lw_cal_event_related_content', $tmpl_wrapper);
          if ($related_template.length) {
            var related_template = _.template($related_template.html());
            var related_content = '';
            _.each(evt.related_content, function(item) {
              related_content += related_template(item);
            });
            evt.related_content = related_content;
          } else {
            evt.related_content = this.getDefaultRelatedContent(evt.related_content);
          }
        }

        // build comma separated category link list
        if (evt.search_categories) {
          evt.categories = evt.search_categories.split('|'); // so can use category array in template too
          var categories = _.map(evt.categories, function(val) {
            val = $.trim(val);
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/categories/' + encodeURIComponent(val) + '">' + val + '</a>';
          });
          evt.search_categories = categories.join(', '); // keep for legacy support
        }
        // add classes string for each category type
        if (_.isArray(evt.category_classes)) {
          evt.category_classes = evt.category_classes.join(' ');
        }
        if (_.isArray(evt.category_audience_classes)) {
          evt.category_audience_classes = evt.category_audience_classes.join(' ');
        }
        if (_.isArray(evt.category_campus_classes)) {
          evt.category_campus_classes = evt.category_campus_classes.join(' ');
        }
        // add link string for each category type
        if (_.isArray(evt.categories)) {
          var category_links = _.map(evt.categories, function(cat) {
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/categories/' + encodeURIComponent(cat) + '">' + cat + '</a>';
          });
          evt.category_links = category_links.join(', ');
        }
        if (_.isArray(evt.categories_audience)) {
          var category_audience_links = _.map(evt.categories_audience, function(cat) {
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/categories/' + encodeURIComponent(cat) + '">' + cat + '</a>';
          });
          evt.category_audience_links = category_audience_links.join(', ');
        }
        if (_.isArray(evt.categories_campus)) {
          var category_campus_links = _.map(evt.categories_campus, function(cat) {
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/categories/' + encodeURIComponent(cat) + '">' + cat + '</a>';
          });
          evt.category_campus_links = category_campus_links.join(', ');
        }

        // build comma separated tag link list
        if (_.isArray(evt.tags_calendar)) {
          evt.tags = evt.tags_calendar; // so we can use tags array in template too
          var tags = _.map(evt.tags, function(val) {
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/tags/' + encodeURIComponent(val) + '">' + val + '</a>';
          });
          evt.tags_calendar = tags.join(', ');
        }
        if (_.isArray(evt.tags_global_calendar)) {
          evt.tags = evt.tags_global_calendar; // so we can use tags array in template too
          var tags = _.map(evt.tags, function(val) {
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/tags/' + encodeURIComponent(val) + '">' + val + '</a>';
          });
          evt.tags_global_calendar = tags.join(', ');
        }
        if (_.isArray(evt.tags_starred_calendar)) {
          evt.tags = evt.tags_starred_calendar; // so we can use tags array in template too
          var tags = _.map(evt.tags, function(val) {
            return '<a class="lw_cal_app_link" href="' + hashbang + 'view/all/tags/' + encodeURIComponent(val) + '">' + val + '</a>';
          });
          evt.tags_starred_calendar = tags.join(', ');
        }

        // there is an import condition that can cause the summary and description to be set to the same string
        // check whether they're the same, and show only the description if that's the case
        if (evt.summary && evt.description && evt.summary === evt.description) {
          evt.summary = '';
        }

        // add host to image srcset attributes if CORS
        if (evt.description && LW.remote_host) {
          evt.description = this.addHostToSrcSetFilter(evt.description, LW.remote_host);
          evt.description = this.addHostToLinks(evt.description, LW.remote_host);
        }

        // load a slideshow gallery
        if (evt.image) {
          // set template based gallery if template exists
          var $images_template = $('#lw_cal_event_images_template', $tmpl_wrapper);
          if ($images_template.length) {
						var html=$images_template.html();
						if (html.match(' src ')) { // upgrade old style template
							html='<div class="lw_event_image">{{ image }}</div>';
						}
						var images_template = _.template(html);
          }
        }

        // output event details
        this.event_data = evt;

        // supply blank base values for all utilized template vars
        var template_vars = [];
        $.each($tmpl_wrapper.html().match(/{{\s*[\w\d_-]+\s*}}/g), function(i, el) {
          el = $.trim(el.substring(2, el.length - 2));
          template_vars[el] = '';
        });

        this.$events.html(that.template( _.extend(template_vars, evt, viewHelpers) ));

        // add has hero class if hero present
        if (this.$el.find('#lw_cal_hero').length) {
          this.$el.addClass('lw_cal_has_hero');
        }

        // initialize any widgets in events view
        this.$events.find('.lw_widget').each(function(i, el) {
          LW.lib.initWidget(el);
        });

        if (evt.location_latitude && evt.location_longitude) {
          var $map = this.$events.find('.lw_cal_event_detail_map');
          var aspect_ratio = ($map.attr('data-aspect-ratio')) ? $map.attr('data-aspect-ratio') : '1:1';

          // call map embed plugin
          $map.lwGoogleMapsEmbed({
            api_key: (LW.is_remote) ? livewhale.calendar.maps_api_key : livewhale.maps_api_key,
            latitude: evt.location_latitude,
            longitude: evt.location_longitude,
            aspect_ratio: aspect_ratio
          });
        }

        // init reg form
        if (evt.has_registration) {
          LW.payments.init();
        }
        this.show();

        // load resources for the event image gallery as defined in galleries_inline.default.xml
        // this runs whenever the event view is loaded and the event has images
				$('.lw_gallery').each(function() {
          // load js if it's not already loaded
					$('.lw_widget_resources_js').each(function() {
            LW.lib.loadJS($(this).attr('data-href'));
					});
					// load css if it's not already loaded
					$('.lw_widget_resources_css').each(function() {
						LW.lib.loadCSS($(this).attr('data-href'));
					});
				});

        // show g-plus1 icon
        if (typeof gapi !== 'object') {
          this.loadPlusOneJS();

          var gapi_interval_id = setInterval(function() {
            if (typeof gapi === 'object') {
              gapi.plusone.go(that.$events.get(0));
              clearInterval(gapi_interval_id);
            }
          }, 200);
        } else {
          gapi.plusone.go(this.$events.get(0));
        }

        // add Disqus comments if shortname present
        if (livewhale.disqus_shortname) {
          window.disqus_shortname = livewhale.disqus_shortname;
          window.disqus_identifier = 'lwcal_' + livewhale.disqus_shortname + '_' + evt.id;
          window.disqus_url = window.location.origin + '/live/events/' + evt.id;
          window.disqus_title = evt.title + ' / ' + evt.date_range;

          if (window.DISQUS) {
            window.DISQUS.reset({ reload: true });
          } else {
            var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
            dsq.src = 'http://' + livewhale.disqus_shortname + '.disqus.com/embed.js';
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
          }
        }

        // support widgets inside event descriptions that require external JS/CSS
        var description = $('<div>' + evt.description + '</div>');
        var metadata = description.find('.lw_widget_metadata');
        var loaded = [];
        if (metadata.length) {
          $.each(metadata.find('.lw_widget_resources_js'), function() {
            if ($.inArray($(this).attr('data-href'), loaded) === -1) {
              $body.append('<script src="'+$(this).attr('data-href')+'"></script>');
              loaded[loaded.length]=$(this).attr('data-href');
            }
          });
          $.each(metadata.find('.lw_widget_resources_css'), function() {
            if ($.inArray($(this).attr('data-href'), loaded) === -1) {
              $body.append('<link rel="stylesheet" type="text/css" href="'+$(this).attr('data-href')+'" />');
              loaded[loaded.length]=$(this).attr('data-href');
            }
          });
          metadata.remove();
        }
      };

      this.loadPlusOneJS = function() {
        $body.append('<script type="text/javascript" size="small" src="https://apis.google.com/js/plusone.js">{"parsetags": "explicit"}</script>');
      };

      this.close = function(controller) {
        // wipe event_id when leaving detail page
        if (controller.getView() !== options.event_view_name) {
          controller.clearVar('event_id');
        }
        // remove has her class
        this.$el.removeClass('lw_cal_has_hero');
      };
    };

    _.extend(EventView.prototype, viewBase, {
      updateMetaData: function(data) {
        data = data || {};
        var start_date;
        var end_date;

        if (data.ts_start) {
          start_date = new Date(parseInt(data.ts_start, 10) * 1000);
        }

        var description = data.summary;
        if (!description && data.description) {
          description = data.description.substring(0, 128);
        }

        // add open graph meta tags
        var og_props = {
          title: data.title,
          type: 'event',
          start_time: start_date.toISOString(),
          description: description,
          url: window.location.href
        };
        if (data.ts_end) {
          end_date = new Date(parseInt(data.ts_end, 10) * 1000);
          og_props.end_time = end_date.toISOString();
        }
        // add image if it exists
        if (data.images && data.images.length) {
          var img = data.images[0];
          og_props.image = img.src;
          og_props['image:width'] = img.width;
          og_props['image:height'] = img.height;
        }
        var $head = $('head');

        // remove existing og tags
        $head.find('meta[property^="og:"]').remove();

        _.each(og_props, function(val, key) {
          if (val) {
            val = $('<p>' + val + '</p>').text();

            $head.append('<meta property="og:' + key + '" content="' + val + '">');

            // updat description meta tag also
            if (key === "description") {
              var $descr = $head.find('meta[name="description"]');
              if ($descr.length) {
                $descr.attr('content', val);
              } else {
                $head.append('<meta name="description" content="' + val + '">');
              }
            }
          }
        });

      },
      getEventData: function() {
        return this.event_data;
      },
      getCalendarEmbedShareLink: function() {
        var link;
        if (LW.is_remote) {
          link = LW.remote_host;

          // the client sometimes sends the remote host starting with double slashes
          if (link.match(/^\/\//)) {
            link = 'http:' + link;
          }
        } else {
          link = window.location.protocol + '//' + window.location.hostname;
        }
        link += LW.liveurl_dir + '/events/calendar-embed/' + controller.getVar('event_id')[0];
        return link;
      },
      getFacebookShareLink: function() {
        var url = window.location.href;
        // use calendar-embed if this is a CORS calendar or if it doesn't use pushstate
        if (!use_history_api || LW.is_remote) {
          url = this.getCalendarEmbedShareLink();
        }
        return 'https://www.facebook.com/sharer.php?u=' + encodeURIComponent(url);
      },
      getTwitterShareLink: function(title, dt) {
        var url = window.location.href;
        var status = this.month_names_short[ dt.getMonth()  ] + ' ' + dt.getDate() + ', ' + title;
        return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(status)
          + '&url=' + encodeURIComponent(url);
      },
      getSaveAndShareLinks: function(title, summary, image, dt) {
        return {
          facebook: this.getFacebookShareLink(),
          twitter: this.getTwitterShareLink(title, dt)
        };
      },
      getDefaultSaveAndShareLinks: function(links) {
        var html, icons;
        icons = {
          twitter: 'lw-icon-twitter-square',
          facebook: 'lw-icon-facebook-square',
          permalink: 'lw-icon-link',
          email: 'lw-icon-envelope-o'
        };

        html = '<div class="lw_widget_saveandshare"><ul>';

        $.each(['twitter', 'facebook', 'email', 'permalink'], function(i, val) {
          var url = links[val] || '#',
              icon = icons[val] || '';

          html += '<li class="lw_item_' + (i + 1) + ' ' + val + '">'
                + '<a href="' + url + '" target="_blank" aria-label="Share via ' + val + '">'
                + '<span class="' + icon + ' lw-icon-2x"></span>'
                + '<span class="lw_sr_only">' + val + '</span>'
                + '</a>'
                + '</li>';
        });
        html += '</ul></div>';
        return html;
      },
      getDefaultRelatedContent: function(items) {
        if (!_.isArray(items) || !items.length) return '';

        var str = '<ul>';

        _.each(items, function(item) {
          str += '<li class="lw_related_' + item.type;
          // add class
          if (item.doc_type) {
            str += ' ' + item.doc_type.toLowerCase();
          }
          str += '">';
          if (item.image_src) {
            str += '<img src="' + item.image_src + '"/>';
          }
          str += '<a href="' + item.href + '" target="_blank">' + item.title;
          if (item.doc_type) {
            str += ' <span>(' + item.doc_type + ')</span>';
          }
          str += '</a>'
               + '</li>';
        });
        str += '</ul>';
        return str;
      },
      getEventDetailTimeRange: function(e) {
        var diff_local_tz  = (e.user_offset && e.tz_offset !== e.user_offset),
            dt_start, dt_end, str;

        // start time
        dt_start = new CalDate(e.ts_start, e.tz_offset);
        dt_end   = (e.ts_end) ? new CalDate(e.ts_end, e.tz2_offset) : null;

        // include dates if
        if (!e.is_all_day &&
           (dt_end && (dt_start.getMonth() !== dt_end.getMonth() || dt_start.getDate() !== dt_end.getDate()))) {
          str = '<span class="lw_cal_time_range">'
              + dt_start.getTimeString(e.tz_format)
              + ' to '
              + dt_end.getTimeString(e.tz_format)
              + '</span> '
              + this.getDateRange(dt_start, dt_end);

          if (!options.disable_timezone && (!options.hide_local_timezone || diff_local_tz)) {
            str += ' <span class="lw_cal_tz_abbrv">' + e.tz_abbrv + '</span>';
          }
        } else {
          str = this.getEventTimeRange(e);
        }
        return str;
      },
      getDayOfWeek: function(e) {
        var result = '',
            dt_start, dt_end;

        // start time
        dt_start = new CalDate(e.ts_start, e.tz_offset);
        dt_end   = (e.ts_end) ? new CalDate(e.ts_end, e.tz2_offset) : null;

        if (!dt_end || (dt_start.getMonth() === dt_end.getMonth() && dt_start.getDate() === dt_end.getDate())) {
          result = this.day_names[ dt_start.getDay() ];
        }
        return result;
      }
    });

    // container, manages interactions between all other views
    //var CalView = function() {
    var calView = LW.lwCalendar.calView = _.extend({}, viewBase, {
      init: function() {
        var that = this,
            $sidebar = $('#lw_cal_sidebar', $wrapper),
            first_load = true;

        // init header view
        this.header = new HeaderView();

        if (false !== options.show_view_menu) {
          new ViewMenu(this);
        }

        // show the sidebar unless show option false
        if (!options.show_sidebar) {
          $('#lw_cal_sidebar').hide();
        }

        // insert search
        var $search = $('#lw_cal_search');
        if ($search.length) {
          var search_tmpl = _.template($('#lw_cal_search_template', $tmpl_wrapper).html());
          $search.replaceWith(search_tmpl());
        }

        // insert subscribe
        var $subscribe = $('#lw_cal_subscribe');
        if ($subscribe.length) {
          var subscribe_tmpl = _.template($('#lw_cal_subscribe_template', $tmpl_wrapper).html());
          $subscribe.replaceWith(subscribe_tmpl());
        }

        // set now showing template
        this.showing_template = _.template($('#lw_cal_showing_template', $tmpl_wrapper).html());

        this._month_view = null;
        this._home_view  = null;
        this._day_view   = null;
        this._list_view  = null;
        this._event_view = null;
        this._seo_view   = null;
        this._feed_view = null;
        this._view       = null; // current view
        this._prev_view  = null; // previous view

        this.$now_showing = $('#lw_cal_showing');

        // cache ref to canonical element, add if one doesn't exist on page
        var $canonical = $('link[rel="canonical"]');
        if (!$canonical.length) {
          $canonical = $('<link rel="canonical" href="' + document.location.href + '"/>').appendTo($('head'));
        }

        // save document title
        this.page_title = (document.title.indexOf('/') === -1)
          ? document.title
          : document.title.substr(0, document.title.indexOf('/')).trim();

        $body.on('calBeforeChange.lwcal', function(evt, controller, view, data) {
          that.$events.addClass('lw_cal_loading');

          // call current view obj's close method if defined - it's about to be replaced
          if (that._view && $.isFunction(that._view.close)) {
            that._view.close(controller);
          }
          // remove search if loading view other than 'all' when search_all_events_only set
          if (options.search_all_events_only && controller.getView() !== 'all') {
            controller.clearVar('search');
            controller.clearVar('end_date');
          }
        });

        // get default og:image
        //var $og_image = $('head meta[property="og:image"]');
        var $og_image = $('head meta[property="og:image"],head meta[name="og:image"]');
        this.default_og_image = ($og_image.length) ? $og_image.attr('content') : null;

        // add class to header if no sidebar
        if (!options.show_sidebar) this.$el.addClass('no_sidebar');

        // handler calls render method on appropriate view object
        $body.on('calChange.lwcal', function(evt, controller, view, data) {
          that._view = that.getViewObjectFromViewName(view);

          // remove spinner on first load
          if (first_load) {
            $wrapper.find('.lw_spinner').remove();
          }

          // if switching views, cleanup by calling view object's close function
          if (that._prev_view && that._prev_view.name !== that._view) {
            $body.trigger('calViewClose.lwcal', [that._prev_view]);
          }
          that._prev_view = that._view; // set current view object as previous for next change

          // render appropriate view
          that._view.render(controller, view, data);

          // modify canonical url
          $canonical.attr('href', window.location.href);

          // fix images on remote calendar's event view - needed on detail view and list views to enable {{ image_raw }}
          if (LW.is_remote) {
            that._view.$el.find('img').each(function() {
              var $this = $(this),
                  src = $this.attr('src');

              // prepend remote host if src starts with / and not //
              if (src.charAt(0) === '/' && (src.length === 1 || src.charAt(1) !== '/')) {
                $this.attr('src', LW.remote_host + src);
              }
            });
          }

          // add edit links
          if (LW.logged_in) {
            that.$events.find('.lw_cal_event').each(function() {
              var $this  = $(this),
                  $title = $this.find('.lw_events_title'),
                  id     = $this.attr('data-id'),
                  returl = encodeURIComponent(that.getEventUrl($this.attr('data-id'), $title.text())),
                  url    = '/livewhale/?events_edit&id=' + id + '&return_url=' + returl,
                  link   = '<a href="' + url + '" class = "lw_cal_edit_link"><i class="lw-icon-edit lw-icon-fw"></i><span class="lw_sr_only">Edit this event</span></a>';
              $title.append(link);
            });
          }

          that.renderNowShowing(controller);

          // set the document title here if this is not an event
          if (view !== options.event_view_name) {
            that.setDocumentTitle();
          }

          // trigger calendar load event
          $body.trigger('calLoad.lwcal', [controller, data]);

          first_load = false;
        });

        // register handler for opening details.
        this.$events.on(
          'click',
          '.lw_cal_event_list a:not(.lw_cal_edit_link,.lw_cal_location_link,.lw_cal_app_link,.external_url)',
          that.clickEventHandler
        );

        // handler for time click
        this.$events.on('click', '.tz_editable', function(e) {
          e.preventDefault();

          var $this = $(this);

          // return if the plugin is attached to this element
          // this allows plugin to close currrently open hoverbox
          if ($this.hasClass('lwui-widget')) return true;

          e.stopPropagation();

          tzDialog.open($this);
        });

        // Jump to calendar select
        $body.on('change','#lw_cal_calendar select', function() {
          var val = $(this).val();
          if (!val) return;

          if (LW.is_remote) {
            if (val === 'Main Calendar') {
              controller.clearVar('groups');
            } else {
              controller.setVar('groups', val);
            }
            controller.load();
          } else {
            document.location = val;
          }
        });

        // set selected group in
        $body.on('calInit.lwcal', function() {
          var groups = controller.getVar('groups'),
              $calendar_sel = $('#lw_cal_calendar select');

          if (groups.length === 1 && $calendar_sel.length) {
            $calendar_sel.val(groups[0]);
          }
        });


        // scroll to top of calendar when changing views
        $body.on('calLoad.lwcal', function(e, controller) {
          var body_padding = parseInt($('body').css('padding-top'));
          var calendar_position = $wrapper.offset().top - body_padding;
          var scroll_top =  $(document).scrollTop();
          var $lw_page = $('#lw_page');

          // account for #lw_page margin top when logged in
          if ($lw_page.length) {
            calendar_position = calendar_position - parseInt($lw_page.css('margin-top'));
          }

          // move to top of calendar if event top is not visible
          if (scroll_top > calendar_position) {
            $('html, body').animate({
              scrollTop: calendar_position
            }, 250);
          }

          // initialize video, accordions, SAS, and captcha in event detail view
          if (controller.getView() === options.event_view_name) {
            livewhale.frontend.initVideo(that.$events);

            // init accordions if plugin present
            if ($.lw.accordion) {
              $('.lw_accordion').lw_accordion();
            }
            if ($.fn.saveandshare) {
              $('.lw_widget_saveandshare .email a').saveandshare({host: LW.remote_host});
            }
            that.$events.initFrontendRegion();
          }

          return true;
        });

        // show sidebar box below search on month view, and add handler for removing it
        if (options.sidebar === 'default') {
          $('#lw_cal_search', $sidebar).on('click', function() {
            $sidebar.addClass('lw_cal_sidebar_visible');

            // hide sidebar and remove this handler when user clicks outside sidebar
            $body.on('click', function(e) {
              if (!$(e.target).closest('#lw_cal_sidebar').length) {
                $sidebar.removeClass('lw_cal_sidebar_visible');
                $(this).off(e);
              }
              return true;
            });
          });
        } else if (options.sidebar === 'original') {
          $sidebar.addClass('lw_cal_sidebar_hidden');
          $wrapper.addClass('lw_cal_original_sidebar');

          // show sidebar box below search on month view, and add handler for removing it
          $('#lw_cal_search', $sidebar).on('click', function() {
            if ($wrapper.hasClass('lw_cal_month_view')) {
              $sidebar.removeClass('lw_cal_sidebar_hidden');

              // hide sidebar and remove this handler when user clicks outside sidebar
              $body.on('click', function(e) {
                if (!$(e.target).closest('#lw_cal_sidebar').length) {
                  $sidebar.addClass('lw_cal_sidebar_hidden');
                  $(this).off(e);
                }
                return true;
              });
            }
          });
        }
        this.initEventHandlers();
        this.initEditDialog();
      },
      getViewObjectFromViewName: function(name) {
        var result;

        // get view object
        switch (name) {
          case 'home':
            result = this.getHomeView();
            break;
          case 'today':
          case 'day':
            result = this.getDayView();
            break;
          case 'all':
          case 'week':
            result = this.getListView();
            break;
          case 'month':
            result = this.getMonthView();
            break;
          case options.event_view_name:
            result = this.getEventView();
            break;
          case 'seo':
            result = this.getSeoView();
            break;
          case 'feed_builder':
            result = this.getFeedBuilderView();
            break;
          default:
            // hmm
        }
        return result;
      },
      clickEventHandler: function(evt) {
        var $this  = $(this);
        var $event = $this.closest('.lw_cal_event');
        var href = $this.attr('href');
        var href_test = $this.attr('href');

        // remove calendar path portion of url if pushstate calenar
        if (calendar_path && href_test.indexOf(calendar_path) === 0) {
          href_test = href_test.substr(calendar_path.length);
        }
        // remove hashbang
        href_test = href_test.replace(/^(\/?#!?)/, '');

        var href_pieces = href_test.split('/');

        // go to url if this isn't a calendar link
        if (href_pieces && href_pieces[0] !== 'view' && !_.includes(options.valid_views, href_pieces[0])) {
          // determine whether link is to an external site
          // only match tld and domain because calendars often exist on a site's subdomain
          if (!LW.lib.hasCurrentDomainAndTld(href)) {
            evt.preventDefault();
            window.open(href);
          }
          return true;
        }

        // if this is a calenar link, then set vars and call load()
        evt.preventDefault();

        var event_id;
        if (use_history_api) {
          if (href_pieces.length === 2) {
            event_id = href_pieces[1];
          }
        } else {
          // try to get href and date from link with data-date attribute if one exists
          var date;
          if ($event.length) {
            var $a = $event.find('a[data-date]');

            if ($a.length) {
              href = $a.attr('href');
              date = $a.attr('data-date');
            }
          }
          var event_id_match = href.substr(href.lastIndexOf('/') + 1).match(/^\d+/);

          if (event_id_match && event_id_match.length === 1) {
            event_id = event_id_match[0];
          }
        }

        if (event_id) {
          controller.clearVars();
          controller.setVar('event_id', event_id);
          controller.setVar('view', 'event');
          if (date) {
            controller.setVar('date', date);
          }
          controller.load();
        }
        return true;
      },
      getView: function() {
        return this._view;
      },
      getMonthView: function() {
        if (null === this._month_view) {
          this._month_view = new MonthView(this);
        }
        return this._month_view;
      },
      getHomeView: function() {
        if (null === this._home_view) {
          this._home_view = new HomeView(this);
        }
        return this._home_view;
      },
      getDayView: function() {
        if (null === this._day_view) {
          this._day_view = new DayView(this);
        }
        return this._day_view;
      },
      getListView: function() {
        if (null === this._list_view) {
          this._list_view = new ListView(this);
        }
        return this._list_view;
      },
      getSeoView: function() {
        if (null === this._seo_view) {
          this._seo_view = new SeoView(this);
        }
        return this._seo_view;
      },
      getEventView: function() {
        if (null === this._event_view) {
          this._event_view = new EventView(this);
        }
        return this._event_view;
      },
      getFeedBuilderView: function() {
        if (null === this._feed_view) {
          this._feed_view = new FeedBuilderView(this);
        }
        return this._feed_view;
      },
      getDefaultOgImage: function() {
        return this.default_og_image;
      },
      getHeader: function() {
        return this.header;
      },
      setDocumentTitle: function(title) {
        if (!controller.is_first_load) {
          title = title || this.header.getTitle();
          document.title = this.page_title + (title ? ' / ' + title : '');
        }
      },
      renderNowShowing: function(cal) {
        var template = this.showing_template;
        var search_str = (cal.getVar('search').length) ? cal.getVar('search')[0] : '';
        var is_all_view  = (cal.getView() === 'all');
        var filters = [];
        var filter_names = [
          'tags',
          'categories',
          'locations',
          'groups',
          'campus',
          'audience'
        ];

        _.each(filter_names, function(filter) {
          var values = cal.getVar(filter);
          if (values.length) {
            filters.push({
              name: filter,
              values: values
            });
          }
        });

        var dt1 = cal.getVar('date');
        var start_date, end_date;
        if (is_all_view && dt1.length) {
          start_date = this.getDateFromYmd(dt1[0]);
          var dt2 = cal.getVar('end_date');
          if (dt2.length) {
            end_date = this.getDateFromYmd(dt2[0]);
          }
        }

        var only_online = cal.getVar('only_online').length ? true : false;

        if (filters.length || search_str || start_date || only_online) {
          this.$now_showing.html(
            template($.extend({
              filters: filters,
              search_str: search_str,
              only_online: only_online,
              start_date: start_date,
              end_date: end_date,
            }, viewHelpers))
          ).show();
        } else {
          this.$now_showing.hide();
        }
        return true;
      },
      initEventHandlers: function() {
        var that = this;

        // link for opening feed builder with current state of calendar
        this.feed_builder_vars = {};
        $body.on('click', '.lw_build_feed_from_calendar', function(e) {
          e.preventDefault();
          that.feed_builder_vars = controller.vars;
          window.location.hash = '#view/feed_builder';
          return true;
        });

        // calendar app links navigate to calendar state in anchor's href
        $body.on('click', '.lw_cal_app_link', function(evt) {
          evt.preventDefault();
          var url = $(this).attr('href');

          controller.setVarsInRelativeUrl(url);
          controller.load();
          return true;
        });

        // search
        var $search_form = $('#lw_cal_search_form').off('submit').on('submit', function(evt) {
          evt.preventDefault();

          var $input = $(this).find('input[type="text"],input[type="search"]'),
              search_text = $input.val().replace(/>/g, '&gt;').replace(/</g, '&lt;'); // quickly sanitize value for XSS

          if (!search_text && controller.getVar('search').length) {
            controller.clearVar('search');
          }
          if (search_text) {
            controller.setVar('search', search_text);
          }

          // show results in all events view if we're on an event, or search_all_events_only option is true
          if (options.search_all_events_only || controller.getView() === options.event_view_name) {
            controller.setVar('view', 'all');
          }

          if ($search_form.find('.lw_skip_link').length == 0) {
            $search_form.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');
          }

          controller.load();

          return false;
        });

        // set search field when on view
        $body.on('calChange.lwcal', function(e, controller) {
          var search = controller.getVar('search');
          var val = (search.length) ? search[0] : '';
          $search_form.find('input[type="text"],input[type="search"]').val(val);
        });

        // this is a legacy option to support clients who set their search placeholder with this option
        // we now recommend setting this by editing the search markup in the template
        if (options.placeholder) {
          $('#lw_cal_search').attr('placeholder', options.placeholder);
        }

        // use hash string in 'lw_cal_date a' link to set calendar state
        // we set the values in the s
        this.$events.on('click', '.lw_cal_date a', function(evt) {
          evt.preventDefault();

          controller.setVarsInRelativeUrl($(this).attr('href'));
          controller.load();

          return true;
        });

        // had to separate this from '.lw_cal_date a', because we turn that off in month only view
        this.$events.on('click', '.lw_cal_show_day', function(evt) {
          evt.preventDefault();
          controller.setVarsInRelativeUrl($(this).attr('href'));
          controller.load();
          return true;
        });

        this.$events.on('click', 'a.lw_cal_show_all_categories', function(evt) {
          evt.preventDefault();
          controller.vars.categories = []; // reset categories
          controller.load();
          return true;
        });

        this.$events.on('click', 'a.lw_cal_show_all_calendars', function(evt) {
          evt.preventDefault();
          controller.vars.calendars = []; // reset calendars
          controller.load();
          return true;
        });

        this.$events.on('click', 'a.lw_cal_show_all_events', function(evt) {
          evt.preventDefault();
          controller.setVar('view', 'all'); // switch to all view
          controller.load();
          return true;
        });

        this.$events.on('click', 'a.lw_paginate_more, a.lw_paginate_total', function(evt) {
          evt.preventDefault();

          if ($(evt.target).hasClass('lw_paginate_total')) {
            controller.setVar('more', 'all');
          } else {
            // increment more value, and reload
            var more = controller.getVar('more');
            controller.setVar('more', (more.length) ? parseInt(more[0], 10) + 1 : 2);
          }
          // load the page with new more value
          controller.load();

          return true;
        });

        $body.on('click', 'a.lw_cal_location_link', function(e) {
          e.preventDefault();

          var $curr_target = $(e.currentTarget),
              $target      = $(e.target),
              latitude     = $curr_target.attr('data-latitude'),
              longitude    = $curr_target.attr('data-longitude'),
              $map;

          // return if the plugin is attached to this element
          // this allows plugin to close currrently open hoverbox
          if ($target.hasClass('lwui-widget')) return true;

          e.stopPropagation();

          $map = $('<div/>').attr('id', 'lw_cal_location_map');

          $target.hoverbox({
            position: 'left',
            autoOpen: true,
            distance: 10,
            html: $map,
            beforeOpen: function() {
              // close any open hoverbox
              $body.trigger('click');
            },
            open: function() {
              // call map embed plugin
              $map.lwGoogleMapsEmbed({
                api_key: (LW.is_remote) ? livewhale.calendar.maps_api_key : livewhale.maps_api_key,
                latitude: latitude,
                longitude: longitude,
                zoom: 17
              });
              $map.after('<div class="lw_map_link"><a href="https://www.google.com/maps/place/' + encodeURIComponent(latitude + ',' + longitude) + '" class="lw_skip_link" target="_blank" >Open map in new window</a></div>'); // add a11y link
              // for reason, default anchor click behavior isn't working -- add handler instead
              $('.lw_map_link').on('click', 'a', function(e) {
                window.open($(this).attr('href'), '_blank');
                return false;
              });
            },
            close: function() {
              $(this).hoverbox('destroy');
            }
          });
          return true;
        });
      },
      initEditDialog: function() {
        // hide add event link if not logged in
        if (!LW.logged_in) {
          $('.add_event').hide();
        }

        var $overlay;

        // attach overlay to .add_event link
        $body.on('click', '.add_event', function() {
          if (!$overlay) { // if overlay not yet created
            $overlay = $('<div style="width:400px;"><h3 style="height:35px;">Add Event</h3><form method="post"><div style="height:35px;"><input type="text" name="title" placeholder="Event title"/></div><div style="height:35px;"><input type="text" class="lw_date" name="date" value="" placeholder="Date"/> at <input type="text" class="lw_time" name="time" value="" placeholder="Time"/></div><div><input type="button" name="save" value="Save"/> or <input type="button" name="cancel" value="Cancel"/></div></form></div>').addClass('add_event_overlay').appendTo('body').overlay({
              autoOpen: false,
              closeButton: false,
              destroyOnClose: false
            }); // create overlay
            // dynamically load javascript
            var loadScript = function(url, callback) {
              var script = document.createElement("script");
              script.type = "text/javascript";
              if (script.readyState) { //IE
                script.onreadystatechange = function() {
                  if (script.readyState === "loaded" || script.readyState === "complete") {
                    script.onreadystatechange = null;
                    callback();
                  }
                };
              } else { //Others
                script.onload = function() {
                  callback();
                };
              }
              script.src = url;
              document.getElementsByTagName('head')[0].appendChild(script);
            };

            // load jquery-ui for the datepicker
            loadScript(LW.liveurl_dir + '/resource/js/livewhale/thirdparty/jqueryui/jquery-ui.js', function() {
              // load timepicker
              loadScript(LW.liveurl_dir + '/resource/js/livewhale/scripts/lwui/jquery.lw-timepicker.js', function() {
                if (!$.browser.msie || $.browser.version >= 7) {
                  LW.lib.initDatepicker($overlay.find('input.lw_date'));
                  if ($.fn.timepicker) {
                    $overlay.find('input.lw_time').timepicker({
                      show24Hours: ('euro' === LW.timezone_format) ? true : false,
                      startTime: '8:00am'
                    });
                  }
                }
              });
            });
            $overlay.on('click', 'input[name="cancel"]', function() { // handle cancel button
              $overlay.removeClass('is_open');
              $overlay.overlay('close');
            });
            $overlay.on('click', 'input[name="save"]', function() { // handle save button
              $.post(LW.liveurl_dir + '/events/submit', $(this).parents('form').find(':input').serialize(), function(response) {
                if (response.error) {
                  LW.prompt('Save Error', response.error, 'failure', {
                    'Okay': ''
                  });
                } else {
                  $overlay.removeClass('is_open');
                  $overlay.overlay('close');
                  LW.prompt('Save Successful', 'The event was saved successfully.', 'success', {
                    'Okay': ''
                  });
                }
              }, 'json');
            });
          }
          if (!$overlay.hasClass('is_open')) { // if overlay not open already, open it
            $overlay.addClass('is_open');
            $overlay.overlay('open');
          }
          return false;
        });
      }
    });

    var subscriptionMenu = LW.lwCalendar.subscriptionMenu = {
      init: function() {
        var that = this,
            html, tmpl, $tmpl, $hoverbox;

        var group = this.group = LW.group_title || options.group || '';

        $tmpl = $('#lw_cal_subscription_menu_template', $tmpl_wrapper);
        if ($tmpl.length) {
          tmpl = _.template($('#lw_cal_subscription_menu_template', $tmpl_wrapper).html());
        } else {
          tmpl = this.getDefaultTemplate();
        }
    if (tmpl && $.isFunction(tmpl)) {
          html = tmpl({
            group: group,
            all_events_link: this.getLink('ical')
          });
    }

        var $el = this.$el = $(html);
        this.$ul   = $el.find('ul');

        $body.on('calChange.lwcal', function(evt, controller, view, data) {
          that.refresh();
        });

        // for reason, default anchor click behavior isn't working -- add handler instead
        $el.on('click', 'a[class^=lw_cal_sub]:not(.lw_clipboard)', function(e) {
          window.open($(this).attr('href'), '_blank');
          return false;
        });

        // copy to clipboard
        $el.on('click', '.lw_clipboard', function(e) {
          e.preventDefault();
          var href = $(this).attr('href'),
              copied, $msg;

          // prepend host if href doesn't already include one
          if (-1 === href.indexOf('http') && -1 === href.indexOf('webcal')) {
            href = options.host + href;
          }

          copied = livewhale.lib.copyToClipboard(href);

          if (copied) {
            $msg = $el.find('.lw_link_copied');
          } else {
            $msg = $el.find('.lw_link_copy_failed');
          }
          $msg.css('opacity', 1).fadeIn(200);
          setTimeout(function() { $msg.animate({ opacity: 0.5 }, 200); }, 1200);

          if ($hoverbox) {
            $hoverbox.hoverbox('position');
          }
          return true;
        });

        var $subscribe = $('#lw_cal_subscribe');

        if ($subscribe.length) {
          var position = (($subscribe.offset().left + $subscribe.width()) < ($('body').width() / 2)) ? 'right' : 'left';
          $hoverbox = $subscribe.find('a').hoverbox({
            position: position,
            close: function() {
              $el.find('.lw_link_copied').hide();
              $el.find('.lw_link_copy_failed').hide();
            },
            html: $el
          });
        }
      },
      // type: ical or rss
      getLink: function(type, category) {
        var $widget    = $(decodeURIComponent(controller.getWidgetSyntax())),
            link       = LW.liveurl_dir + '/' + type + '/events',
            args       = ['group', 'exclude_group', 'tag', 'exclude_tag', 'exclude_subscription'],
            state_vars = ['groups', 'language', 'tags', 'audience', 'campus'],
            header     = '';

        var feed_state_var = {
          groups:   'group',
          tags:     'tag',
          audience: 'categories_audience',
          campus:   'categories_campus'
        };

        // check each arg we need to consider for values in the widget
        _.each(args, function(arg) {
          $widget.find('#' + arg).each(function() {
            var val = encodeURIComponent($(this).text()).replace(/'/g, "%27");
            if (val) {
              link += '/' + arg + '/' + val;
            }
          });
        });

        // append category
        if (category) {
          link += '/category/' + encodeURIComponent(category);
        }

        $.each(state_vars, function(i, item) {
          var values = controller.getVar(item);
          var key = feed_state_var[ item ] || item;

          if ('tag' === key && values.length > 1) {
            link += '/tag_mode/any';
          }

          _.each(values, function(val) {
            link += '/' + key + '/' + encodeURIComponent(val);
          });
        });

        // not sure where this is usedw
        if (livewhale.feed_suffix) {
          link += livewhale.feed_suffix;
        }

        // add header
        if (category) {
          if (this.group) {
            header = this.group + ' ';
          }
          header += category + ' Events';
        } else {
          header = (this.group ? this.group : 'All') + ' Events';
        }
        link += '/header/' + encodeURIComponent(header);

        // we need to prepend the remote host if this is a remote calendar
        if (LW.is_remote) {
          link = LW.remote_host + link;

          // the client sometimes sends the remote host starting with double slashes
          if (link.match(/^\/\//)) {
            link = 'http:' + link;
          }
        }
        if (type === 'ical' && options.webcal_feed_links) {
          link = link.replace(/^https?:\/\//, '');
          link = 'webcal://' + (!LW.is_remote ? window.location.host : '') + link;
        }
        return link;
      },
      getItem: function(title, category) {
        var rss  = this.getLink('rss', category),
            ical = this.getLink('ical', category),
            html;

        html = '<li>'
             + '<a class="lw_cal_sub_cat" target="new" href="' + rss + '" rel="nofollow">' + title + '</a> '
             + '<a class="lw_cal_sub_rss" target="new" href="' + rss + '" rel="nofollow">RSS</a> | '
             + '<a class="lw_cal_sub_ical" target="new" href="' + ical + '" rel="nofollow">ICAL</a> | '
             + '<a class="lw_cal_sub_ical lw_clipboard" href="' + ical + '" rel="nofollow">Copy Link</a>'
             + '</li>';
        return html;
      },
      getCategoryItems: function() {
        var that = this;
        var html = '';

        // get category items
        $('#lw_cal_category_selector ul > li > label').each(function() {
          var cat = $.trim($(this).text());
          html += that.getItem(cat, cat);
        });
        return html;
      },
      refresh: function() {
        var html = this.getItem('All Calendars'),
            groups = controller.getVar('groups'),
            $p, group;

        if (groups && groups.length === 1) {
          group = groups[0];
        } else {
          group = LW.group_title || options.group || '';
        }
        // update group if it changed
        if (group !== this.group) {
          this.group = group;

          if (group) {
            this.$el.find('> p:first-child strong').text(group);
          } else {
            $p = this.$el.find('> p:first-child'); $p.find('strong').text( $p.attr('data-default') || 'Main Calendar' );
          }
        }

        html += this.getCategoryItems();

        // update all events link
        var $all_events_link = this.$el.find('a.lw_cal_sub');
        if ($all_events_link.length) {
          $all_events_link.attr('href', this.getLink('ical'));
        }

        // add it to the menu
        this.$ul.html(html);
      },
      getDefaultTemplate: function(group, all_events_link) {
        return '<div id="lw_cal_subscription_menu">'
             + '<p data-default="Main Calendar">'
             + 'Current calendar: <strong>{{ group }}</strong>'
             + '</p>'
             + '<p><a class="lw_cal_sub" href="{{ all_events_link }}">Subscribe to all {{ group }} events</a></p>'
             + '<p class="lw_link_copied" style="display: none; margin: 10px 0;">'
             + 'Event feed link copied.<br/>Paste into any calendar app.'
             + '</p>'
             + '<p class="lw_link_copy_fail" style="display: none; margin: 10px 0;">Unable to copy link!</p>'
             + '<h6 class="" style="margin: 10px 0;">Subscribe by event type:</h6>'
             + '<ul></ul>'
             + '</div>';
      }
    };

    var miniMonth = _.extend({}, viewBase, {
      init: function() {
        var $el = this.$el = $('#lw_mini_cal');

        // do nothing if no mini cal element on page
        if (!$el.length) return;

        this.year      = null;
        this.month     = null;
        this.$week_sel = $('<div/>').addClass('lw_week_select').hide();
        this.today     = this.getYmdFromDate(new Date());
        this.sel_tr    = null;
        var that       = this;

        // handle month scroll arrow click
        $el.on('click', 'h3 a,.lw_right,.lw_left', function(e) {
          e.preventDefault();

          var $this = $(this);

          if ($this.hasClass('lw_left')) {
            that.previous();
          } else if ($this.hasClass('lw_right')) {
            that.next();
          }
          return true;
        });

        this.$in_focus = null;

        $el.on('keydown', 'td', function(e) {
          switch (e.which) {
            case 13:
              e.preventDefault();
              that.selectDayInFocus();
              break;
            case 37:
              that.prevDayFocus();
              break;
            case 39:
              that.nextDayFocus();
              break;
            case 38:
              e.preventDefault();
              that.previousWeekFocus();
              break;
            case 40:
              e.preventDefault();
              that.nextWeekFocus();
              break;
          }
        });

        // handle date clicks
        $el.on('click', 'td', function(e) {
          e.preventDefault();

          var $this = $(this),
              day   = parseInt($this.text(), 10),
              month = that.month,
              year  = that.year;

          // do nothing if no day
          if (!day) return;

          if ($this.hasClass('lw_prev_month')) {
            if (month === 1) {
              month = 12;
              year--;
            } else {
              month--;
            }
          }
          if ($this.hasClass('lw_next_month')) {
            if (month === 12) {
              month = 1;
              year++;
            } else {
              month++;
            }
          }

          $('body').on('calMiniLoad.lwcal', that.focusCurrentDayLink);

          controller.setVar('view', options.default_minical_view);
          controller.clearVar('search');
          controller.clearVar('search_period');
          controller.setDate(year, month, day);
          controller.load();

        });

        $el.on('click', '.lw_week_select', function(e) {
          // do nothing if no selected row
          if (!that.sel_tr) return false;

          var $tr = $(that.sel_tr),
            day;

          $tr.children().each(function(i, el) {
            var d = $(el).text();

            d = d.replace(/>/g, '');

            if (d) {
              day = parseInt(d, 10);
              return false; // break when we've found what we're looking for
            }
          });

          if (day) {
            controller.setVar('view', 'week');
            controller.clearVar('search');
            controller.clearVar('search_period');
            controller.setDate(that.year, that.month, day);
            controller.load();
          }
        });

        // show week select icon
        $el.on('mouseenter', 'tbody tr', function(e) {
          // set selected row
          that.sel_tr = this;

          var top = $(this).position().top + 2;

          // I hate to do this, but . . . IE8 requires an additional offset
          if ($.browser.msie && parseInt($.browser.version, 10) === 8) {
            top += 15;
          }
          that.$week_sel.show().css('top', top);
        });

        $el.on('mouseleave', 'tbody,.lw_week_select', function(e) {
          var $to = $(e.toElement || e.relatedTarget);
          if ($to.hasClass('lw_week_select')) return false;

          that.$week_sel.hide();
        });

        $el.on('click', 'table a', function(e) {
          e.preventDefault();
          return true;
        });

        $body.on('calChange.lwcal', function(evt, controller, view, data) {
          that.data = data;
          that.view = view;
          that.render(null, null, null, view);
        });

        // cache template
        this.template = _.template($('#lw_cal_mini_cal_template', $tmpl_wrapper).html());
      },
      selectDayInFocus: function() {
        this.$in_focus.trigger('click');
      },
      removeFocus: function(el) {
        el.attr('aria-selected',false).attr('tabindex',-1).removeClass('lw_focus');
      },
      addFocus: function(el) {
        el.attr('aria-selected',true).attr('tabindex',0).addClass('lw_focus').trigger('focus');
      },
      prevDayFocus: function() {
        var $in_focus = this.$in_focus;

        this.removeFocus($in_focus);

        if (0 === $in_focus.index()) {
          var $tr = $in_focus.closest('tr');
          this.$in_focus = (0 === $tr.index())
            ? $tr.siblings(':last').find('td:last')
            : $tr.prev().find('td:last');
        } else {
          this.$in_focus = $in_focus.prev();
        }

        this.addFocus(this.$in_focus);
      },
      nextDayFocus: function() {
        var $in_focus = this.$in_focus;

        this.removeFocus($in_focus);

        if (6 === $in_focus.index()) {
          var $tr = $in_focus.closest('tr');
          this.$in_focus = ($tr.closest('tbody').find('tr').length === $tr.index() + 1)
            ? $tr.siblings(':first').find('td:first')
            : $tr.next().find('td:first');
        } else {
          this.$in_focus = $in_focus.next();
        }

        this.addFocus(this.$in_focus);
      },
      previousWeekFocus: function() {
        var $in_focus = this.$in_focus;

        this.removeFocus($in_focus);

        var $tr = $in_focus.closest('tr');
        this.$in_focus = (0 === $tr.index())
          ? $tr.siblings(':last').find('td').eq($in_focus.index())
          : $tr.prev().find('td').eq($in_focus.index());

        this.addFocus(this.$in_focus);
      },
      nextWeekFocus: function() {
        var $in_focus = this.$in_focus;

        this.removeFocus($in_focus);

        var $tr = $in_focus.closest('tr');
        this.$in_focus = ($tr.closest('tbody').find('tr').length === $tr.index() + 1)
          ? $tr.siblings(':first').find('td').eq($in_focus.index())
          : $tr.next().find('td').eq($in_focus.index());

        this.addFocus(this.$in_focus);
      },
      focusPreviousMonthLink: function() {
        $('body').off('calMiniLoad.lwcal', this.focusNextMonthLink); // unbind so it only runs once
        $('.lw_left').trigger('focus');
      },
      focusNextMonthLink: function() {
        $('body').off('calMiniLoad.lwcal', this.focusNextMonthLink);  // unbind so it only runs once
        $('.lw_right').trigger('focus');
      },
      focusCurrentDayLink: function() {
        $('body').off('calMiniLoad.lwcal', this.focusCurrentDayLink);  // unbind so it only runs once
        $('#lw_mini_cal .selected.active').trigger('focus');
        // a11y - on date change, add skip link
        if ($('#lw_mini_cal + .lw_skip_link').length == 0) {
          $('#lw_mini_cal').after('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');
        }
      },
      previous: function() {
        var year, month;

        if (1 === this.month) {
          month = 12;
          year = this.year - 1;
        } else {
          month = this.month - 1;
          year = this.year;
        }
        $('body').on('calMiniLoad.lwcal', this.focusPreviousMonthLink);
        this.showMonth(year, month);
      },
      next: function() {
        var year, month;

        if (12 === this.month) {
          month = 1;
          year = this.year + 1;
        } else {
          month = this.month + 1;
          year = this.year;
        }
        $('body').on('calMiniLoad.lwcal', this.focusNextMonthLink);
        this.showMonth(year, month);
      },
      showMonth: function(year, month) {
        var that = this;
        var view = controller.getVar('view')[0] || 'day';

        // days with events and render if at least one category, group, tag, or search
        if (options.mini_cal_heat_map) {
          var url = LW.liveurl_dir + '/calendar/month_events_per_day?year=' + year + '&month=' + month
                  + controller.getAjaxQueryString();

          if (LW.remote_host) {
            url = LW.remote_host + url;
          }

          $.ajax({
            url: url,
            dataType: 'json',
            success: function(data) {
              that.render(year, month, that.day, view, data);
            }
          });
        } else {
          this.render(year, month, this.day, view);
        }
      },
      getDates: function() {
        var start, end;
        var dt_start = (controller.getVar('date').length)
          ? this.getDateFromYmd(controller.getVar('date')[0])
          : new Date();

        switch (this.view) {
          case 'day':
          case options.event_view_name:
            start = dt_start;
            end = start;
            break;
          case 'week':
            start = dt_start;
            end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            start.setDate(start.getDate() - start.getDay());
            end.setDate(start.getDate() + 6);
            break;
          case 'all':
            start = dt_start;
            if (controller.getVar('end_date').length) {
              end = this.getDateFromYmd(controller.getVar('end_date')[0]);
            } else {
              end = new Date();
              end.setFullYear(5000);
            }
            break;
          default:
            start = new Date();
            end = new Date();
            break;
        }
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return [start, end];
      },
      render: function(year, month, day, view, data) {
        var dates      = this.getDates(),
            start_date = dates[0],
            end_date   = dates[1],
            start_date_ymd;

        // use start date as mini cal's year, month, and day if none passed in
        if (!year || !month || !day) {
          start_date_ymd = this.getYmdFromDate(start_date);
          year  = parseInt(start_date_ymd.substr(0, 4), 10);
          month = parseInt(start_date_ymd.substr(4, 2), 10);
          day   = parseInt(start_date_ymd.substr(6, 2), 10);
        }

        // get date
        var prev_month     = (month === 1) ? 12 : month - 1,
            prev_year      = (month === 1) ? year - 1 : year,
            prev_days      = this.getDaysInMonth(prev_year, prev_month),
            curr_days      = this.getDaysInMonth(year, month),
            first_day      = new Date(year, month - 1, 1),
            first_week_day = first_day.getDay(),
            row_count      = Math.ceil((curr_days + first_week_day) / 7),
            rows           = [],
            month_day      = 0 - first_week_day,
            year_month     = year.toString() + ((month < 10) ? '0' + month : month.toString()),
            that           = this,
            month_day_count = (data) ? data : this.data.month_day_cnt || null;

        this.year  = year;
        this.month = month;
        this.day   = day;

        // reset selected row
        this.sel_tr = null;

        var day_date;
        var pad = DateFormatter.prototype._pad;

        rows = _.map(_.range(row_count), function(i) {
          var str = "",
              day_num, classes, ymd;

          for (var j = 0; j < 7; j++) {
            month_day++;
            ymd = year_month + ((month_day < 10) ? '0' + month_day : month_day.toString());
            classes = [];

            // if day has events
            if (options.mini_cal_heat_map && month_day_count && month_day_count[month_day] > 0) {
              classes.push('has_items');
            }

            day_date = that.getDateFromYmd(year + pad(month, 2) + pad(month_day, 2));
            //day_date.setHours(0,0,0,0);

            if (day_date.getTime() >= start_date.getTime()
                && day_date.getTime() <= end_date.getTime()) {
              classes.push('selected');
            }

            // highlight today
            if (that.today === ymd) {
              classes.push('today');
            }

            // year and month values for td title attribute
            var title_year = year;
            var title_month = month - 1;

            // mark is_prev_month false when we read the first day of month
            if (month_day <= 0) {
              classes.push('lw_prev_month');
              day_num = prev_days + month_day;

              if (0 === month) {
                title_month = 11;
                title_year--;
              } else {
                title_month--;
              }
            } else if (month_day > curr_days) {
              classes.push('lw_next_month');
              day_num = month_day - curr_days;

              if (11 === month) {
                title_month = 0;
                title_year++;
              } else {
                title_month++;
              }
            } else {
              classes.push('active');
              classes.push('d_' + month_day);
              day_num = month_day;
            }

            var title_date = new Date(title_year, title_month, day_num);
            var formatter = new DateFormatter(title_date);
            var title = formatter.format('F j, Y');

            str += '<td class="' + classes.join(' ') + '" title="' + title + '" aria-label="' + title + '" role="gridcell" aria-selected="false" tabindex="-1">'
                 + '<a href="#" tabindex="-1">' + day_num + '</a>'
                 + '</td>';
          }
          return str;
        });

        this.$el.html(this.template({
          mini_cal_body: '<tr>' + rows.join('</tr><tr>') + '</tr>',
          mini_cal_header: this.month_names[month - 1] + ' ' + year
        }));

        // Set aria-label for #mini_cal_header if it exists in theme
        if ($('#mini_cal_header').length) {
          $('#mini_cal_header').attr('aria-label',$('#mini_cal_header').text());
        }

        // set day with tabindex
        var $selected = this.$el.find('td.selected').first();
        if ($selected.length) {
          this.$in_focus = $selected;
        } else {
          var $first = this.$el.find('tbody td:first');
          this.$in_focus = $first;
        }
        this.$in_focus.attr('tabindex', '0').attr('aria-selected', 'true').attr('aria-label', this.$in_focus.attr('aria-label') + '. Use arrow keys to find a date, Enter to select a date.');

        // add the week select
        this.$el.append(this.$week_sel);

        // set focus on first link
        // this.$el.find('a:first').trigger('focus');

        $body.trigger('calMiniLoad.lwcal', [this, year, month, day]);
      },
      getDaysInMonth: function(year, month) {
        var leap = ((0 === year % 4 && year % 100) || 0 === year % 400) ? 1 : 0;
        return (month === 2) ? (28 + leap) : 31 - (month - 1) % 7 % 2;
      },
      selectDay: function(day) {
        this.day = day;
        this.$el.find('td.selected').removeClass('selected');
        this.$el.find('.d_' + day).addClass('selected');
      },
      selectWeek: function(day) {
        this.day = day;
        this.$el.find('td.selected').removeClass('selected');
        this.$el.find('.d_' + day).parent('tr').children('td').addClass('selected');
      }
    });

    // shared code; is extended by categories, tags, and calendars
    var selector = {
      $el: null,
      $ul: null,
      init: function(data) {
        var that = this;

        this.render();

        // show tags , and bind select method to click event
        this.$el = $('#' + this.wrapper_id);

        // return right away if no wrapping element found
        if (!this.$el.length) return false;

        // each selector object must define own this.select method
        this.$ul = this.$('ul').on('click', 'input[type="checkbox"]', $.proxy(this.select, this));

        // call init for individual selector
        if ($.isFunction(this.selectorInit())) {
          this.selectorInit();
        }

        // show if selector has items
        if (this.$ul.children().length) {
          this.$el.removeClass('lw_hidden').show();
        } else {
          this.$el.hide();
        }

        $body.on('calChange.lwcal', function(e, controller, view) {
          that.highlightSelected.apply(that);
          return true;
        });
      },
      $: function(selector) {
        return this.$el.find(selector);
      },
      addItem: function(value) {
        controller.appendVar(this.selector_key, value);
      },
      removeItem: function(value) {
        controller.removeVar(this.selector_key, value);
      }
    };

    // tags component object extends selector object
    var tags = LW.lwCalendar.tags = _.extend({
      selector_key:  'tags', // name of GET var
      id_prefix:     'lw_cal_tag_',
      wrapper_id:    'lw_cal_tag_selector',
      visible:       false,
      $ul:           null,
      render: function() {
        var $placeholder, tmpl;
        if (options.modular && options.show_tags) {
          $placeholder = $('#lw_cal_tag_selector');
          if ($placeholder.length && LW.calendar.tags) {
            tmpl = _.template($('#lw_cal_tag_selector_template', $tmpl_wrapper).html());
            $placeholder.replaceWith(
              tmpl({ tags: LW.calendar.tags })
            );
          }
        }
      },
      selectorInit: function() {
        var that = this;

        this.$ul = this.$('ul');
        this.$toggle = this.$('#lw_cal_tag_toggle');

        // visibility toggle link click event
        this.$toggle.on('click', function(evt) {
          evt.preventDefault();
          that.toggleVisibility();
          that.visible = true;
          return false;
        });

        // initial state is hidden
        this.$ul.hide();

        // show if tags selected
        if (window.location.hash.indexOf('tags/') !== -1) {
          this.toggleVisibility();
        }
      },
      toggleVisibility: function() {
        if ('show' === this.$toggle.text()) {
          this.$toggle.text('hide').attr('aria-expanded',true);
        } else {
          this.$toggle.text('show').attr('aria-expanded',false);
        }
        this.$ul.slideToggle('medium');
      },
      select: function(evt) {
        // ignore clicks not coming from checkbox or label
        if (!$(evt.target).is('input[type=checkbox],label')) {
          return true;
        }

        var $li = $(evt.currentTarget).closest('li'),
            item = $.trim($li.find('label').text());

        if ($li.hasClass('selected')) {
          $li.removeClass('selected');
          this.removeItem(item);
        } else {
          $li.addClass('selected');
          this.addItem(item);
        }

        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_tag .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');

        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }

        $body.trigger('lw.tagUpdated');
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);

        if (vals && vals.length) {
          // loop through tags items and highlight any in vals
          this.$ul.children().each(function(i, li) {
            var $li = $(li);

            if ($.isArray(vals) && -1 !== $.inArray($.trim($li.find('label').text()), vals)) {
              $li.addClass('selected')
                .find('input:checkbox')
                  .prop('checked', true);
            } else if ($li.hasClass('selected')) {
              $li.removeClass('selected')
                .find('input:checkbox')
                  .prop('checked', false);
            }
          });
        } else {
          this.$ul.children('li.selected')
            .removeClass('selected')
            .find('input:checkbox')
              .prop('checked', false);
        }
        return true;
      }
    }, selector);

    // categories component object extends selector object
    var categories = LW.lwCalendar.categories = _.extend({
      selector_key: 'categories', // name of GET var
      id_prefix: 'lw_cal_cat_',
      wrapper_id: 'lw_cal_category_selector',
      render: function() {
        var $placeholder, tmpl;
        if (options.modular && options.show_categories) {
          $placeholder = $('#lw_cal_category_selector');
          if ($placeholder.length && LW.calendar.categories) {
            tmpl = _.template($('#lw_cal_category_selector_template', $tmpl_wrapper).html());
            $placeholder.replaceWith(
              tmpl({ categories: LW.calendar.categories })
            );
          }
        }
      },
      selectorInit: function() {
        // add All link if exclusive categories
        if (options.exclusive_categories) {
          $('<li/>').addClass('all').text('All').prependTo(this.$ul);
        }
      },
      select: function(evt) {
        // Lazy function definition
        if (options.exclusive_categories) {
          this.select = this.selectCategory;
        } else {
          this.select = this.toggleCategory;
        }
        return this.select(evt);
      },
      toggleCategory: function(evt) {
        var $li = $(evt.currentTarget).closest('li');

        // ignore clicks not coming from checkbox
        if (!$(evt.target).is('input[type=checkbox]')) {
          return true;
        }
        if ($li.hasClass('selected')) {
          this.deselectItem($li);
        } else {
          this.selectItem($li);
        }
        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');

        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      selectCategory: function(evt) {
        var $li = $(evt.currentTarget).closest('li'),
            view = controller.getView();

        // ignore clicks not coming from checkbox
        if (!$(evt.target).is('input[type=checkbox]')) {
          return true;
        }

        // do nothing if already selected
        if ($li.hasClass('selected')) return true;

        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');

        // deselect previously selected category/categories
        controller.clearVar('categories');

        // doesn't make sense to view categories within group
        controller.clearVar('group');

        // clear existing cats and tags, and set view to day
        if ('all' === view) {
          controller.setVar('view', 'day');
          controller.clearVar('tags');
          controller.clearVar('locations');
          controller.clearVar('search');
          controller.clearVar('search_period');
        }
        // redirect to 'all' view if we're on an event
        if (view === options.event_view_name) {
          controller.setVar('view', 'day');
          controller.clearVar('event_id');
        }
        if (!$li.hasClass('all')) {
          this.selectItem($li);
        }
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      selectItem: function($li) {
        var $input = $li.find('input');
        var val = ($input.length && $input.val()) ? $input.val() : $li.find('label').text();
        this.addItem(val);
      },
      deselectItem: function($li) {
        var $input = $li.find('input');
        var val = ($input.length && $input.val()) ? $input.val() : $li.find('label').text();
        this.removeItem(val);
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);

        if (vals && vals.length) {
          // loop through tags items and highlight any in vals
          this.$ul.children().each(function(i, li) {
            var $li = $(li);

            // select selected, unselect previously selected
            if ($.isArray(vals) && -1 !== $.inArray($.trim($li.find('label').text()), vals)) {
              $li.addClass('selected');
              $li.find('input:checkbox').prop('checked', true);
            } else if ($li.hasClass('selected')) {
              $li.removeClass('selected');
              $li.find('input:checkbox').prop('checked', false);
            }
          });
        } else {
          // unselect all any selected items
          this.$ul.children('li.selected')
            .removeClass('selected')
            .find('input:checkbox')
              .prop('checked', false);

          // select 'All' if exclusive categories
          if (options.exclusive_categories) {
            this.$ul.children('.all').addClass('selected');
          }
        }
        return true;
      }
    }, selector);

    var audience = LW.lwCalendar.audience = _.extend({
      selector_key: 'audience', // name of GET var
      id_prefix: 'lw_cal_cat_audience_',
      wrapper_id: 'lw_cal_category_audience_selector',
      render: function() {
        var $placeholder, tmpl;
        if (options.modular && options.show_categories) {
          $placeholder = $('#lw_cal_category_audience_selector');
          if ($placeholder.length && LW.calendar.categories) {
            tmpl = _.template($('#lw_cal_category_audience_selector_template', $tmpl_wrapper).html());
            $placeholder.replaceWith(
              tmpl({ audiences: LW.calendar.categories_audience })
            );
          }
        }
      },
      selectorInit: function() {
        // add All link if exclusive categories
        if (options.exclusive_categories) {
          $('<li/>').addClass('all').text('All').prependTo(this.$ul);
        }
      },
      select: function(evt) {
        var $li = $(evt.currentTarget).closest('li');

        // ignore clicks not coming from checkbox
        if (!$(evt.target).is('input[type=checkbox]')) {
          return true;
        }
        if ($li.hasClass('selected')) {
          this.deselectItem($li);
        } else {
          this.selectItem($li);
        }
        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');
        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      selectItem: function($li) {
        var $input = $li.find('input');
        var val = ($input.length && $input.val()) ? $input.val() : $li.find('label').text();
        this.addItem(val);
      },
      deselectItem: function($li) {
        var $input = $li.find('input');
        var val = ($input.length && $input.val()) ? $input.val() : $li.find('label').text();
        this.removeItem(val);
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);
        if (vals && vals.length) {
          // loop through tags items and highlight any in vals
          this.$ul.children().each(function(i, li) {
            var $li = $(li);
            // select selected, unselect previously selected
            if ($.isArray(vals) && -1 !== $.inArray($.trim($li.find('label').text()), vals)) {
              $li.addClass('selected');
              $li.find('input:checkbox').prop('checked', true);
            } else if ($li.hasClass('selected')) {
              $li.removeClass('selected');
              $li.find('input:checkbox').prop('checked', false);
            }
          });
        } else {
          // unselect all any selected items
          this.$ul.children('li.selected')
            .removeClass('selected')
            .find('input:checkbox')
              .prop('checked', false);

          // select 'All' if exclusive categories
          if (options.exclusive_categories) {
            this.$ul.children('.all').addClass('selected');
          }
        }
        return true;
      }
    }, selector);

    var campus = LW.lwCalendar.campus = _.extend({
      selector_key: 'campus', // name of GET var
      id_prefix: 'lw_cal_cat_campus_',
      wrapper_id: 'lw_cal_category_campus_selector',
      render: function() {
        var $placeholder = $('#lw_cal_category_campus_selector');
        var tmpl;

        if ($placeholder.length && LW.calendar.categories_campus) {
          tmpl = _.template($('#lw_cal_category_campus_selector_template', $tmpl_wrapper).html());
          $placeholder.replaceWith(
            tmpl({ campuses: LW.calendar.categories_campus })
          );
        }
      },
      selectorInit: function() {
        // add All link if exclusive categories
        if (options.exclusive_categories) {
          $('<li/>').addClass('all').text('All').prependTo(this.$ul);
        }
      },
      select: function(evt) {
        var $li = $(evt.currentTarget).closest('li');

        // ignore clicks not coming from checkbox
        if (!$(evt.target).is('input[type=checkbox]')) {
          return true;
        }
        if ($li.hasClass('selected')) {
          this.deselectItem($li);
        } else {
          this.selectItem($li);
        }
        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');
        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      selectItem: function($li) {
        var $input = $li.find('input');
        var val = ($input.length && $input.val()) ? $input.val() : $li.find('label').text();
        this.addItem(val);
      },
      deselectItem: function($li) {
        var $input = $li.find('input');
        var val = ($input.length && $input.val()) ? $input.val() : $li.find('label').text();
        this.removeItem(val);
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);

        if (vals && vals.length) {
          // loop through tags items and highlight any in vals
          this.$ul.children().each(function(i, li) {
            var $li = $(li);

            // select selected, unselect previously selected
            if ($.isArray(vals) && -1 !== $.inArray($.trim($li.find('label').text()), vals)) {
              $li.addClass('selected');
              $li.find('input:checkbox').prop('checked', true);
            } else if ($li.hasClass('selected')) {
              $li.removeClass('selected');
              $li.find('input:checkbox').prop('checked', false);
            }
          });
        } else {
          // unselect all any selected items
          this.$ul.children('li.selected')
            .removeClass('selected')
            .find('input:checkbox')
              .prop('checked', false);

          // select 'All' if exclusive categories
          if (options.exclusive_categories) {
            this.$ul.children('.all').addClass('selected');
          }
        }
        return true;
      }
    }, selector);

    // used only by NYU
    // locations component object extends selector object
    var locations = LW.lwCalendar.locations = _.extend({
      selector_key: 'locations', // name of GET var
      id_prefix: 'lw_cal_loc_',
      wrapper_id: 'lw_cal_location_selector',
      render: function() {
        var $placeholder, tmpl;
        if (options.modular && options.show_locations) {
          $placeholder = $('#' + this.wrapper_id);
          if ($placeholder.length && LW.calendar.locations) {
            tmpl = _.template($('#' + this.wrapper_id + '_template', $tmpl_wrapper).html());
            $placeholder.replaceWith(
              tmpl({ locations: LW.calendar.locations })
            );
          }
        }
      },
      selectorInit: function() {
        this.locations = {};
        if (_.isArray(LW.calendar.locations) && LW.calendar.locations.length) {
          this.locations = _.reduce(LW.calendar.locations, function(hash, val) {
            hash[val.id] = val.title;
            return hash;
          }, {});
        }
        // add All link if exclusive categories
        if (options.exclusive_categories) {
          $('<li/>').addClass('all').text('All').prependTo(this.$ul);
        }
      },
      getLocation: function(id) {
        return this.locations[id];
      },
      select: function(evt) {
        // ignore clicks not coming from checkbox
        if (!$(evt.target).is('input[type=checkbox]')) {
          return true;
        }

        var $li = $(evt.currentTarget).closest('li'),
            item = $li.find('input').val();

        if ($li.hasClass('selected')) {
          $li.removeClass('selected');
          this.removeItem(item);
        } else {
          $li.addClass('selected');
          this.addItem(item);
        }
        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');
        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }

        //$body.trigger('lw.tagUpdated');
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);

        if (vals && vals.length) {
          // loop through tags items and highlight any in vals
          this.$ul.children().each(function(i, li) {
            var $li = $(li),
                val = $li.find('input').val();

            // select selected, unselect previously selected
            if ($.isArray(vals) && -1 !== $.inArray(val, vals)) {
              $li.addClass('selected');
              $li.find('input:checkbox').prop('checked', true);
            } else if ($li.hasClass('selected')) {
              $li.removeClass('selected');
              $li.find('input:checkbox').prop('checked', false);
            }
          });
        } else {
          // unselect all any selected items
          this.$ul.children('li.selected')
            .removeClass('selected')
            .find('input:checkbox')
              .prop('checked', false);
        }
        return true;
      }
    }, selector);

    // groups component object extends selector object
    var groups = LW.lwCalendar.groups = _.extend({
      selector_key:  'groups', // name of GET var
      id_prefix:     'lw_cal_group_',
      wrapper_id:    'lw_cal_group_selector',
      render: function() {
        var $placeholder, tmpl;
        if (options.modular && options.show_categories) {
          $placeholder = $('#lw_cal_group_selector');
          if ($placeholder.length && LW.calendar.groups) {
            tmpl = _.template($('#lw_cal_group_selector_template', $tmpl_wrapper).html());
            $placeholder.replaceWith(
              tmpl({ groups: LW.calendar.groups })
            );
          }
        }
      },
      selectorInit: function() {
        var that = this;
        this.$lis = this.$ul.children();
        this.group_cnt = this.$lis.length;

        this.$el.on('click', '.select', function(e) {
          var $this = $(this);
          e.preventDefault();

          if ($this.hasClass('all')) {
            that.$lis.not('.selected').each(function() {
              that.selectItem($(this));
            });
          } else {
            that.$lis.filter('.selected').each(function() {
              that.deselectItem($(this));
            });
          }
          controller.load();
          return true;
        });
      },
      select: function(e) {
        var $li = $(e.currentTarget).closest('li');

        // ignore clicks not coming from checkbox
        if (!$(e.target).is('input[type=checkbox]')) {
          return true;
        }
        if ($li.hasClass('selected')) {
          this.deselectItem($li);
        } else {
          this.selectItem($li);
        }
        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');
        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }
        controller.load();

        // return true to preserve checkbox's default behavior
        return true;
      },
      markAllSelected: function() {
        // select all checkboxes if no filters
        this.$ul.children()
          .addClass('selected')
          .find('input:checkbox')
            .prop('checked', true);
      },
      markAllDeselected: function() {
        // select all checkboxes if no filters
        this.$ul.children()
          .removeClass('selected')
          .find('input:checkbox')
            .prop('checked', false);
      },
      // JP decided that all the checkboxes should be checked when we're not filtering by group
      // therefore, we remove all filters when the last checkbox is checked, and we add all the
      // selected filters when a user first unchecks a filter
      selectItem: function($li) {
        // don't do anything if item already selected
        if ($li.hasClass('selected')) return;

        $li.addClass('selected').find('input').prop('checked', true);

        // remove all group filters if checking last unchecked group
        // unless there's only one, in which case that behavior makes it look broken
        var selected_cnt = this.$lis.filter('.selected').length;
        if (selected_cnt !== 1 && selected_cnt === this.group_cnt) {
          controller.clearVar('groups');
        } else {
          this.addItem($li.find('input').val());
        }
      },
      deselectItem: function($li) {
        var that = this;

        // don't do anything if item already deselected
        if (!$li.hasClass('selected')) return;

        $li.removeClass('selected').find('input').prop('checked', false);

        // add all selected group filters if this is first group deselected
        // unless none are selected, in which case the behavior makes the checkbox appear broken
        var selected_cnt = this.$lis.filter('.selected').length;
        if (selected_cnt !== 0 && selected_cnt === this.group_cnt - 1) {
          this.$lis.filter('.selected').each(function() {
            that.addItem($(this).find('input').val());
          });
        } else {
          this.removeItem($li.find('input').val());
        }
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);

        // remove everything
        this.$ul.children()
          .removeClass('selected')
          .find('input:checkbox')
            .prop('checked', false);

        if (vals && vals.length) {
          // loop through tags items and highlight any in vals
          this.$ul.children().each(function(i, li) {
            var $li = $(li);

            // select selected, unselect previously selected
            if ($.isArray(vals) && -1 !== $.inArray($.trim($li.find('input[type=checkbox]').val()), vals)) {
              $li.addClass('selected');
              $li.find('input:checkbox').prop('checked', true);
            }
          });
        }
        return true;
      }
    }, selector);

    // onlineFilter component object extends selector object
    var onlineFilter = LW.lwCalendar.onlineFilter = _.extend({
      selector_key:  'only_online', // name of GET var
      id_prefix:     'lw_cal_online_',
      wrapper_id:    'lw_cal_online_selector',
      render: function() {
        var $placeholder = $('#lw_cal_online_selector');
        var tmpl;
        if ($placeholder.length) {
          tmpl = _.template($('#lw_cal_online_selector_template', $tmpl_wrapper).html());
          $placeholder.replaceWith(tmpl());
        }
      },
      selectorInit: $.noop,
      select: function(e) {
        var $checkbox = $(e.currentTarget),
            $li = $(e.currentTarget).closest('li');
        var is_checked = $checkbox.prop('checked');

        if (is_checked) {
          controller.setVar(this.selector_key, 'true');
        } else {
          controller.clearVar(this.selector_key);
        }

        // a11y - remove old skip links, add skip link after changed item
        $('.lw_cal_selector .lw_skip_link').remove();
        $li.append('<a href="#lw_cal_events" class="lw_skip_link">Skip to results</a>');

        if (controller.getView() === options.event_view_name) {
          controller.setVar('view', 'all');
          controller.clearVar('event_id');
        }
        controller.load();
        return true;
      },
      highlightSelected: function() {
        var vals = controller.getValue(this.selector_key);
        var selected = (vals.length && vals[0]) ? true : false;
        var $checkbox = this.$el.find(':checkbox');

        if (selected !== $checkbox.prop('checked')) {
          $checkbox.prop('checked', selected);
        }
        return true;
      }
    }, selector);

    var calendars = LW.lwCalendar.calendars = {
      init: function() {
        var $placeholder, tmpl;
        if (options.modular && options.show_categories) {
          $placeholder = $('#lw_cal_calendar_selector');
          if ($placeholder.length && !_.isEmpty(LW.calendar.calendars)) {
            tmpl = _.template($('#lw_cal_calendar_selector_template', $tmpl_wrapper).html());
            $placeholder.replaceWith(
              tmpl({ calendars: LW.calendar.calendars })
            );
          }
        }
      }
    };


    // remove default template msg on mobile
    if ($('.lw_msg_failure').length && window.innerWidth && window.innerWidth <= 480) {
      $('.lw_msg_failure').remove();
    }

    function bootstrap() {
      calView.init();
      categories.init();
      audience.init();
      campus.init();
      tags.init();
      groups.init();
      calendars.init();
      onlineFilter.init();
      locations.init(); // places
      subscriptionMenu.init();
      miniMonth.init();
      controller.init();
    }

    $body.trigger('calBeforeInit.lwcal');
    bootstrap();
  }

  /**
   * extendOptions
   */
  function extendDefaultOptions(config_options) {
    config_options = $.isPlainObject(config_options) ? config_options : {};
    var default_options = {
      default_view:             'day',
      default_minical_view:     'day',
      month_view_day_limit:     4,
      week_start_offset:        0,
      exclude_view:             [],
      show_view_menu:           true,
      show_sidebar:             true,
      show_dynamic_group_menu:  false,
      show_static_group_menu:   false,
      show_tags:                false,
      show_categories:          true,
      month_view_only:          false,
      webcal_feed_links:        true,
      search_all_events_only:   true,
      search_all_groups:        false,
      ampm_with_dots:           false,
      use_modular_templates:    true,
      hide_local_timezone:      (LW.disable_timezones ? true : false),
      disable_timezone:         (LW.disable_timezones ? true : false),
      sidebar:                  'default',
      feed_builder_filters:     ['category', 'audience', 'campus', 'group', 'tag'],
      placeholder:              '',
      enable_home_view:         false,
      thumb_width:              80,
      thumb_height:             80,
      location_char_limit:      50,
      modular:                  false,
      feed_base_path:           null,
      tag_mode:                 'and',
      host:                     protocol + '//' + window.location.hostname,
      event_view_name:          'event',
      valid_views: [
        'day',
        'week',
        'month',
        'all',
        'home',
        'event',
        'seo',
        'feed_builder'
      ]
    };

    // widget args are set in options.widget_args for remote calendar
    if (LW.is_remote) {
      LW.calendar_widget_args = config_options.widget_args;
    }
    var widget_args = $.isPlainObject(LW.calendar_widget_args) ? LW.calendar_widget_args : {};
    var options = _.extend({}, default_options, config_options, widget_args);

    // add event_view_name to valid_views array if set to something other than 'event'
    if (options.valid_views !== 'event') {
      options.valid_views.push(options.event_view_name);
    }

    // set default view to day if it is not a valid view
    if (!_.includes(options.valid_views, options.default_view)) {
      options.default_view = 'day';
    }

    var bool_opts = [
      'show_view_menu', 'show_sidebar', 'month_view_only',
      'show_static_group_menu', 'show_dynamic_group_menu',
      'show_tags', 'show_categories',
      'disable_timezone', 'webcal_feed_links', 'hide_local_timezone',
      'search_all_events_only', 'search_all_groups', 'mini_cal_heat_map',
      'enable_home_view', 'modular', 'use_modular_templates'
    ];
    var string_opts = [
      'default_view', 'sidebar', 'placeholder', 'tag_mode'
    ];

    // Widget args that are set more than once become arrays that contain each value set.
    // Use the last array item if an array is passed to a string type option.  We added
    // this to fix a case where the client set default_view twice
    _.each(string_opts, function(opt) {
      var val = options[opt];
      if ($.isArray(val)) {
        if (val.length) {
          options[opt] = val[ val.length - 1 ];
        } else {
          options[opt] = (typeof default_options[opt] === 'string') ? default_options[opt] : '';
        }
      }
    });

    // cast bool options
    // LW.calendar_widget_arg bool values are string.  The following
    // properly converts 'true' and 'false' strings
    var makeBool = function(val) {
      return ('false' === val || 'False' === val) ? false : !! val;
    };
    _.each(bool_opts, function(opt) {
      if (options[opt] && !_.isBoolean(options[opt])) options[opt] = makeBool(options[opt]);
    });

    // month_view_day_limit needs to be an integer
    options.month_view_day_limit = parseInt(options.month_view_day_limit, 10);

    // LW.calendar_widget_args.exclude_view is a string when there's only one value, and an array otherwise
    if (typeof options.exclude_view === 'string') options.exclude_view = [options.exclude_view];

    // change other settings when month_view_only is true
    if (true === options.month_view_only) {
      options.default_view = 'month';
      options.exclude_view = ['day', 'week', 'all'];
      options.show_view_menu = options.show_sidebar = false;
    }
    return options;
  }

  // get the data included as part of document for non-cors calendar.  this data includes
  // markup components and calendar specific data from livewhale json object
  function initRemoteCalendar(options) {
    var url = LW.remote_host + LW.liveurl_dir + '/calendar/remote_calendar?syntax='
            + utils.getWidgetSyntaxFromArgObject(options.widget_args || {});

    $.ajax({
      url: url,
      dataType: 'json',
      success: function(data, status, xhr) {
        // Check if we can allow ajax requests to be made withCredentials
        if (xhr.getResponseHeader('access-control-allow-credentials') === 'true') {
          options.with_credentials = true;
        }

        // data includes a few properties that are part of the LW object on non-remote calendars
        if (data.fb_app_id) {
          LW.facebook_lwc_app_id = data.fb_app_id;
        }
        if (data.use_pushstate) {
          LW.lwc_use_pushstate = data.use_pushstate;
        }
        if (data.disable_timezones) {
          options.hide_local_timezone = true;
          options.disable_timezone = true;
        }
        if (data.date_format_us) {
          LW.date_format_us = data.date_format_us;
        }
        if (data.date_format_euro) {
          LW.date_format_euro = data.date_format_euro;
        }
        if (data.time_format_us) {
          LW.time_format_us = data.time_format_us;
        }
        if (data.time_format_euro) {
          LW.time_format_euro = data.time_format_euro;
        }

        // add everything else to livewhale.calendar
        LW.calendar = LW.calendar || {};
        _.extend(LW.calendar, data);

        initCalendar(options);
      }
    });
  }

  // gets templates that have been split into a file for each template
  function getModularTemplatesUrl(theme) {
    var url = livewhale.remote_host ? livewhale.remote_host : '';
    url += livewhale.liveurl_dir + '/component/' + theme + '/';

    var files = _.map([
      'date_selector',
      'day',
      'home',
      'home_event',
      'calendars',
      'categories',
      'categories_audience',
      'categories_campus',
      'groups',
      'locations',
      'tags',
      'event_detail',
      'event',
      'event_images',
      'event_related_content',
      'event_share_icons',
      'feature',
      'feature_item',
      'feature_top',
      'feed_builder',
      'feed_selector',
      'online_selector',
      'header',
      'list',
      'all',
      'week',
      'mini_cal',
      'month',
      'month_day',
      'month_event',
      'no_results',
      'scroll_link',
      'search',
      'showing',
      'subscribe',
      'subscription_menu',
      'timezone_menu',
      'view_selector'
    ], function(val) { return 'calendar%5Clw_cal_' + val + '.html'; });
    return url + files.join('/');
  }

  function getModularTemplates(theme, callback) {
    $.ajax({
      url: getModularTemplatesUrl(theme),
      dataType: 'html',
      cache: true,
      success: function(data) {
        $tmpl_wrapper = $('<div id="lw_cal_js_templates"></div>')
          .append(data)
          .appendTo($wrapper);

        callback.apply();
      },
      error: function() {
        callback.apply(null, ['error']);
      }
    });
  }

  function getCombinedTemplates(theme, callback) {
    var url = livewhale.remote_host ? livewhale.remote_host : '';
    url += livewhale.liveurl_dir + '/component/' + theme + '/';
    url += '%5Ccalendar.html/%5Ccalendar-components.html';

    $.ajax({
      url: url,
      dataType: 'html',
      cache: true,
      success: function(data) {
        $tmpl_wrapper = $('<div id="lw_cal_js_templates"></div>')
          .append(data)
          .appendTo($wrapper);

        callback.apply();
      },
      error: function() {
        callback.apply(null, ['error']);
      }
    });
  }

  // get templates, and initialize calendar on success
  window.liveWhaleCalendar = function(options) {
    // extend default options with options passed in here
    options = extendDefaultOptions(options || {});
    var theme = options.theme || livewhale.theme || 'core';

    // init calls proper initialization function with options on doc ready
    var init = function(template_error) {
      $(function() {

        if (template_error) {
          var template_err = '<h3>Unable to load calendar templates. <strong>Please disable any ad blockers and '
                           + 'try again</strong>, or email support@livewhale.com if this problem persists.</h3>';
          $('#lw_cal_events').append(template_err);
        } else {
          if (LW.is_remote) {
            initRemoteCalendar(options);
          } else {
            initCalendar(options);
          }
        }
      });
    };

    if (options.use_modular_templates) {
      getModularTemplates(theme, init);
    } else {
      getCombinedTemplates(theme, init);
    }
  };

  // initialize the calendar if this is a LiveWhale page
  if (LW.page) {
    window.liveWhaleCalendar();
  }
}((typeof livewhale !== 'undefined' && livewhale.jQuery) ? livewhale.jQuery : jQuery, window._));
