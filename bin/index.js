const config = require('../config')
const app = require('../app')

const server = require('http').Server(app)
const sockets = require('../services/socket')(server)

app.initialize(sockets)
  .then(() => {
    server.listen(config.PORT, function(){
      console.log('Server is listening on port %s', 3000)
    })
  })