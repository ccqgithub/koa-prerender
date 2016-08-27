/*
 * @module koa-prerender
 *
 * @author Peter Marton, Gergely Nemeth
 */

var url = require('url');
var request = require('request');
var debug = require('debug')('koa-prerender-m');

var requestGet = function(options) {
  return new Promise(function(resolve, reject) {
    request(options, function(error, response, result) {
      // console.log(this)
      if (error)
        return reject(error);
      resolve(result);
    });
  });
}

var crawlerUserAgentsDefault = [
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'developers.google.com/+/web/snippet'
];

var extensionsToIgnoreDefault = [
  '.js',
  '.css',
  '.xml',
  '.less',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.pdf',
  '.doc',
  '.txt',
  '.ico',
  '.rss',
  '.zip',
  '.mp3',
  '.rar',
  '.exe',
  '.wmv',
  '.doc',
  '.avi',
  '.ppt',
  '.mpg',
  '.mpeg',
  '.tif',
  '.wav',
  '.mov',
  '.psd',
  '.ai',
  '.xls',
  '.mp4',
  '.m4a',
  '.swf',
  '.dat',
  '.dmg',
  '.iso',
  '.flv',
  '.m4v',
  '.torrent'
];

/*
 * Should pre-render?
 *
 * @method shouldPreRender
 * @param {Object} options
 * @return {Boolean}
 */
function shouldPreRender(options) {
  var extensionsToIgnore = options.extensionsToIgnore || extensionsToIgnoreDefault;
  var crawlerUserAgents = options.crawlerUserAgents || crawlerUserAgentsDefault;
  var hasExtensionToIgnore = extensionsToIgnore.some(function(extension) {
    return options
      .url
      .indexOf(extension) !== -1;
  });

  var isBot = crawlerUserAgents.some(function(crawlerUserAgent) {
    return options
      .userAgent
      .toLowerCase()
      .indexOf(crawlerUserAgent.toLowerCase()) !== -1;
  });

  // do not pre-rend when:
  if (!options.userAgent) {
    return false;
  }

  if (options.method !== 'GET') {
    return false;
  }

  if (hasExtensionToIgnore) {
    return false;
  }

  // do pre-render when:
  var query = url
    .parse(options.url, true)
    .query;
  if (query && query.hasOwnProperty('_escaped_fragment_')) {
    return true;
  }

  if (options.bufferAgent) {
    return true;
  }

  return isBot;
}

/*
 * Pre-render middleware
 *
 * @method preRenderMiddleware
 * @param {Object} options
 */
module.exports = function preRenderMiddleware(options) {
  options = options || {};
  options.prerender = options.prerender;

  /*
   * Pre-render
   *
   * @method preRender
   * @param {Generator} next
   */
  return function * preRender(next) {
    var protocol = options.protocol || this.protocol;
    var host = options.host || this.host;
    var headers = {
      'User-Agent': this.get('user-agent')
    };

    var isPreRender = shouldPreRender({
      userAgent: this.get('user-agent'),
      bufferAgent: this.get('x-bufferbot'),
      method: this.method,
      url: this.url
    });

    var body = '';

    var renderUrl;
    var preRenderUrl;
    var result;

    // Pre-render generate the site and return
    if (isPreRender) {
      renderUrl = protocol + '://' + host + this.url;
      preRenderUrl = options.prerender + renderUrl;
      // console.log(preRenderUrl)
      result = yield requestGet({
        'auth': {
          'user': options.username,
          'pass': options.password,
          'sendImmediately': true
        },
        method: 'GET',
        url: preRenderUrl,
        headers: headers,
        gzip: true
      });
      // console.log(result)
      // yield * next;

      this.body = result.toString();
      this.set('X-Prerender', 'true');
    } else {
      yield * next;
      this.set('X-Prerender', 'false');
    }
  };
};
