const events = require('events')
const emitter = new events.EventEmitter()
const { emitter: sockets } = require('./sockets')
const clientsManager = require('../services/clients')

emitter.on('create-client', token => {
  clientsManager.createClient(token)
})

emitter.on('destroy-client', token => {
  clientsManager.removeClient(token)
})

emitter.on('done', ({data, token}) => {
  console.log('Done!')
  sockets.emit('notify-user', {
    token,
    event: 'torrents',
    data
  })
})

module.exports = emitter
