const amqp = require('amqplib')
const config = require('../config')
const { AMQPRPCServer } = require('@elastic.io/amqp-rpc');
const redis = require('redis');
const bluebird = require('bluebird')
const torrentManager = require('./torrentManager')
const logging = require('../logging')
// Promisifying all the methods of redis
bluebird.promisifyAll(redis)

// Creating redis client
const redisClient = redis.createClient(config.REDIS_URL)

redisClient.on('connect', () => {
  console.log(`Redis client connected! URL: ${config.REDIS_URL}`)
})

redisClient.on('error', (err) => {
  console.log(err)
  console.log('Something went wrong')
})

amqp.connect(config.AMQP_URI).then(async _conn => {
  const ch = await _conn.createChannel()
  await ch.assertQueue(config.QUEUES.RPC_TORRENTS)

  const requestsQueue = config.QUEUES.RPC_TORRENTS
  const server = new AMQPRPCServer(_conn, { requestsQueue });
  await server.start()

  console.log('Started new RPC Server!')
  console.log('Listening on ' + config.AMQP_URI)

  server.addCommand('search-torrents', async ({term, token}) => {
    console.log('-------------------------------')
    console.log('New Torrents Request! Term: ' + term)

    const key = `movieData-${term}`
    const cacheData = await redisClient.getAsync(key)

    if (cacheData) {
      return {
        data: JSON.parse(cacheData),
        token
      }
    } else {
      const data = await torrentManager.searchTorrents(term)
      // Caching the results
      await redisClient.setex(key, 86400, JSON.stringify(data))
      return {
        data,
        token
      }
    }
  })
});