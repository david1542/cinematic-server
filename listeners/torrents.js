const crypto = require('crypto')
const config = require('../config')
const logging = require('../logging')
const events = require('../events/torrents')
const { AMQPRPCClient } = require('@elastic.io/amqp-rpc');


const RPC_QUEUE = config.QUEUES.RPC_TORRENTS
const CALLBACK_QUEUE = config.QUEUES.CALLBACK_TORRENTS

let client
const search = async (data) => {
  const response = await client.sendCommand('search-torrents', [data]);
  
  events.emit('done', response)
  // return channel.assertQueue(CALLBACK_QUEUE, (err, q) => {
  //   const corr = crypto.randomBytes(60).toString('hex')

  //     // Consuming the response from the RPC Server
  //     channel.consume(q.queue, (msg) => {
  //       if (msg.properties.correlationId == corr) {
  //         console.log('Correlation Match!')
  //         console.log('Result: ' + msg.content.toString())
  //         const data = JSON.parse(msg.content.toString())
  //         events.emit('done', data)
  //       }
  //     })

  //     // Sending a request to the RPC Server
  //     return channel
  //       .assertQueue(RPC_QUEUE)
  //       .then(() => {
  //         return channel.sendToQueue(RPC_QUEUE,
  //           Buffer.from(JSON.stringify(data)), {
  //             correlationId: corr,
  //             replyTo: q.queue
  //           })
  //       })
  // })
}

const createChannel = async conn => {
  const requestsQueue = RPC_QUEUE;

  client = new AMQPRPCClient(conn, { requestsQueue });
  await client.start()

  console.log('Started RPC Client!')
  // return conn.createChannel()
  //   .then((ch) => {
  //     // Creating callback queue
  //     channel = ch

  //     channel.consume(CALLBACK_QUEUE, (msg) => {
  //       if (msg.properties.correlationId == corr) {
  //         console.log('Correlation Match!')
  //         console.log('Result: ' + msg.content.toString())
  //         const data = JSON.parse(msg.content.toString())
  //         events.emit('done', data)
  //       }
  //     })
  //     // events.emit('search', 'Coco')
  //     return true
  //   })
  //   .catch((error) => {
  //     logging.error('Unable to submit job to the queue', {
  //       error: error,
  //       stack: error.stack
  //     })
  //   })
}
exports.init = (connections) => {
  events.on('search', search)

  return Promise.resolve()
    .then(() => {
      logging.info('Connected to amqp!')
      createChannel(connections['amqp'])
    })
}