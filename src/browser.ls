'use strict'
socket = require('socket.io-client')()

socket.on \news console.log.bind(console)

vote = (vid) ->
    msg <- socket.emit \vote, uid: me, vote: vid
    console.log msg

unvote = (vid) ->
    msg <- socket.emit \vote, uid: me, unvote: vid
    console.log msg

join = (user) ->
    uuid <- socket.emit \join, user
    localStorage.setItem('uuid', uuid)
    me = uuid
    console.log me

me = localStorage.getItem('uuid')
user = name: '小宇哥'

if me
    msg <- socket.emit \back, me
    console.log msg
else
    join user

window.socket = socket
window.vote = vote
window.unvote = unvote
