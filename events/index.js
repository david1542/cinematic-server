const { initializeSockets } = require('./sockets')

exports.init = io => new Promise((resolve) => {
  initializeSockets(io)
  resolve()
})