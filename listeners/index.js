const amqp = require('amqplib')
const torrents = require('./torrents')
const config = require('../config')
const logging = require('../logging')

let timer
let connections = {}

let retryConnection = () => {
  logging.warn('Trying to connect to amqp after 5000ms')
  timer = setTimeout(() => {
    tryConnection()
  }, 5000)
}

let tryConnection = () => {
  return amqp
    .connect(config.AMQP_URI)
    .then((_conn) => {
      console.log('Connected to amqp!')
      logging.info('Connected to amqp!')
      connections['amqp'] = _conn
      clearTimeout(timer)
      _conn.on('close', retryConnection)
      _conn.on('error', logging.error)
    })
    .catch((error) => {
      logging.error(error)
      retryConnection()
    })
}

exports.init = () => {
  return amqp
    .connect(config.AMQP_URI)
    .then((_conn) => {
      console.log('Connected to amqp on URI: ' + config.AMQP_URI)
      _conn.on('close', retryConnection)
      _conn.on('error', logging.error)
      connections['amqp'] = _conn
      return Promise.all([
        torrents.init(connections)
      ])
    })
}
