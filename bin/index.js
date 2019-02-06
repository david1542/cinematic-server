const config = require('../config')
const app = require('../app/index')

const server = require('http').Server(app)
const sockets = require('../services/socket')

sockets.initialize(server)
  .then(() => {
    return app.initialize(sockets)
  })
  .then(() => {
    server.listen(config.PORT, function(){
      console.log('Server is listening on port %s', 3000)
    })
  })