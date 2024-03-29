const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const middlewares = require('../middlewares')
const controller = require('../controllers/video')

router.use(middlewares.operatingSystem)
router.get('/subtitles', controller.getSubtitles)

router.use(auth.fetchClient)

router.get('/stream/:magnet/pause', controller.pauseTorrent)
router.get('/stream', controller.stream)
router.post('/add/:magnet', controller.addTorrent)
router.get('/torrents', controller.searchTorrents)
router.get('/stats', controller.getStats)

module.exports = router