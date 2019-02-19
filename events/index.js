const sockets = require('./sockets')

exports.init = io => new Promise((resolve) => {
  sockets.initialize(io)
  resolve()
})