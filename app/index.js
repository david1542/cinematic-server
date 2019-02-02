const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const auth = require('../middlewares/auth')
const logging = require('../logging')
const package = require('../package')
const appRouter = require('../routers')
const database = require('../models')
const listeners = require('../listeners')

app.use(logging.middleware);
app.use(cors())
app.use(auth.force_https)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.mountRoutes = (io) => {
  // Global router
  app.use(appRouter(io))

  app.get(/^\/$/, (req, res) => {
    res.json({
      name: package.name,
      version: package.version,
    })
  })
}

app.initialize = (io) => {
  app.mountRoutes(io)

  return Promise.all([
    database.init(),
    listeners.init()
  ])
}

module.exports = app
