module.exports = (io) => {
  const express = require('express')
  const router = express.Router()
  const WebTorrent = require('webtorrent-hybrid')
  const auth = require('../middlewares/auth')
  const middlewares = require('../middlewares')
  const controller = require('../controllers/video')(io)

  const connectedUserClients = new Map()

  router.use(middlewares.operatingSystem)
  router.get('/subtitles', controller.getSubtitles)

  router.use(auth.tokenMiddleware)
  router.use(function (req, res, next) {
    let client = connectedUserClients.get(String(req.user._id))

    if (!client) {
      client = createClient(req.user._id)
      connectedUserClients.set(String(client.userId), client)
    }

    req.client = client

    next()
  })

  function createClient (userId) {
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
      const userClient = connectedUserClients.get(String(userId))

      userClient.status = 'downloading'
      console.log('Torrent added')
    })

    client.on('download', function (bytes) {
      stats = {
        progress: Math.round(client.progress * 100 * 100) / 100,
        downloadSpeed: client.downloadSpeed,
        ratio: client.ratio
      }

      const userClient = connectedUserClients.get(String(userId))
      userClient.stats = stats
    })

    return {
      userId,
      client,
      stats,
      errorMessage
    }
  }

  router.get('/stream/:magnet/pause', controller.pauseTorrent)
  router.get('/stream', controller.stream)
  router.post('/add/:magnet', controller.addTorrent)
  router.get('/torrents', controller.searchTorrents)
  router.get('/stats', controller.getStats)

  return router
}
