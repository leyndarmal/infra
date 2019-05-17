var Promise = require('bluebird');
const amqplib = require('amqplib');
var { Message } = require('./entities/Message.js');
var { STATES, rabbitMiddlewareEnums } = require('database/enums/enums.js');
var { MessagingConfigurator } = require('./config/MessagingConfigurator.js');

let instance = null;
const WAIT_TO_CONNECT = 1000;

const MessagingClient = function (channelName) {

    if (instance) {
        return instance;
    }

    console.log('new messagingClient created...');

    this.url = MessagingConfigurator.instance().getUrl();
    this.channelName = channelName;
    this.messagingClient = undefined;
    this.prefetchCount = 0;
    this.mqChannel;
    this.isConnected;
    this.mySubscriptions = {};
    this.init();
    instance = this;
}

MessagingClient.prototype.getChannelName = function () {
    return this.channelName;
}

MessagingClient.prototype.setChannelName = function (channelName) {
    this.channelName = channelName;
}

MessagingClient.prototype.getConnection = function () {

    return new Promise((resolve, reject) => {

        if (this.isConnected)
            return resolve(this.connection)

        setTimeout(() => this.getConnection().then(mq => resolve(mq)), WAIT_TO_CONNECT)
    })
}

MessagingClient.prototype.setConnection = function (connection) {
    this.connection = connection;
}

MessagingClient.prototype.init = function () {
    if (this.isConnected) return Promise.resolve(this.getMqChannel())

    let mqChannel;
    return this.connect()
        .then(conn => {

            conn.on('error', err => {

                console.error('got an error', err);
                this.isConnected = false;
            });
            conn.on('close', err => {

                console.error('connection close', err);
                this.isConnected = false;
                this.initAndSubscribe();
            });
            this.setConnection(conn);
            return conn.createChannel();
        })
        .then(_mqChannel => {

            mqChannel = _mqChannel;

            mqChannel.on('error', err => {
                console.error('received an error in rabbitMqChannel' + err);
                this.isConnected = false;
            });

            this.setMqChannel(mqChannel);
            this.isConnected = true;
            return Promise.resolve(mqChannel);
        })
        .catch(err => {
            console.error('error: ' + err)
            this.isConnected = false;
            this.initAndSubscribe();
        })
}

MessagingClient.prototype.assertQueue = function (channelName) {
    this.getMqChannel()
        .then(mq =>
            mq.assertQueue(channelName));
}

MessagingClient.prototype.connect = function () {

    return amqplib.connect(this.getUrl());
}

MessagingClient.prototype.getUrl = function () {
    return this.url;
}

MessagingClient.prototype.getMqChannel = function () {

    return new Promise((resolve, reject) => {

        if (this.isConnected) return resolve(this.mqChannel)

        setTimeout(() => this.getMqChannel().then(mq => resolve(mq)), WAIT_TO_CONNECT)
    })
}

MessagingClient.prototype.setMqChannel = function (mqChannel) {
    this.mqChannel = mqChannel;
}

MessagingClient.prototype.getPassword = function () {
    return this.password;
}

MessagingClient.prototype.getUser = function () {
    return this.userName;
}


MessagingClient.prototype.getMessagingClient = function () {
    return this.messagingClient;
}

MessagingClient.prototype.setMessagingClient = function (messagingClient) {
    this.messagingClient = messagingClient;
}

MessagingClient.prototype.sendMessage = function (channel, message, shouldAvoidLogging = false) {

    return this.getMqChannel()
        .then(mqChannel => {

            message.setReceipientChannel(channel);

            let stringified = Buffer.from(JSON.stringify(message));
            mqChannel.sendToQueue(rabbitMiddlewareEnums.MIDDLEWARE_TRANSFER_QUEUE, stringified)

            if(! shouldAvoidLogging)
            {
                let messagingObject = this;
                let isReceived = false;
                let messageToLog = new Message().initFromJson(message);
                logger.info('messaging', { queue: channel, action: 'PUSH', entityId: message.entityId });
                return messagingObject.logMessage(messageToLog, isReceived);
            }
        })
        .catch(err => {
            let errorMessage = err.message || ''
            logger.error('messaging', {queue:channel, errorType: 'FAILED_MQ_CHANNEL', errorMessage:errorMessage})
            this.isConnected = false;
            this.init();
        })
}

MessagingClient.prototype.publishMessageToExchange = async function (message, exchangeName, exchangeType) {
    let mqChannel = await this.getMqChannel();
    let stringifiedMessage = Buffer.from(JSON.stringify(message));
    await mqChannel.assertExchange(exchangeName, exchangeType, { durable: false });
    await mqChannel.publish(exchangeName, '', stringifiedMessage);
}

