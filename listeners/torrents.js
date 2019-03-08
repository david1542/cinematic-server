const config = require('../config')
const logging = require('../logging')
const events = require('../events/torrents')
const { AMQPRPCClient } = require('@elastic.io/amqp-rpc');


const RPC_QUEUE = config.QUEUES.RPC_TORRENTS
// const CALLBACK_QUEUE = config.QUEUES.CALLBACK_TORRENTS

let client
const search = async (data) => {
  const response = await client.sendCommand('search-torrents', [data]);
  
  events.emit('done', response)
}

const createChannel = async conn => {
  const requestsQueue = RPC_QUEUE;

  client = new AMQPRPCClient(conn, {
    requestsQueue,
    timeout: 120000
  });

  await client.start()

  console.log('Started RPC Client!')
}
exports.init = (connections) => {
  events.on('search', search)

  return Promise.resolve()
    .then(() => {
      logging.info('Connected to amqp!')
      createChannel(connections['amqp'])
    })
}