const express = require('express')
const router = express.Router()
const fs = require('fs')
const https = require('https')
const crypto = require('crypto')
const WebTorrent = require('webtorrent')
const torrentSearch = require('torrent-search-api')
const async = require('async')
const OS = require('opensubtitles-api')
const path = require('path')
const srt2vtt = require('srt2vtt')
const streamifier = require('streamifier')
const rimraf = require('rimraf')
const Sniffr = require('sniffr')
const auth = require('../middlewares/auth')
const config = require('../config')
const utils = require('../utils')
const OpenSubtitles = new OS(config.OPENSUBTITLES_SETTINGS)

router.use(function (req, res, next) {
  const userAgent = req.headers['user-agent']
  const s = new Sniffr()

  s.sniff(userAgent)
  req.os = s.os

  next()
})

function tryConnect () {
  try {
    // Login to open subtitles api
    OpenSubtitles.login()
  } catch (err) {
    console.log('Error in connecting to Open Subtitles')
    tryConnect()
  }
}

tryConnect()
console.log('Connected to Open Subtitles')
const connectedUserClients = new Map()

router.get('/subtitles', async function (req, res, next) {
  if (!req.query.query && !req.query.langcode) return res.sendStatus(400)

  const { filename } = req.query
  const options = {
    ...req.query
  }

  if (!options.limit) {
    options.limit = 'all'
  }
  if (!options.extensions) {
    options.extensions = ['srt', 'vtt']
  }

  options.filename = undefined
  let subtitles
  try {
    subtitles = await OpenSubtitles.search(options)
  } catch (err) {
    return res.sendStatus(500)
  }

  const lang = subtitles[options.langcode]

  if (!lang) return res.sendStatus(404)

  const arrayOfNames = lang.map(file => {
    const array = file.filename.split(/[.-]+/)
    array.pop()

    return array
  })

  let highestMatch = 0
  let bestIndex = 0

  const likeWords = {
    'x264': 'h264',
    'h264': 'x264'
  }

  arrayOfNames.forEach((nameArr, index) => {
    let counter = 0
    nameArr.forEach(part => {
      if (filename.includes(part) || filename.includes(likeWords[part.toLowerCase()])) {
        counter++
      }
    })

    if (counter > highestMatch) {
      bestIndex = index
      highestMatch = counter
    } else if (counter === highestMatch) {
      if (lang[index].downloads > lang[bestIndex].downloads) {
        bestIndex = index
        highestMatch = counter
      }
    }
  })

  const match = lang[bestIndex]
  const parts = match.filename.split('.')
  const fileType = '.' + parts[parts.length - 1]
  const fileName = crypto.randomBytes(40).toString('hex')
  const appDir = path.dirname(require.main.filename)
  const remoteDir = appDir + '/tmp/' + fileName + fileType
  const tmpFile = fs.createWriteStream(remoteDir)

  function tryDownload () {
    https.get(match.url, response => {
      if (!(response.pipe)) {
        tryDownload()
      }

      response.pipe(tmpFile)
    })
  }

  tmpFile.on('open', () => {
    tryDownload()
  })

  tmpFile.on('finish', () => {
    var data = fs.readFileSync(remoteDir)

    srt2vtt(data, 1255, (err, vttData) => {
      if (err) return res.sendStatus(500)
      const outputDir = appDir + '/tmp/' + fileName + '.vtt'

      fs.writeFileSync(outputDir, vttData)

      const subtitlesStream = streamifier.createReadStream(vttData)
      const subtitlesName = parts.slice(0, parts.length - 2).join('.') + '.vtt'
      res.set('Content-Type', 'mime/vtt')
      res.set('Content-Disposition', 'attachment; filename=' + subtitlesName)

      // Sending files to the user
      subtitlesStream.pipe(res)

      res.on('finish', () => {
        fs.unlinkSync(outputDir)
        fs.unlinkSync(remoteDir)
      })
    })
  })
})

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

