const torrentSearch = require('torrent-search-api')
const OS = require('opensubtitles-api')
const async = require('async')
const utils = require('../utils')
const config = require('../config')

const OpenSubtitles = new OS(config.OPENSUBTITLES_SETTINGS)

function tryConnect () {
  setTimeout(() => {
    try {
      // Login to open subtitles api
      OpenSubtitles.login()
    } catch (err) {
      tryConnect()
    }
  }, 3000)
}

tryConnect()
console.log('Connected to Open Subtitles')

torrentSearch.enablePublicProviders()
torrentSearch.enableProvider('ThePirateBay')
torrentSearch.enableProvider('KickassTorrents')
torrentSearch.enableProvider('Torrent9')
torrentSearch.enableProvider('Torrentz2')
torrentSearch.enableProvider('TorrentProject')
torrentSearch.enableProvider('1337x')

const filterTorrents = (torrents, term) => new Promise((resolve) => {
  const result = torrents.filter(torrent => (
    torrent.title.toLowerCase().includes(term.toLowerCase())
  )).sort(function (a, b) {
    if (a.seeds > b.seeds) {
      return -1
    } else {
      return 1
    }
  }).slice(0, 4)

  resolve(result)
})

const transformLanguages = langs => new Promise((resolve) => {
  const result = Object.keys(langs).map(code => {
    const lang = utils.isoLangs[code]
    const name = lang ? lang.nativeName || lang.name : null
    return {
      name,
      code
    }
  })

  resolve(result)
})

exports.searchTorrents = (term) => new Promise(async (resolve, reject) => {
  console.log('Sending requests for fetching torrents and subtitles')
  const torrents = torrentSearch.search(term, 'Movies')

  const subtitles = OpenSubtitles.search({
    extensions: ['srt', 'vtt'],
    query: term,
    limit: 'all'
  })

  const result = await Promise.all([torrents, subtitles])
  console.log('Done! fetched subtitles and torrents')

  const manipulation = await Promise.all([
    filterTorrents(result[0], term),
    transformLanguages(result[1])
  ])

  const filteredTorrents = manipulation[0]
  const availableLangs = manipulation[1]

  if (!filteredTorrents) {
    return res.sendStatus(500)
  }

  console.log('Manipulated available langs. Number: ' + availableLangs.length)
  console.log('Iterated over torrents. Number: ' + filteredTorrents.length)

  console.log('Starting iterating through the torrents. Number: ' + filteredTorrents.length);
  async.map(filteredTorrents, function (torrent, callback) {
    torrentSearch.getMagnet(torrent).then(function (magnet) {
      if (magnet) {
        const infoHash = magnet.split('&')[0].split(':')[3]
        torrent.infoHash = infoHash
        callback(null, torrent)
      } else {
        callback(null)
      }
    }).catch(callback);
  }, function (err, torrents) {
    if (err) {
      console.log(err);
      return reject(500)
    }

    const validTorrents = torrents.filter(torrent => !!torrent)

    console.log('Torrents are ready! Sending them to the client')
    resolve({
      torrents: validTorrents,
      langs: availableLangs
    })
  })
})