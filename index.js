/*
 * @module koa-prerender
 *
 * @author Peter Marton, Gergely Nemeth
 */

var url = require('url');
var request = require('request');
var debug = require('debug')('koa-prerender-m');

// 默认的爬虫agent列表
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

// 默认排除的后缀名
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
  var extensionsToIgnore = options.extensionsToIgnore;
  var crawlerUserAgents = options.crawlerUserAgents;
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

  if (query && Object.hasOwnProperty.call(query, "_escaped_fragment_")) {
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
  options.extensionsToIgnore = options.extensionsToIgnore || extensionsToIgnoreDefault;
  options.crawlerUserAgents = options.crawlerUserAgents || crawlerUserAgentsDefault;
  options.redirectStatusCodes = options.redirectStatusCodes || [301, 302];
  // options.username
  // options.password
  // options.protocol
  // options.host

  /*
   * Pre-render
   *
   * @method preRender
   * @param {Generator} next
   */
  return async function preRender(ctx, next) {
    var protocol = options.protocol || ctx.protocol;
    var host = options.host || ctx.host;
    var headers = {
      'User-Agent': ctx.get('user-agent')
    };

    var isPreRender = shouldPreRender({
      userAgent: ctx.get('user-agent'),
      bufferAgent: ctx.get('x-bufferbot'),
      method: ctx.method,
      url: ctx.url,
      extensionsToIgnore: options.extensionsToIgnore,
      crawlerUserAgents: options.crawlerUserAgents,
    });

    var body = '';

    var renderUrl;
    var preRenderUrl;
    var result;
    var app = ctx;

    var requestGet = function(args) {
      return new Promise(function(resolve, reject) {
        request(args, function(error, response, result) {
          var statusCode = response.statusCode;

          if (error)
            return reject(error);

          app.body = result.toString();
          app.set('X-Prerender', 'true');

          if (options.redirectStatusCodes.indexOf(statusCode) != -1 && response.headers.location) {
            app.status = statusCode;
            app.redirect(response.headers.location);
          }

          resolve(result);
        });
      });
    }

    // Pre-render generate the site and return
    if (isPreRender) {
      renderUrl = protocol + '://' + host + ctx.url;
      preRenderUrl = options.prerender + renderUrl;
      // console.log(preRenderUrl)
      await requestGet({
        'auth': {
          'user': options.username,
          'pass': options.password,
          'sendImmediately': true
        },
        method: 'GET',
        url: preRenderUrl,
        headers: headers,
        gzip: true,
        followRedirect: false
      });
    } else {
      await next();
      ctx.set('X-Prerender', 'false');
    }
  };
};
