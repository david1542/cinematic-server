const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const controller = require('../controllers/user')

router.post('/register', controller.register)
router.post('/login', controller.login)

// ------------------------
// Authenticated Routes
// ------------------------
router.use(auth.tokenMiddleware)

router.get('/me', controller.me)
router.post('/favorites', controller.addToFavorites)
router.delete('/favorites', controller.removeFromFavorites)

module.exports = router
