const socketIo = require('socket.io')
const User = require('../models/user')
const torrents = require('../events/torrents')

class SocketManager {
  constructor() {
    this.io = null
    this.connectedUsers = new Map()

    this.initialize = this.initialize.bind(this)
    this.initiateUser = this.initiateUser.bind(this)
    this.notifyUser = this.notifyUser.bind(this)
    this.removeSocketId = this.removeSocketId.bind(this)
  }

  initialize(server) {
    return new Promise(resolve => {
      this.io = socketIo(server)
      this.io.on('connection', socket => {
        socket.on('authentication', ({ token }) => {
          User.findOne()
          .where('token').equals(token)
          .where('status').equals('approved')
          .exec((err, user) => {
            if(err || !user) {
              return socket.emit('unauthorized')
            }
        
            socket.emit('authenticated')
    
            // Initializing event handlers
            this.initiateUser(user.token, socket)
          })
        })
      })

      resolve(this)
    })
  }

  initiateUser(token, socket) {
    // Creating a new torrent client
    torrents.emit('create-client', token)

    console.log('User with token ' + token + ' has connected')
    this.connectedUsers.set(token, socket.id);

    socket.on('disconnect', () => {
      // Destroying the torrent client
      torrents.emit('destroy-client', token)
      
      console.log(`User with socket id ${socket.id} has disconnected`)
      this.removeSocketId(socket.id)
    })
  }

  removeSocketId(socketId) {
    Object.keys(this.connectedUsers).forEach(key => {
      if (this.connectedUsers.get(key) === socketId) {
        this.connectedUsers.delete(key)
      }
    })
  }

  notifyUser(token, event, payload) {
    return new Promise((resolve, reject) => {
      const notifiedSocket = this.connectedUsers.get(token)

      // Notify user if he's logged in 
      if (notifiedSocket) {
        this.io.to(notifiedSocket).emit(event, payload)
        resolve(payload)
      } else {
        reject('User not found')
      }
    })
  }
}

module.exports = new SocketManager()