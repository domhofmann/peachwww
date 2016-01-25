var express = require('express');
var app = express();
var env = process.env.NODE_ENV || 'development';

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
app.use('/static', express.static('public'));

var request = require('request');

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/stream', function (req, res) {
  requestWithStreamToken('GET', 'connections', null, function (error, response, body) {
    console.log(body);
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('App started on port ' + port);
});
