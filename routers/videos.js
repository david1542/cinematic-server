module.exports = (io) => {
  const express = require('express')
  const router = express.Router()
  // const WebTorrent = require('webtorrent-hybrid')
  const auth = require('../middlewares/auth')
  const middlewares = require('../middlewares')
  const controller = require('../controllers/video')(io)

  const connectedUserClients = new Map()

  router.use(middlewares.operatingSystem)
  router.get('/subtitles', controller.getSubtitles)

  router.use(auth.authenticateClient(connectedUserClients))
  // router.use(auth.tokenMiddleware)
  // router.use(function (req, res, next) {
  //   let client = connectedUserClients.get(String(req.user._id))

  //   if (!client) {
  //     client = createClient(req.user._id)
  //     connectedUserClients.set(String(client.userId), client)
  //   }

  //   req.client = client

  //   next()
  // })


  router.get('/stream/:magnet/pause', controller.pauseTorrent)
  router.get('/stream', controller.stream)
  router.post('/add/:magnet', controller.addTorrent)
  router.get('/torrents', controller.searchTorrents)
  router.get('/stats', controller.getStats)

  return router
}