MessagingClient.prototype.exchangePublish = async function (exchange, key, message) {

    let mqChannel = await this.getMqChannel()

    message.setReceipientChannel(exchange);

    let stringified = Buffer.from(JSON.stringify(message));

    mqChannel.assertExchange(exchange, 'topic', { durable: false });
    mqChannel.publish(exchange, key, Buffer.from(stringified));
}

MessagingClient.prototype.sendMessageToQueue = function (queue, message) {
    return this.getMqChannel()
        .then(mqChannel => {
            message.setReceipientChannel(queue);

            let stringified = Buffer.from(JSON.stringify(message));

            return mqChannel.sendToQueue(queue, stringified)

        })
        .catch(err => {
            console.error('error sending message in getting mqChannel ' + err)
            this.isConnected = false;
            this.init();
        })
}

MessagingClient.prototype.subscribeMiddleware = async function (callback) {

    let mqChannel = await this.getMqChannel()

    await mqChannel.assertQueue(rabbitMiddlewareEnums.MIDDLEWARE_TRANSFER_QUEUE, { durable: true });
    let consumer = await mqChannel.consume(rabbitMiddlewareEnums.MIDDLEWARE_TRANSFER_QUEUE, (msg) => {

        let message = new Message()
        if (msg && msg.content) {
            let json = JSON.parse(msg.content.toString());
            message = new Message().initFromJson(json);
        }
        logger.info('Transfering new message ', {from: message.senderChannel, to: message.receipientChannel});
        callback(null, message)
    }, { noAck: true })
    return consumer;
}

MessagingClient.prototype.cancelConsumer = async function (consumerTag) {
    let channel = await this.getMqChannel();
    await channel.cancel(consumerTag);
}

MessagingClient.prototype.subscribeMiddlewareManager = async function (callback, prefetchCount = 0) {

    let mqChannel = await this.getMqChannel();
    await mqChannel.assertExchange(rabbitMiddlewareEnums.MIDDLEWARE_MANAGER_EXCHANGE, rabbitMiddlewareEnums.EXCHANGE_TYPE_FANOUT, { durable: false });

    let newQueue = await mqChannel.assertQueue('', { exclusive: true });

    if (prefetchCount != 0) {
        mqChannel.prefetch(prefetchCount);
    }

    await mqChannel.bindQueue(newQueue.queue, rabbitMiddlewareEnums.MIDDLEWARE_MANAGER_EXCHANGE, '');
    return mqChannel.consume(newQueue.queue, (msg) => {

        let message = new Message()
        if (msg && msg.content) {
            let json = JSON.parse(msg.content.toString());
            message = new Message().initFromJson(json);
            message.setMetadata(msg)
        }
        callback(null, message)
    }, { noAck: true });
}

MessagingClient.prototype.sendMessageWithSender = function (recipientChannel, senderChannel, message, shouldAvoidLogging = false) {
    message.setSenderChannel(senderChannel);
    return this.sendMessage(recipientChannel, message, shouldAvoidLogging);
}


MessagingClient.prototype.exchangeSubscribe = async function (exchange, key, callback) {

    let mqChannel = await this.getMqChannel()

    mqChannel.assertExchange(exchange, 'topic', { durable: false });

    let q = await mqChannel.assertQueue('', { exclusive: true, autoDelete: true });

    mqChannel.bindQueue(q.queue, exchange, key);

    mqChannel.consume(q.queue, (msg) => {

        console.log(q.queue);

        if (!msg) return;

        let json = JSON.parse(msg.content.toString());
        let message = new Message().initFromJson(json);
        message.setReceipientChannel(exchange);

        callback(null, message);
    })

    return q.queue;
}

MessagingClient.prototype.subscribe = async function (channel, queueName, callback, max, noAck = true, prefetchCount = 0, expires) {

    var subscriptionKey = channel;

    let mqChannel = await this.getMqChannel()
    let options = { durable: max ? false : true, expires }
    if (expires) {
        options.autoDelete = true
    }
    await mqChannel.assertQueue(channel, options);
    
    if (prefetchCount != 0) {
        this.prefetchCount = prefetchCount
        mqChannel.prefetch(prefetchCount);
    }
    if (this.mySubscriptions[subscriptionKey]) return; 

    this.mySubscriptions[subscriptionKey] = { channel: channel, queueName: queueName, callback: callback, max: max, noAck: noAck, prefetchCount: prefetchCount };
    console.log(`subscribed to rabbit with key ${subscriptionKey}`);

    let consumer = await mqChannel.consume(channel, async (msg) => {
        await this.genericMessageHandling(msg, channel, callback)
    }, { noAck: noAck }); 

    return consumer;
};

module.exports = {
    MessagingClient: MessagingClient
}
