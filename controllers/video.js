const fs = require('fs')
const https = require('https')
const crypto = require('crypto')
const OS = require('opensubtitles-api')
const path = require('path')
const srt2vtt = require('srt2vtt')
const streamifier = require('streamifier')
// const rimraf = require('rimraf')
const config = require('../config')
const errors = require('../errors')
const torrents = require('../events/torrents')

const OpenSubtitles = new OS(config.OPENSUBTITLES_SETTINGS)

exports.getSubtitles = async (req, res, next) => {
  if (!req.query.query && !req.query.langcode) {
    return errors.handler(req, res)(new errors
      .ValidationError('You need to supply a query term and a language code'))
  }

  const {
    filename
  } = req.query
  console.log('Fetching subtitles for: ' + filename)
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
    return errors.handler(req, res)(new errors
      .InternalError('Failed to fetch subtitles from Open Subtitles'))
  }

  console.log('Fetched subtitles for: ' + filename)
  const lang = subtitles[options.langcode]

  if (!lang) {
    return errors.handler(req, res)(new errors
      .NotFound('No subtitles for that given language code'))
  }

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

  console.log('Found subtitles best match!')
  const match = lang[bestIndex]
  const parts = match.filename.split('.')
  const fileType = '.' + parts[parts.length - 1]
  const fileName = crypto.randomBytes(40).toString('hex')
  const pathParts = path.dirname(require.main.filename).split('\\')
  const appDir = pathParts.slice(0, pathParts.length - 1).join('\\')

  const remoteDir = appDir + '/tmp/' + fileName + fileType

  const tmpFile = fs.createWriteStream(remoteDir)

  const tryDownload = () => {
    console.log('Downloading the srt file from opensubtitles')
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
    console.log('Saved file in tmp folder')
    var data = fs.readFileSync(remoteDir)

    console.log('Conerting the .srt file to .vtt file')
    srt2vtt(data, 1255, (err, vttData) => {
      if (err) {
        return errors.handler(req, res)(new errors
          .InternalError('Failed to convert srt to vtt'))
      }
      console.log('Conversion done!')
      const outputDir = appDir + '/tmp/' + fileName + '.vtt'

      console.log(outputDir)
      fs.writeFileSync(outputDir, vttData)

      const subtitlesStream = streamifier.createReadStream(vttData)
      const subtitlesName = parts.slice(0, parts.length - 2).join('.') + '.vtt'
      res.set('Content-Type', 'mime/vtt')
      res.set('Content-Disposition', 'attachment; filename=' + subtitlesName)

      console.log('Sending the .vtt file to the client')
      // Sending files to the user
      subtitlesStream.pipe(res)

      res.on('finish', () => {
        console.log('Finished streaming the subtitles file to the client. Cleaning the 2 files')
        fs.unlinkSync(outputDir)
        fs.unlinkSync(remoteDir)
      })
    })
  })
}

exports.pauseTorrent = (req, res) => {
  const {
    magnet
  } = req.params
  const {
    client
  } = req.client

  try {
    client.remove(magnet, (err) => {
      if (err) throw new Error(err)

      res.sendStatus(200)
      // const torrentPath = req.os.name === 'windows' ? 'C:/cinematic/movies' : '/cinematic/movies'
      // rimraf(torrentPath, () => {
      //   console.log('Removed torrents data')

      //   res.sendStatus(200)
      // })
    })
  } catch (err) {
    errors.handler(req, res)(err)
  }
}

exports.stream = (req, res) => {
  const {
    client
  } = req.client
  const {
    magnet
  } = req.query
  let torrent = client.get(magnet)

  if (!torrent) {
    return errors.handler(req, res)(new errors
      .NotFound('Torrent was not found for that given magnet'))
  }

  let file = torrent.files[0]

  for (let i = 1; i < torrent.files.length; i++) {
    if (torrent.files[i].length > file.length) {
      file = torrent.files[i]
    }
  }

  let range = req.headers.range
  if (!range) {
    return errors.handler(req, res)(new errors
      .WrongRange('Range doesn\'t exist'))
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
  stream.on('error', (err) => {
    console.log(err)
  })
}

exports.addTorrent = (req, res) => {
  console.log('Adding torrent...')
  let magnet = req.params.magnet
  const {
    client
  } = req.client

  const processTorrent = (torrent) => {
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
  
  const torrent = client.get(magnet)
  if (torrent) {
    torrent.resume()
    processTorrent(torrent)
  } else {
    const torrentPath = req.os.name === 'windows' ? 'C:/cinematic/movies' : '/cinematic/movies'
    client.add(magnet, {
      path: torrentPath
    }, (addedTorrent) => {
      if (addedTorrent.downloaded === addedTorrent.length) {
        req.client.status = 'completed'
      }
      processTorrent(addedTorrent)
    })
  }
}

exports.searchTorrents = async (req, res) => {
  if (!req.query.term) {
    return errors.handler(req, res)(new errors
      .ValidationError('Query must be specified'))
  }

  const token = req.headers['token'] || req.query.token
  const term = req.query.term

  torrents.emit('search', {
    term,
    token
  })

  res.sendStatus(200)
}

exports.getStats = (req, res) => {
  const {
    stats,
    status
  } = req.client
  res.status(200)
  res.json({
    stats,
    status
  })
}