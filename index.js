var express = require('express');
var app = express();

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

var requestWithStreamToken = function (method, action, options, callback) {
  options = options || {};
  options['method'] = method;
  options['uri'] = 'http://localhost:3000/api/' + action;
  options['auth'] = {'bearer': TEST_TOKEN};
  request(options, callback);
};

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
