const Sniffr = require('sniffr')

// Middleware for finding out operating system
exports.operatingSystem = (req, res, next) => {
  const userAgent = req.headers['user-agent']
  const s = new Sniffr()

  s.sniff(userAgent)
  req.os = s.os

  next()
}