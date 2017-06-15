'use strict';
let http = require('http');
let fs = require('fs');
let Game = require('./game');
// let url = require('url');

http.createServer(function (req, res) {
  switch (req.url) {
    case '/':
      sendFile('game2.html', res);
      break;
    case '/style.css':
      sendFile('style.css', res);
      break;

    case '/queue':
      let cookie = parseCookies(req);
      console.log('gameId' + cookie.gameId);
      if (cookie.gameId !== undefined) {
        let aGame = Game.getActiveGame(cookie.gameId);
        if (aGame && aGame.updatePlayer(cookie.id, res)) {
          aGame.sendProgress(cookie.id);
          break;
        }
      }
      Game.addToQueue(cookie, res);
      break;

    case '/wait':
      Game.wait(parseCookies(req), res);
      break;

    case '/step':
      let body = '';
      req
        .on('readable', function() {
          let buffer = req.read();
          body += (buffer !== null) ? buffer : '';
          if (body.length > 1e4) {
            res.statusCode = 413;
            res.end("Your message is too big for my little chat");
          }
        })
        .on('end', function() {
          try {
            body = JSON.parse(body);
          } catch (e) {
            res.statusCode = 400;
            res.end("Bad Request");
            return;
          }
          let cookie = parseCookies(req);
          let resp = Game.makeStep(+cookie.gameId, cookie.id, body.pos);
          if (resp) {
            res.end(resp);
          }
        });
      break;

    default:
      res.statusCode = 404;
      res.end('Not found');
  }

}).listen(1373);

function sendFile(fileName, res) {
  let fileStream = fs.createReadStream(fileName);
  fileStream
    .on('error', function () {
      res.statusCode = 500;
      res.end('Server error: send file');
    })
    .pipe(res)
    .on('close', function () {
      fileStream.destroy();
    })
}

function parseCookies (request) {
  let list = {},
    rc = request.headers.cookie;

  rc && rc.split(';').forEach(function( cookie ) {
    let parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });

  return list;
}