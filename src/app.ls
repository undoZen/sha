'use strict';

require! http
require! path
require! fs
Promise = require \bluebird
require! uuid
require! co
require! koa
require! browserify
websocket = require \websocket-stream
require! level
livefeed = require \level-livefeed
db = level path.join(__dirname, '..', 'data'), valueEncoding: 'json'
Promise.promisifyAll db

update = db.createReadStream gt: ''
update.on \data, console.log.bind(console)

(->
    err <- db.put \a, b: \c
    console.error 'err', err
    err, val <- db.get \a
    console.error 'err', err
    console.log \val, val
)!

app = koa!

app.use (next) ->*
    unless @url is '/browser.js'
        return yield next
    @type = 'js'
    @body = browserify({
        basedir: __dirname,
        entries: ['./browser.js']
    }).bundle()

app.use (next) ->*
    unless @url is '/justice'
        return yield next
    @type = 'html'
    @body = fs.createReadStream(path.join(__dirname, '..', 'views', 'justice.html'))

app.use ->*
    @type = 'html'
    @body = fs.createReadStream(path.join(__dirname, '..', 'views', 'player.html'))

server = http.createServer app.callback!
io = require('socket.io')(server)

tid = 'v0.1'
gid = 1
now = ->
    (new Date).toISOString!
prefix = "#tid|#{now!}|#gid"
function newGame
    gid := gid + 1
    prefix := "#tid|#{now!}|#gid"

live = livefeed db, start: "#tid{"
live.on \data, console.log.bind console, \data

voting = {}
voted = {}
live.on \data, (data) ->
    console.log 'd2', data
    if data.key.match /\|_$/
        voting := {}
        voted := {}
    if data.key.match /\|vote$/
        calculateVote(data)

setTimeout((->
    console.log {voting, voted}
), 2000)

function calculateVote(data)
    {uid, vote, unvote} = data.value
    if vote
        unless voting[uid]
            voting[uid] = {}
        voting[uid][vote] = 1
        unless voted[vote]
            voted[vote] = {}
        voted[vote][uid] = 1
    else if unvote
        unless voting[uid]
            voting[uid] = {}
        delete voting[uid][unvote]
        unless voted[unvote]
            voted[unvote] = {}
        delete voted[unvote][uid]
    console.log 'calv', {voting, voted}

joined = {}
players = {}
io.on \connection, (socket) ->
    socket.emit \news, hello: \world
    socket.on \vote, co.wrap (v, cb) ->*
        console.log v
        if v.vote
            yield db.putAsync "#prefix|vote", v{uid, vote}
            console.log "#prefix|vote", v{uid, vote}
        if v.unvote
            yield db.putAsync "#prefix|vote", v{uid, unvote}
            console.log "#prefix|vote", v{uid, unvote}
        console.log {voting, voted}
        cb(true)

    socket.on  \iamjustice, (cb) ->
        cb {voting, voted}

    socket.on \back, (uid, cb) ->
        cb \ok

    socket.on \new, co.wrap (uid, cb) ->*
        yield db.putAsync "#prefix|_", true

    socket.on \join, (user, cb) ->
        user.id = uuid.v4!
        joined[user.id] = user
        cb(user.id)
        console.log joined

server.listen(8080)
