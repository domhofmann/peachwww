var StreamToken = localStorage.getItem('streamToken');

var SetStreamToken = function (token) {
  localStorage.setItem('streamToken', token);
  StreamToken = localStorage.getItem('streamToken');
}

var Request = {
  withStreamToken: function (method, action, obj, options) {
    options = options || {};
    options['method'] = method;
    options['url'] = '/api/' + action;
    options['headers'] = options['headers'] || {};
    options['headers']['Authorization'] = 'Bearer ' + StreamToken;

    if (obj) {
      options['data'] = JSON.stringify(obj);
    }

    $.ajax(options);
  },

  withoutToken: function (method, action, obj, options) {
    options = options || {};
    options['method'] = method;
    options['url'] = '/api/' + action;

    if (obj) {
      options['data'] = JSON.stringify(obj);
    }

    $.ajax(options);
  }
};
