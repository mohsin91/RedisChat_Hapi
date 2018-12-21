var Hapi = require('hapi');
const express = require('express');
const app = express();
var server = new Hapi.Server();

server.connection({
  host: '192.168.0.171',
  port: '8056',
});

// function handleRedirect(req, res) {
//   debugger;
//   // res.redirect(req.originalUrl);
// }


// app.get('*', handleRedirect);

server.register([require('inert'), require('hapi-error')], function() {
  server.route([
    { method: 'GET', path: '/', handler: { file: './src/client/login.html' } },
    { method: 'GET', path: '/contacts', handler: { file: 'contacts.html' } },
     { method: 'GET', path: '/chat', handler: { file: 'index.html' } },
    // switch these two routes for a /static handler?
    { method: 'GET', path: '/login.js', handler: { file: './src/client/login.js' } },
    { method: 'GET', path: '/client.js', handler: { file: './lib/client.js' } },
    { method: 'GET', path: '/style.css', handler: { file: './style.css' } },
    {
      method: 'GET',
      path: '/load',
      handler: require('./lib/load_messages').load,
    },
    {
      method: 'GET',
      path: '/elm',
      handler: {
        file: './elm/index.html',
      },
    },
    {
      method: 'GET',
      path: '/js/app.js',
      handler: {
        file: './elm/js/app.js',
      },
    },
    {
      method: 'GET',
      path: '/js/javascript.js',
      handler: {
        file: './elm/js/javascript.js',
      },
    },
  ]);

  server.start(function() {
    require('./src/socket/index.js').init(server.listener, function() {
      // console.log('REDISCLOUD_URL:', process.env.REDISCLOUD_URL);
      console.log(
        'Feeling Chatty?',
        'listening on: http://192.168.0.171:8056'
      );
    });
  });
});

 module.exports = server;
