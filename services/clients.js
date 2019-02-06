const WebTorrent = require('webtorrent-hybrid')

class TorrentClientManager {
  constructor() {
    this.connectedUserClients = new Map()

    this.createClient = this.createClient.bind(this)
    this.removeClient = this.removeClient.bind(this)
    this.findClient = this.findClient.bind(this)
  }

  findClient(token) {
    return this.connectedUserClients.get(token)
  }

  createClient(token) {
    // Checking if there is already a client
    const existingClient = this.findClient(token)
    if (existingClient) {
      return existingClient
    }

    let client = new WebTorrent()
    let stats = {
      progress: 0,
      downloadSpeed: 0,
      ratio: 0
    }

    let errorMessage = ''

    client.on('error', (err) => {
      errorMessage = err.message
    })

    client.on('torrent', () => {
      const userClient = this.connectedUserClients.get(token)

      userClient.status = 'downloading'
      console.log('Torrent added')
    })

    client.on('download', (bytes) => {
      stats = {
        progress: Math.round(client.progress * 100 * 100) / 100,
        downloadSpeed: client.downloadSpeed,
        ratio: client.ratio
      }

      const userClient = this.connectedUserClients.get(token)
      userClient.stats = stats
    })

    const torrentClient = {
      token,
      client,
      stats,
      errorMessage
    }

    // Adding the new client to the map collection
    this.connectedUserClients.set(token, torrentClient)

    console.log('Created new torrent client! Number: ' + this.connectedUserClients.size)
    return torrentClient
  }

  removeClient(token) {
    const torrentClient = this.findClient(token)

    if (!torrentClient) return false

    this.connectedUserClients.delete(token)
    torrentClient.client.destroy()

    console.log('Destroyed torrent client! Number: ' + this.connectedUserClients.size)
  }
}

module.exports = new TorrentClientManager()