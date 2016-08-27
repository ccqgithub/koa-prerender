# koa-prerender-m

[koa](https://github.com/koajs/koa) middleware for [prerender](https://github.com/prerender/prerender) server。

## 安装配置

安装：

`npm install --save koa-prerender-m`;

配置：

```
var prerender = require('koa-prerender-m');
app.use(prerender({
  prerender: 'http://www.myprerender.io/', // prerender 服务器地址
  protocol: 'http',                        // 默认为this.protocol
  host: 'www.baidu.com',                   // 默认为this.host
  username: 'test',                        // basic auth username
  password: 'test',                        // basic auth password
  extensionsToIgnore: [],                  // 忽略扩展名
  crawlerUserAgents: []                    // 适用user agents
}));
```

## extensionsToIgnoreDefault
```
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
```

## crawlerUserAgentsDefault
```
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
```
