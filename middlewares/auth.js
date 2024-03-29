const User = require('../models/user')
const WebTorrent = require('webtorrent-hybrid')
const errors = require('../errors')
const clientsManager = require('../services/clients')

exports.fetchClient = async (req, res, next) => {
  const token = req.headers['token'] || req.query.token
  let client = clientsManager.findClient(token)

  if (!client) {
    return errors.handler(req, res)(new errors.UnauthenticatedAccess('No torrent client'))
  }

  req.client = client
  next()
}

const createClient = connectedUsers => {
  return token => {
    let client = new WebTorrent()
    let stats = {
      progress: 0,
      downloadSpeed: 0,
      ratio: 0
    }
  
    let errorMessage = ''
  
    client.on('error', function (err) {
      errorMessage = err.message
    })
  
    client.on('torrent', function () {
      const userClient = connectedUsers.get(String(token))
  
      userClient.status = 'downloading'
      console.log('Torrent added')
    })
  
    client.on('download', function (bytes) {
      stats = {
        progress: Math.round(client.progress * 100 * 100) / 100,
        downloadSpeed: client.downloadSpeed,
        ratio: client.ratio
      }
  
      const userClient = connectedUsers.get(String(token))
      userClient.stats = stats
    })
  
    return {
      token,
      client,
      stats,
      errorMessage
    }
  }
}

const findUserWithToken = async token => {
  const user = await User.findOne()
    .where('token').equals(token)
    .where('status').equals('approved')
    .where('deletedAt').exists(false)
    .exec()
  
  return user
}

exports.tokenMiddleware = async (req, res, next) => {
  var token = req.headers['token'] || req.query.token

  // Missing token
  if (!token || token.length !== 120) {
    return errors.handler(req, res)(new errors.UnauthenticatedAccess('Missing token'))
    // We have a token
  } else {
    const user = await findUserWithToken(token)
    if (!user) {
      return errors.handler(req, res)(new errors.UnauthenticatedAccess('Token is invalid'))
    }

    req.user = user
    next()
  }
}

exports.force_https = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url)
    }
  }
  next()
}
