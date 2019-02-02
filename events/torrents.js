const events = require('events')
const emitter = new events.EventEmitter()
const { emitter: sockets } = require('./sockets')

emitter.on('done', ({data, token}) => {
  console.log('Done!')
  sockets.emit('notify-user', {
    token,
    event: 'torrents',
    data
  })
})

module.exports = emitter
