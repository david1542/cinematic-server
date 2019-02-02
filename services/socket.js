module.exports = function (server) {
  const io = require('socket.io')(server)
  const User = require('../models/user')

  // Array of connected users
  const connectedUsers = new Map()

  io.on('connection', function (socket) {
    socket.on('authentication', ({ token }) => {
      User.findOne()
      .where('token').equals(token)
      .where('status').equals('approved')
      .exec(function(err, user) {
        if(err || !user) {
          return socket.emit('unauthorized')
        }
    
        socket.emit('authenticated')

        // Initializing event handlers
        initialize(user._id, socket)
      })
    })
  })

  const removeSocketId = socketId => {
    Object.keys(connectedUsers).forEach(function (key) {
      if (connectedUsers.get(key) === socketId)
        connectedUsers.delete(key)
    })
  }

  const initialize = (userId, socket) => {
    console.log('User with id ' + userId + ' has connected')
    connectedUsers.set(String(userId), socket.id);

    socket.on('disconnect', function () {
      console.log(`User with socket id ${socket.id} has disconnected`)
      removeSocketId(socket.id)
    })
  }

  const notifyUser = (userId, event, payload) => {
    return new Promise(function (resolve, reject) {
      const notifiedSocket = connectedUsers.get(String(userId))

      // Notify user if he's logged in 
      if (notifiedSocket) {
        io.to(notifiedSocket).emit(event, payload)
        resolve(payload)
      } else {
        reject('User not found')
      }
    })
  }

  return {
    notifyUser
  }
}