const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const bcrypt = require('bcrypt-nodejs')
const User = require('../models/user')
const auth = require('../middlewares/auth')

router.post('/register', function (req, res) {
  if (!req.body.userDetails || !validateUser(req.body.userDetails)) return res.sendStatus(400)

  console.log('User is registering')
  function validateUser (userDetails) {
    if (!userDetails.email || !userDetails.password ||
      !userDetails.firstName || !userDetails.lastName) {
      return false
    }

    return true
  }

  const { userDetails } = req.body

  console.log('Creating new user')
  User.create(userDetails, function (err, newUser) {
    if (err || !newUser) {
      console.log('Error')
      console.log(err)
      console.log(newUser)      
      return res.sendStatus(500)
    }

    console.log('Successfully created user')
    res.json(newUser)
  })
})

// login
router.post('/login', function (req, res) {
  if (!req.body.userDetails) return res.sendStatus(400)

  const { email, password } = req.body.userDetails
  User.findOne()
    .where('email').equals(email.toLowerCase())
    .exec(function (err, user) {
      if (err) return res.sendStatus(500)
      if (!user) return res.sendStatus(404)

      bcrypt.compare(password, user.password, function (err, valid) {
        if (err || !valid) return res.sendStatus(404)
        user.token = crypto.randomBytes(60).toString('hex')
        user.save(function (err) {
          if (err) res.sendStatus(500)

          res.json(user)
        })
      })
    })
})

// ------------------------
// Authenticated Routes
// ------------------------
router.post('/favorites', auth.tokenMiddleware, function (req, res) {
  if (!req.body.id) return res.sendStatus(400)
  const {
    user
  } = req
  const {
    id
  } = req.body

  user.favorites.push(id)
  user.save(function (err, newUser) {
    if (err || !newUser) return res.sendStatus(500)

    res.json({
      id
    })
  })
})

router.delete('/favorites', auth.tokenMiddleware, function (req, res) {
  if (!req.body.id) return res.sendStatus(400)
  const {
    user
  } = req
  const {
    id
  } = req.body

  User.findByIdAndUpdate(
    user._id, {
      $pull: {
        favorites: id
      }
    }, {
      safe: true,
      new: true
    })
    .exec(function (err, newUser) {
      if (err || !newUser) return res.sendStatus(500)

      res.json({ id })
    })
})

module.exports = router
