const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const config = require('./config')
const auth = require('./middlewares/auth')
const usersRoutes = require('./routers/users')
const videosRoutes = require('./routers/videos')

mongoose.set('debug', true)
mongoose.connect(config.MONGODB_URI, function (err) {
  if (err) {
    console.log(err)
    process.exit()
  } else {
    console.log('Connected to DB. URI: ' + config.MONGODB_URI)
  }
})

app.use(cors())
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.set('Access-Control-Allow-Origin', '*')

  // Request methods you wish to allow
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')

  // Request headers you wish to allow
  res.set('Access-Control-Allow-Headers', 'origin, x-requested-with, content-type, accept, x-xsrf-token', 'token')

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.set('Access-Control-Allow-Credentials', true)

  // Request headers you wish to expose
  res.set('Access-Control-Expose-Headers', false)

  next()
})

app.use(auth.force_https)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/users', usersRoutes)
app.use('/videos', videosRoutes)

app.get('/', function (req, res) {
  res.send('hello')
})

app.listen(process.env.PORT || 4000, function () {
  console.log('Server started on port 4000')
})
