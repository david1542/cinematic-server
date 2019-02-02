const merge = require('lodash.merge');

const env = process.env.NODE_ENV || 'development'

const baseConfig = {
  MONGODB_URI: 'mongodb://localhost:27017/movies-vuejs',
  PORT: 4000,
  OPENSUBTITLES_SETTINGS: {
    useragent: 'CinematicUserAgent1.0',
    username: 'dudu1542',
    password: '1351996544AA##aa',
    ssl: true
  },
  LOG_LEVEL: 'warn',
  QUEUES: {
    RPC_TORRENTS: 'rpc_torrents',
    CALLBACK_TORRENTS: 'callback_torrents'
  }
}

let envConfig = {}

switch (env) {
  case 'development':
  case 'dev':
    envConfig = require('./dev.env')
    break;
  case 'prod':
  case 'production':
    envConfig = require('./prod.env')
  default:
    envConfig = require('./dev.env')
}

module.exports = merge(baseConfig, envConfig)
