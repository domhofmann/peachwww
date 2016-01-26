var express = require('express');
var app = express();
var env = process.env.NODE_ENV || 'development';

require('dotenv').config();

var imgurClientID = process.env.IMGUR_CLIENT_ID;
if (!imgurClientID) {
  console.log('ERROR: IMGUR_CLIENT_ID is not set. Please set process.env.IMGUR_CLIENT_ID (or use a .env file if running locally)');
}

var embedlyAPIKey = process.env.EMBEDLY_API_KEY;
if (!embedlyAPIKey) {
  console.log('ERROR: EMBEDLY_API_KEY is not set. Please set process.env.EMBEDLY_API_KEY (or use a .env file if running locally)')
}

var forceSSL = function (req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  return next();
};

if (env === 'production') {
    app.use(forceSSL);
}

app.set('view engine', 'ejs');

var proxy = require('http-proxy-middleware');
app.use(
  proxy('/api', {
    target: 'https://v1.peachapi.com',
    changeOrigin: true,
    pathRewrite: {
      '^/api': ''
    },
  })
);

app.use(
  proxy('/imgur', {
    target: 'https://api.imgur.com/3/image',
    changeOrigin: true,
    pathRewrite: {
      '^/imgur': ''
    },
    onProxyReq: function (proxyReq, req, res) {
      proxyReq.setHeader('Authorization', 'Client-ID ' + imgurClientID);
    }
  })
);

app.use('/static', express.static('public'));

var request = require('request');

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/version', function (req, res) {
  res.send({'build': 2});
});

app.get('/embedly', function (req, res) {
  request.get({
    'url': 'https://api.embed.ly/1/extract',
    'qs': {
      'url': req.query.url,
      'key': embedlyAPIKey
    }
  }, function (error, response, body) {
    res.send(JSON.parse(body));
  });
});

app.get('/embedly/oembed', function (req, res) {
  request.get({
    'url': 'https://api.embed.ly/1/oembed',
    'qs': {
      'url': req.query.url,
      'key': embedlyAPIKey
    }
  }, function (error, response, body) {
    res.send(JSON.parse(body));
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('App started on port ' + port);
});
