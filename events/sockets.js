const events = require('events')
const emitter = new events.EventEmitter()

let io

const initializeSockets = sockets => {
  io = sockets
}

emitter.on('notify-user', ({ token, event, data }) => {
  io.notifyUser(token, event, data)
})

module.exports = {
  emitter,
  initializeSockets
}