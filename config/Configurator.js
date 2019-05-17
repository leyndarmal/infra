const config = require('./config.json');
let instance = null;

module.exports = class configurator {

    constructor() {
        this.config = config;
        this.env = process.env.envType || 'dev';
        if (!instance) instance = this;
        return instance;
    }

    set env(env) { this._env = env }
    get env() { return this._env }

    get service2secret() { return config[this.getProfile()]['service2'] }
    get service1Secret() { return config[this.getProfile()]['service1'] }
    get aisSecret() { return config[this.getProfile()]['aisSecret'] }

    getProfile() {

        switch (this.env) {
            case 'dev':
                return 'dev';
            case 'stage':
                return 'stage';
            case 'prod':
                return 'prod';
            default:
                return 'dev';
        }
    }

    getRandomServerUrl() {
        switch (this.env) {
            case 'prod':
                return 'http://blabla.prod.com';
            case 'stage':
                return 'http://blabla.stage.com';
            default:
                return 'http://blabla.dev.com';
        }
    }
}
