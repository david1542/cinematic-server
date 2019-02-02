const mongoose = require('mongoose')
const config = require('../config')

exports.init = () => new Promise((resolve, reject) => {
  mongoose.set('debug', true)
  mongoose.connect(config.MONGODB_URI, function (err) {
    if (err) {
      console.log(err)
      reject()
    } else {
      resolve()
      console.log('Connected to DB. URI: ' + config.MONGODB_URI)
    }
  })
})
