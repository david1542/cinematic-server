const express = require('express')
const router = express.Router()

const usersRouter = require('./users')
const videosRouter = require('./videos')

router.use('/users', usersRouter)
router.use('/videos', videosRouter)

module.exports = router