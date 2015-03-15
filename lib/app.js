// Generated by LiveScript 1.3.1
'use strict';
var http, path, fs, Promise, uuid, co, koa, browserify, websocket, level, livefeed, db, update, app, server, io, tid, gid, now, prefix, live, voting, voted, joined, players;
http = require('http');
path = require('path');
fs = require('fs');
Promise = require('bluebird');
uuid = require('uuid');
co = require('co');
koa = require('koa');
browserify = require('browserify');
websocket = require('websocket-stream');
level = require('level');
livefeed = require('level-livefeed');
db = level(path.join(__dirname, '..', 'data'), {
  valueEncoding: 'json'
});
Promise.promisifyAll(db);
update = db.createReadStream({
  gt: ''
});
update.on('data', console.log.bind(console));
(function(){
  return db.put('a', {
    b: 'c'
  }, function(err){
    console.error('err', err);
    return db.get('a', function(err, val){
      console.error('err', err);
      return console.log('val', val);
    });
  });
})();
app = koa();
app.use(function*(next){
  if (this.url !== '/browser.js') {
    return yield next;
  }
  this.type = 'js';
  this.body = browserify({
    basedir: __dirname,
    entries: ['./browser.js']
  }).bundle();
});
app.use(function*(next){
  if (this.url !== '/justice') {
    return yield next;
  }
  this.type = 'html';
  this.body = fs.createReadStream(path.join(__dirname, '..', 'views', 'justice.html'));
});
app.use(function*(){
  this.type = 'html';
  this.body = fs.createReadStream(path.join(__dirname, '..', 'views', 'player.html'));
});
server = http.createServer(app.callback());
io = require('socket.io')(server);
tid = 'v0.1';
gid = 1;
now = function(){
  return (new Date).toISOString();
};
prefix = tid + "|" + now() + "|" + gid;
function newGame(){
  gid = gid + 1;
  return prefix = tid + "|" + now() + "|" + gid;
}
live = livefeed(db, {
  start: tid + "{"
});
live.on('data', console.log.bind(console, 'data'));
voting = {};
voted = {};
live.on('data', function(data){
  console.log('d2', data);
  if (data.key.match(/\|_$/)) {
    voting = {};
    voted = {};
  }
  if (data.key.match(/\|vote$/)) {
    return calculateVote(data);
  }
});
setTimeout(function(){
  return console.log({
    voting: voting,
    voted: voted
  });
}, 2000);
function calculateVote(data){
  var ref$, uid, vote, unvote;
  ref$ = data.value, uid = ref$.uid, vote = ref$.vote, unvote = ref$.unvote;
  if (vote) {
    if (!voting[uid]) {
      voting[uid] = {};
    }
    voting[uid][vote] = 1;
    if (!voted[vote]) {
      voted[vote] = {};
    }
    voted[vote][uid] = 1;
  } else if (unvote) {
    if (!voting[uid]) {
      voting[uid] = {};
    }
    delete voting[uid][unvote];
    if (!voted[unvote]) {
      voted[unvote] = {};
    }
    delete voted[unvote][uid];
  }
  return console.log('calv', {
    voting: voting,
    voted: voted
  });
}
joined = {};
players = {};
io.on('connection', function(socket){
  socket.emit('news', {
    hello: 'world'
  });
  socket.on('vote', co.wrap(function*(v, cb){
    console.log(v);
    if (v.vote) {
      yield db.putAsync(prefix + "|vote", {
        uid: v.uid,
        vote: v.vote
      });
      console.log(prefix + "|vote", {
        uid: v.uid,
        vote: v.vote
      });
    }
    if (v.unvote) {
      yield db.putAsync(prefix + "|vote", {
        uid: v.uid,
        unvote: v.unvote
      });
      console.log(prefix + "|vote", {
        uid: v.uid,
        unvote: v.unvote
      });
    }
    console.log({
      voting: voting,
      voted: voted
    });
    cb(true);
  }));
  socket.on('iamjustice', function(cb){
    return cb({
      voting: voting,
      voted: voted
    });
  });
  socket.on('back', function(uid, cb){
    return cb('ok');
  });
  socket.on('new', co.wrap(function*(uid, cb){
    yield db.putAsync(prefix + "|_", true);
  }));
  return socket.on('join', function(user, cb){
    user.id = uuid.v4();
    joined[user.id] = user;
    cb(user.id);
    return console.log(joined);
  });
});
server.listen(8080);