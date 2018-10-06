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
