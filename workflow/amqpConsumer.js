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
    console.log('Checking if there is anything inside the cache...')

    const key = `movieData-${term}`
    const cacheData = await redisClient.getAsync(key)

    if (cacheData) {
      console.log('Found something inside the cache!')
      return {
        data: JSON.parse(cacheData),
        token
      }
    } else {
      console.log('Didn\'t find anything inside the cache. Executing search query...')
      const data = await torrentManager.searchTorrents(term)

      if (data.torrents.length > 0) {
        console.log('Caching the results...')
        // Caching the results
        await redisClient.setex(key, 86400, JSON.stringify(data))
      }

      console.log('Done Caching. Returning results to the client')
      return {
        data,
        token
      }
    }
  })
});