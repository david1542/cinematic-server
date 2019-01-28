exports.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movies-vuejs'
exports.PORT = process.env.NODE_ENV === 'production' ? process.env.PORT : 4000
exports.OPENSUBTITLES_SETTINGS = {
  useragent: 'CinematicUserAgent1.0',
  username: 'dudu1542',
  password: '1351996544AA##aa',
  ssl: true
}