router.get('/stream/:magnet/pause', function (req, res) {
  const { magnet } = req.params
  const { client } = req.client

  try {
    client.remove(magnet, function (err) {
      if (err) throw new Error(err)

      const torrentPath = req.os.name === 'windows' ? 'C:/cinematic/movies' : '/cinematic/movies'
      rimraf(torrentPath, function () {
        console.log('Removed torrents data')

        res.sendStatus(200)
      })
    })
  } catch (err) {
    res.sendStatus(500)
  }
})

router.get('/stream', function (req, res) {
  const {
    client
  } = req.client
  const {
    magnet
  } = req.query
  let torrent = client.get(magnet)

  if (!torrent) return res.sendStatus(404)

  let file = torrent.files[0]

  for (let i = 1; i < torrent.files.length; i++) {
    if (torrent.files[i].length > file.length) {
      file = torrent.files[i]
    }
  }

  let range = req.headers.range
  if (!range) {
    let err = new Error('Wrong range')
    err.status = 416

    return res.status(416).json(err)
  }

  let positions = range.replace(/bytes=/, '').split('-')
  let start = parseInt(positions[0], 10)
  let fileSize = file.length

  let end = positions[1] ? parseInt(positions[1], 10) : fileSize - 1
  let chunksize = (end - start) + 1
  let head = {
    'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'video/mp4'
  }

  res.writeHead(206, head)

  let streamPosition = {
    start: start,
    end: end
  }

  let stream = file.createReadStream(streamPosition)

  stream.pipe(res)
  stream.on('error', function (err) {
    console.log(err)
  })
})

router.post('/add/:magnet', function (req, res) {
  console.log('Adding torrent...')
  let magnet = req.params.magnet
  const {
    client
  } = req.client

  const torrent = client.get(magnet)
  if (torrent) {
    torrent.resume()
    processTorrent(torrent)
    return
  }

  const torrentPath = req.os.name === 'windows' ? 'C:/cinematic/movies' : '/cinematic/movies'
  client.add(magnet, {
    path: torrentPath
  }, function (addedTorrent) {
    if (addedTorrent.downloaded === addedTorrent.length) {
      req.client.status = 'completed'
    }
    processTorrent(addedTorrent)
  })

  function processTorrent (torrent) {
    let file = torrent.files[0]

    for (let i = 1; i < torrent.files.length; i++) {
      if (torrent.files[i].length > file.length) {
        file = torrent.files[i]
      }
    }

    res.json({
      magnet,
      fileName: file.name
    })
  }
})

router.get('/torrents', async function (req, res) {
  if (!req.query.term) return res.sendStatus(400)
  const term = req.query.term

  console.log('Searching torrents and subtitles for term: ' + term)

  torrentSearch.enablePublicProviders()
  torrentSearch.enableProvider('ThePirateBay')
  torrentSearch.enableProvider('KickassTorrents')
  torrentSearch.enableProvider('1337x')

  const torrents = torrentSearch.search(term, 'Movies')
  const subtitles = OpenSubtitles.search({
    extensions: ['srt', 'vtt'],
    query: term,
    limit: 'all'
  })

  const result = await Promise.all([torrents, subtitles])
  const filteredTorrents = result[0].filter(torrent => (
    torrent.title.toLowerCase().includes(term.toLowerCase())
  )).sort(function (a, b) {
    if (a.seeds > b.seeds) {
      return -1
    } else {
      return 1
    }
  }).slice(0, 4)

  const availableLangs = Object.keys(result[1]).map(code => {
    const lang = utils.isoLangs[code]
    const name = lang ? lang.nativeName || lang.name : null
    return {
      name,
      code
    }
  })

  if (!filteredTorrents) {
    return res.sendStatus(500)
  }

  async.map(filteredTorrents, function (torrent, callback) {
    torrentSearch.getMagnet(torrent).then(function (magnet) {
      const infoHash = magnet.split('&')[0].split(':')[3]
      torrent.infoHash = infoHash
      callback(null, torrent)
    })
  }, function (err, torrents) {
    if (err) return res.sendStatus(500)

    res.json({
      torrents,
      langs: availableLangs
    })
  })
})

router.get('/stats', function (req, res, next) {
  const {
    stats,
    status
  } = req.client
  res.status(200)
  res.json({
    stats,
    status
  })
})

module.exports = router
