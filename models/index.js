const mongoose = require('mongoose')
const config = require('../config')

exports.init = () => new Promise((resolve, reject) => {
  mongoose.set('debug', true)
  mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true }).then(() => {
    resolve()
    console.log('Connected to DB. URI: ' + config.MONGODB_URI)
  }).catch(err => reject(err))
})
