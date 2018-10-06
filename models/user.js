const mongoose = require('mongoose')
const Schema = mongoose.Schema
const timestamps = require('mongoose-timestamps')
const bcrypt = require('bcrypt-nodejs')

const userSchema = new Schema({
  firstName: {
    trim: true,
    type: String
  },
  lastName: {
    trim: true,
    type: String
  },
  email: {
    trim: true,
    type: String,
    unique: true
  },
  favorites: [{
    type: String
  }],
  password: {
    type: String
  },
  token: {
    type: String
  }
})

userSchema.plugin(timestamps)

userSchema.pre('save', function (next) {
  const user = this
  if (!user.isModified('password')) return next()

  bcrypt.hash(user.password, 10, null, function (err, hash) {
    if (err) {
      return next(err)
    }

    if (!user.favorites) user.favorites = []
    user.password = hash
    return next()
  })
})

module.exports = mongoose.model('User', userSchema)
