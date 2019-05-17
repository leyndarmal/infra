

var MessagingConfigurator = function (env) {
    var config = require('./messagingConfig.json');
    try {
        if (!config) {
            throw new Error('failed to load config file');
        }
        this.config = config;
        this.setEnv(env);
    }
    catch (err) {
        console.log('error exiting. ' + err);
    }
}

MessagingConfigurator.prototype.getUserName = function () {
    return this.config[this.getProfile()]['user'];
}
MessagingConfigurator.prototype.getPassword = function () {
    return this.config[this.getProfile()]['password'];
}

MessagingConfigurator.prototype.getUrl = function () {
    return this.config[this.getProfile()]['url'];
}

MessagingConfigurator.prototype.setEnv = function (env) {
    this.env = env;
}

MessagingConfigurator.prototype.getEnv = function () {
    return this.env;
}

MessagingConfigurator.prototype.getProfile = function () {

    switch (this.getEnv()) {
    case 'dev':
        return 'default';
    case 'stage':
        return 'stage';
    case 'prod':
        return 'prod';
    default:
        return 'default';
    }
}



MessagingConfigurator.instance = function () {
    if (!this.instanceExists)
        this.instanceExists = new MessagingConfigurator(process.env.envType);

    return this.instanceExists;
}

module.exports = {
    MessagingConfigurator: MessagingConfigurator
}
