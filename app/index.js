const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const auth = require('../middlewares/auth')
const logging = require('../logging')
const package = require('../package')
const events = require('../events')
const appRouter = require('../routers')
const database = require('../models')
const listeners = require('../listeners')

app.use(logging.middleware);
app.use(cors())
app.use(auth.force_https)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// Global router
app.use(appRouter)

app.get(/^\/$/, (req, res) => {
  res.json({
    name: package.name,
    version: package.version,
  })
})

app.initialize = (io) => Promise.all([
  database.init(),
  listeners.init(),
  events.init(io)
])

module.exports = app
