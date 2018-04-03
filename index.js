/*
 * @module koa-prerender
 *
 * @author Peter Marton, Gergely Nemeth
 */

const url = require('url');
const request = require('request');
const debug = require('debug')('koa-prerender-m');

// 默认的爬虫agent列表
const crawlerUserAgentsDefault = [
  'baiduspider',
  'iaskspider',
  'sogou web spider',
  'sogou push spider',
  'yodaobot',
  'msnbot',
  'sosospider',
  'sosoimagespider',
  'yahoo! slurp',
  'sogou web spider',
  '360spider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkShare',
  'W3C_Validator',
  'developers.google.com/+/web/snippet'
];

// 默认排除的后缀名
const extensionsToIgnoreDefault = [
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
  '.torrent',
  'ttf',
  'woff',
  'svg',
  'eot'
];

/*
 * Should pre-render?
 *
 * @method shouldPreRender
 * @param {Object} options
 * @return {Boolean}
 */
function shouldPreRender(options) {
  let extensionsToIgnore = options.extensionsToIgnore;
  let crawlerUserAgents = options.crawlerUserAgents;
  let hasExtensionToIgnore = extensionsToIgnore.some(function(extension) {
    return options
      .url
      .indexOf(extension) !== -1;
  });

  let isBot = crawlerUserAgents.some(function(crawlerUserAgent) {
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
  let query = url
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
  options.fullpage = typeof options.fullpage == 'undefined' 
    ? true : options.fullpage;
  // options.username
  // options.password
  // options.protocol
  // options.host
  // options.fullpage
  // options.renderType

  /*
   * Pre-render
   *
   * @method preRender
   * @param {Generator} next
   */
  return async function preRender(ctx, next) {
    let protocol = options.protocol || ctx.protocol;
    let host = options.host || ctx.host;
    let headers = {
      'User-Agent': ctx.get('user-agent'),
      'Content-Type': 'application/json',
    };

    let isPreRender = shouldPreRender({
      userAgent: ctx.get('user-agent'),
      bufferAgent: ctx.get('x-bufferbot'),
      method: ctx.method,
      url: ctx.url,
      extensionsToIgnore: options.extensionsToIgnore,
      crawlerUserAgents: options.crawlerUserAgents,
    });

    let renderUrl;
    let app = ctx;

    let requestGet = function(args) {
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
      await requestGet({
        'auth': {
          'user': options.username,
          'pass': options.password,
          'sendImmediately': true
        },
        method: 'POST',
        url: options.prerender,
        body: JSON.stringify({
          renderType: options.renderType || 'html',
          fullpage: !!options.fullpage,
          url: renderUrl,
          userAgent: 'Prerender (+https://github.com/prerender/prerender)',
        }),
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
