const Sniffr = require('sniffr')

exports.operatingSystem = (req, res, next) => {
  const userAgent = req.headers['user-agent']
  const s = new Sniffr()

  s.sniff(userAgent)
  req.os = s.os

  next()
}