const crypto = require('crypto')
const bcrypt = require('bcrypt-nodejs')
const User = require('../models/user')
const errors = require('../errors')


const validateUser = (userDetails, type) => {
  if (type === 'register') {
    if (!userDetails.email || !userDetails.password ||
      !userDetails.firstName || !userDetails.lastName) {
      return false
    }
  } else if (type === 'login') {
    if (!userDetails.email || !userDetails.password) {
      return false
    }
  }

  return true
}

exports.register = (req, res) => {
  if (!req.body.userDetails || !validateUser(req.body.userDetails, 'register')) {
    return errors.handler(req, res)(new errors.ValidationError('Invalid user details'))
  }

  const { userDetails } = req.body

  User.create(userDetails).then(newUser => {
    if (!newUser) {
      return errors.handler(req, res)(new errors.InternalError('Failed to create user'))
    }

    res.json(newUser)
  }).catch(errors.handler(req, res))
}

exports.login = (req, res) => {
  if (!req.body.userDetails || !validateUser(req.body.userDetails, 'login')) {
    return errors.handler(req, res)(new errors.ValidationError('Invalid user details'))
  }

  const { email, password } = req.body.userDetails
  User.findOne()
    .where('email').equals(email.toLowerCase())
    .exec().then(user => {
      if (!user) {
        return errors.handler(req, res)(new errors.NotFound('User not found'))
      }
      if (user.status !== 'approved') {
        return errors.handler(req, res)(new errors.UnauthorizedAccess('You need to be approved before you can login'))
      }

      bcrypt.compare(password, user.password, function (err, valid) {
        if (!valid) {
          return errors.handler(req, res)(new errors.ValidationError('Password is incorrect'))
        } else if (err) {
          return errors.handler(req, res)(new errors.InternalError('Failed to match the passwords'))
        }

        user.token = crypto.randomBytes(60).toString('hex')
        user.save().then(loginUser => {
          res.json(loginUser)
        }).catch(errors.handler(req, res))
      })
    }).catch(errors.handler(req, res))
}

exports.me = (req, res) => {
  res.json(req.user)
}

exports.addToFavorites = (req, res) => {
  if (!req.body.id) {
    return errors.handler(req, res)(new errors.ValidationError('An id is required'))
  }

  const {
    user
  } = req
  const {
    id
  } = req.body

  user.favorites.push(id)
  user.save().then(newUser => {
    if (!newUser) {
      return errors.handler(req, res)(new errors.InternalError('Failed to save user'))
    }

    res.json({
      id
    })
  }).catch(errors.handler(req, res))
}

exports.removeFromFavorites = (req, res) => {
  if (!req.body.id) {
    return errors.handler(req, res)(new errors.ValidationError('An id is required'))
  }

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
    .exec().then(newUser => {
      if (!newUser) {
        return errors.handler(req, res)(new errors.InternalError('Failed to save user'))
      }

      res.json({ id })
    }).catch(errors.handler(req, res))
}