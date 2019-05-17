var RedisConfigurator = function (env) {
    var config = require('./redisConfig.json');
    try {
        if (!config) {
            throw new Error('failed to load redis config file');
        }
        this.config = config;
        console.log('starting Redis in ' + env + ' configuration')
        this.setEnv(env);
    }
    catch (err) {
        console.log('Error! :  ' + err);
    }
}

RedisConfigurator.prototype.getPort = function () {
    return this.config[this.getProfile()]['port'];
}

RedisConfigurator.prototype.getUrl = function () {
    return this.config[this.getProfile()]['url'];
}

RedisConfigurator.prototype.getConnectionString = function () {
    return this.config[this.getProfile()];
}


RedisConfigurator.prototype.getEnv = function () {
    return this.env;
}

RedisConfigurator.prototype.setEnv = function (env) {
    this.env = env;
}

RedisConfigurator.prototype.getProfile = function () {

    switch (this.getEnv()) {
        case 'dev':
            return 'Dev';
        case 'stage':
            return 'Stage';
        case 'prod':
            return 'Prod';
        default:
            return 'Dev';
    }
}


module.exports = (function () {
    var instance;

    function createInstance() {
        var configurator = new RedisConfigurator(process.env.envType);
        return configurator;
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();