var redisConfigurator = require('./config/redisConfigurator').getInstance()
var redis = require('ioredis');
const bluebird = require('bluebird')

let redisInterface = (function () {

    const getClient = function (db) {

        var env = redisConfigurator.getEnv();
        let client;

        switch (env) {

            case 'prod': {
                client = new redis.Cluster(redisConfigurator.getConnectionString());
                break;
            }

            case 'dev':
            case 'stage':
            default: {
                client = new redis({ port: redisConfigurator.getPort(), host: redisConfigurator.getUrl(), db: db })
                break;
            }
        }

        if (client[db]) {
            return client[db];
        }

        client[db] = redis.createClient(redisConfigurator.getPort(), redisConfigurator.getUrl(), { db });

        client[db].on('connect', function () {
            console.log('Redis client connected');
        });

        client[db].on('error', function (err) {
            console.log('Redis connection, something went wrong ' + err);
        });

        return bluebird.promisifyAll(client);
    }

    const getRedis = function () {
        return redis
    }

    return {
        getClient, getRedis
    }
}());

module.exports = { redis: redisInterface }