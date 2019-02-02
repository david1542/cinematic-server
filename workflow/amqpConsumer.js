const amqp = require('amqplib')
const config = require('../config')
const torrentManager = require('./torrentManager')
const { AMQPRPCServer } = require('@elastic.io/amqp-rpc');

amqp.connect(config.AMQP_URI).then(async _conn => {

  const requestsQueue = config.QUEUES.RPC_TORRENTS
  const server = new AMQPRPCServer(_conn, { requestsQueue });
  await server.start()

  console.log('Started new RPC Server!')
  console.log('Listening on ' + config.AMQP_URI)

  server.addCommand('search-torrents', async (term) => {
    console.log('-------------------------------')
    console.log('New Torrents Request! Term: ' + term)
    const result = await torrentManager.searchTorrents(term)
    return result
  })
  // _conn.createChannel().then(ch => {
  //   ch.assertQueue(config.QUEUES.RPC_TORRENTS);

  //   console.log("Waiting for messages in %s", config.QUEUES.RPC_TORRENTS);

  //   // Limiting the number of concurrently messages
  //   ch.prefetch(1)
  //   // Starting to listen to the RPC QUEUE
  //   // This queue will receive movie names
  //   // And then respond with appropriate torrents
  //   // And subtitle
  //   ch.consume(config.QUEUES.RPC_TORRENTS, function(msg) {
  //     const msgString = msg.content.toString()
  //     const term = msgString.slice(1, msgString.length - 1)

  //     console.log('---------------------------')
  //     console.log('New Request! Term: ' + term)
  //     // Calling the search torrents method inside the
  //     // Torrent manager

  //     // setTimeout(() => {
  //     //   ch.sendToQueue(msg.properties.replyTo,
  //     //     Buffer.from(JSON.stringify(term)),
  //     //     {correlationId: msg.properties.correlationId})
  //     //   ch.ack(msg);
  //     // }, 3000)
  //     torrentManager.searchTorrents(term)
  //       .then(result => {
  //         console.log(msg.properties.correlationId)
  //         ch.sendToQueue(msg.properties.replyTo,
  //           Buffer.from(JSON.stringify(result)),
  //           {correlationId: msg.properties.correlationId})
  //         // ch.ack(msg);
  //       })
  //   }, {noAck: true});
  // });
});