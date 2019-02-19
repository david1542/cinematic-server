const events = require('events')
const emitter = new events.EventEmitter()

let io

emitter.on('notify-user', ({ token, event, data }) => {
  io.notifyUser(token, event, data)
})

emitter.initialize = sockets => {
  io = sockets
}

module.exports = emitter;