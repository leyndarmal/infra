
var Message = function (commandType, entityId, senderChannel, data) {
    this.commandType = commandType;
    this.senderChannel = senderChannel;
    this.data = data;
    this.receipientChannel = undefined;
    this.time = new Date();
}

Message.prototype.initFromJson = function (json) {
    var messageObject = this;
    if (json && Object.keys(json) && Object.keys(json).length > 0) {
        var keys = Object.keys(json);
        Object.keys(messageObject).forEach(function (property) {
            if (keys.indexOf(property) != -1)
                messageObject[property] = json[property];
        })
    }
    return messageObject;
}

Message.prototype.getReceipientChannel = function () {
    return this.receipientChannel;
}

Message.prototype.setReceipientChannel = function (receipientChannel) {
    this.receipientChannel = receipientChannel;
}


Message.prototype.getCommandType = function () {
    return this.commandType;
}

Message.prototype.setCommandType = function (commandType) {
    this.commandType = commandType;
}

Message.prototype.getSenderChannel = function () {
    return this.senderChannel;
}

Message.prototype.setSenderChannel = function (senderChannel) {
    this.senderChannel = senderChannel;
}

Message.prototype.getData = function () {
    return this.data;
}

Message.prototype.setData = function (data) {
    this.data = data;
}

Message.prototype.addData = function (propertyName, dataToAdd) {
    this.data[propertyName] = dataToAdd;
}

module.exports = {
    Message: Message
}
