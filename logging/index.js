const config = require('../config')
const winston = require('winston')

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  transports: [
    new (winston.transports.File)({
      name: 'info',
      filename: 'logs/info.log',
      level: 'info'
    }),
    new (winston.transports.File)({
      name: 'error',
      filename: 'logs/error.log',
      level: 'error'
    }),
    new (winston.transports.Console)({
      colorize: true
    })
  ]
})

logger.middleware = function (req, res, next) {
  res.on('finish', function () {
    let username = null
    let url = req.originalUrl
    if (req.user) {
      username = req.user.username
    }
    if (res.statusCode >= 200 && res.statusCode < 400) {
      return logger.info(req.method, url, res.statusCode, username)
    }
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return logger.warn(req.method, url, res.statusCode, username)
    }
    return logger.error(req.method, url, res.statusCode, username)
  })
  next()
}

module.exports = logger
