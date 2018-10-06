const User = require('../models/user')

exports.tokenMiddleware = function (req, res, next) {
  var token = req.headers['token'] || req.query.token

  // Missing token
  if (!token || token.length !== 120) {
    res.status(400).json({
      status: 'error',
      message: 'Missing token'
    })
    // We have a token
  } else {
    User.findOne()
      .where('token').equals(token)
      .where('deletedAt').exists(false)
      .exec(function (err, user) {
        if (err) return res.sendStatus(500)
        if (!user) return res.sendStatus(403)

        req.user = user
        next()
      })
  }
}

exports.force_https = function (req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url)
    }
  }
  next()
}
