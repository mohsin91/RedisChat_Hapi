"use strict";
exports.__esModule = true;
var SocketIO = require("socket.io");
// import { ChatRequest, ChatRequestViewModel, HeartBeatViewModel, UserViewModel } from '../model/ChatRequest';
var enumerations_1 = require("../helper/enumerations");
// import { func } from '../../node_modules/@types/joi';
// import { HttpRequest } from '../helper/request';
// import * as Configs from "../configurations";
var _pub = require('redis-connection')();
var _sub = require('redis-connection')('subscriber');
var handleError = require('hapi-error').handleError;
//  const SocketIO = require("socket.io");
var _io;
var ConnectionList = [];
function init(listener, callback) {
    // setup redis pub/sub independently of any socket.io connections
    _pub.on('ready', function () {
        // console.log("PUB Ready!");
        _sub.on('ready', function () {
            // now start the socket.io
            _io = SocketIO.listen(listener);
            _io.on('connection', chatHandler);
            // Here's where all Redis messages get relayed to Socket.io clients
            _sub.on('message', function (channel, message) {
                // console.log(channel + ' : ' + message);
                _io.emit(channel, message); // relay to all connected socket.io clients
            });
            return setTimeout(function () {
                return callback();
            }, 300); // wait for socket to boot
        });
    });
}
function chatHandler(socket) {
    // New 1-1 Chat Request
    console.log("User Connected, SocketId" + socket.id);
    socket.on('Chat:Request', ChatRequestCallBack);
    // Get Users Contacts
    socket.on('io:getcontacts', function (msisdn) {
        var socket = this;
        try {
            _pub.smembers(msisdn + ':contacts', function (err, contacts) {
                if (!err) {
                    socket.emit('io:contactsreceived', contacts);
                }
            });
            // _pub.publish(requestObj.sender_id + ':contacts', requestString);
        }
        catch (ex) {
            throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
        }
    });
    // When user subscribes a channel
    socket.on("subscribe:channel", function (data) {
        if (data) {
            _sub.unsubscribe(data);
            _sub.subscribe(data);
        }
    });
    socket.on('io:message', MessageCallBack);
    socket.on('io:messageRead', MessageReadCallback);
    socket.on('io:messageDelivered', MessageDeliveredCallback);
    socket.on('error', function (error) {
        handleError(error, error.stack);
    });
    socket.on('disconnect', function () {
        UserStatus(socket, true);
    });
    socket.on('userstatus', function () {
        UserStatus(socket, false);
    });
    try {
        _pub.smembers(socket.handshake.query.user_id + ':contacts', function (err, contacts) {
            if (!err) {
                socket.emit('io:contactsreceived', contacts);
            }
            UserStatus(socket, false);
        });
        // _pub.publish(requestObj.sender_id + ':contacts', requestString);
    }
    catch (ex) {
        throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}
function ChatRequestCallBack(requestObj) {
    var socket = this;
    try {
        var channel = requestObj.sender_id + ':' + requestObj.receiver_id;
        var senderObj = {
            UserName: requestObj.reciever_username,
            Channel: channel,
            Msisdn: requestObj.receiver_id
        };
        var receiverObj = {
            UserName: requestObj.sender_username,
            Channel: channel,
            Msisdn: requestObj.sender_id
        };
        var senderContactString = '' + JSON.stringify(senderObj) + '';
        var receiverContactString = '' + JSON.stringify(receiverObj) + '';
        _pub.sadd(requestObj.sender_id + ':contacts', senderContactString);
        _pub.sadd(requestObj.receiver_id + ':contacts', receiverContactString);
        //publish to contact channels
        _pub.publish(requestObj.sender_id + ':contacts', senderContactString);
        _pub.publish(requestObj.receiver_id + ':contacts', receiverContactString);
    }
    catch (ex) {
        throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}
function MessageCallBack(messageObject) {
    var socket = this;
    try {
        var message = {
            id: new Date().getUTCMilliseconds().toString(),
            date: new Date(new Date().toUTCString()),
            message: Sanitise(messageObject.message),
            senderUserName: messageObject.senderUserName,
            senderUserId: messageObject.senderUserId,
            senderUserImage: messageObject.senderUserImage,
            isMedia: messageObject.mediaURL && messageObject.mediaURL.length > 0 ? true : false,
            mediaURL: messageObject.mediaURL,
            channel: messageObject.channel,
            messageType: messageObject.messageType,
            messageDeliveryStatus: enumerations_1.MessageDeliveryType.sent,
            messageStatusType: enumerations_1.MessageStatusType.none
        };
        var messageString = '' + JSON.stringify(message) + '';
        // _pub.hget('people', socket.client.conn.id, (error, name) => {
        if (messageObject.messageType === enumerations_1.MessageSendingType.TEXT) {
            //SendPushNotification(messageString, messageObject.channel, messageObject.receiverUserId, socket);
            _pub.rpush(message.channel, messageString);
        }
        // messageString = "aa";
        _pub.publish(message.channel, messageString);
        // _pub.rpush('chat:messages', message.message);   // chat history
        // _pub.publish('chat:messages:latest', message.message);  // lates
        // });
    }
    catch (ex) {
        throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}
function MessageReadCallback(msgObj) {
    var socket = this;
    try {
        var message = {
            id: msgObj.id,
            date: msgObj.date,
            message: msgObj.message,
            senderUserName: msgObj.senderUserName,
            senderUserId: msgObj.senderUserId,
            senderUserImage: msgObj.senderUserImage,
            isMedia: msgObj.isMedia,
            mediaURL: msgObj.mediaURL,
            channel: msgObj.channel,
            messageType: msgObj.messageType,
            messageDeliveryStatus: enumerations_1.MessageDeliveryType.seen,
            messageStatusType: enumerations_1.MessageStatusType.none,
            index: msgObj.index
        };
        var messagedata = '' + JSON.stringify(message) + '';
        _pub.LSET(msgObj.channel, msgObj.index, messagedata);
        _pub.publish(msgObj.channel, messagedata);
    }
    catch (ex) {
        throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}
function MessageDeliveredCallback(msgObj) {
    var socket = this;
    try {
        var message = {
            id: msgObj.id,
            date: msgObj.date,
            message: msgObj.message,
            senderUserName: msgObj.senderUserName,
            senderUserId: msgObj.senderUserId,
            senderUserImage: msgObj.senderUserImage,
            isMedia: msgObj.isMedia,
            mediaURL: msgObj.mediaURL,
            channel: msgObj.channel,
            messageType: msgObj.messageType,
            messageDeliveryStatus: enumerations_1.MessageDeliveryType.delivered,
            messageStatusType: enumerations_1.MessageStatusType.none,
            index: msgObj.index
        };
        var messagedata = '' + JSON.stringify(message) + '';
        _pub.LSET(msgObj.channel, msgObj.index, messagedata);
        _pub.publish(msgObj.channel, messagedata);
    }
    catch (ex) {
        throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}
function UserStatus(socket, isOffline) {
    ConnectionList = [];
    for (var i in socket.server.sockets.connected) {
        if (socket.server.sockets.connected.hasOwnProperty(i)) {
            var s = socket.server.sockets.connected[i];
            var connect = ConnectionList.find(function (x) { return x.handshake.query.user_id === s.handshake.query.user_id; });
            if (!connect) {
                ConnectionList.push(s);
            }
        }
    }
    //Socket Managements HeartBeat
    var connectedSocket = null;
    if (ConnectionList.length > 0) {
        connectedSocket = ConnectionList.find(function (x) { return x.handshake.query.user_id === socket.handshake.query.user_id; });
    }
    if (connectedSocket) {
        ConnectionList = ConnectionList.filter(function (el) { return socket.handshake.query.user_id !== el.handshake.query.user_id; });
        if (isOffline) {
            // ConnectionList.pop(socket);
        }
        else {
            ConnectionList.push(socket);
        }
    }
    else {
        if (!isOffline) {
            ConnectionList.push(socket);
        }
    }
    var onlineUserList = [];
    ConnectionList.forEach(function (connection) {
        if (connection.handshake && connection.handshake.query.user_id !== undefined) {
            onlineUserList.push({ userId: connection.handshake.query.user_id, onlineStatus: true });
        }
    });
    // if (onlineUserList && onlineUserList.length > 0) {
    // socket.server.sockets.emit(ConstantVariable._heartBeatLiveUser, onlineUserList);
    // socket.emit(socket.handshake.query.user_id + ':presence', !isOffline);
    var presenceObj = {
        Msisdn: socket.handshake.query.user_id,
        IsOnline: !isOffline
    };
    socket.server.sockets.emit(presenceObj.Msisdn + ':presence', presenceObj);
    // socket.emit(ConstantVariable._heartBeatLiveUser, onlineUserList);
    //  }
}
// please see: .
function Sanitise(text) {
    var sanitised_text = text;
    /* istanbul ignore else */
    if (text.indexOf('<') > -1 /* istanbul ignore next */
        || text.indexOf('>') > -1) {
        sanitised_text = text.replace(/</g, '&lt').replace(/>/g, '&gt');
    }
    return sanitised_text;
}
/**
 * chat is our Public interface
 * @param {object} listener [required] - the http/hapi server object.
 * @param {function} callback - called once the socket server is running.
 * @returns {function} - returns the callback after 300ms (ample boot time)
 */
module.exports = {
    init: init,
    pub: _pub,
    sub: _sub
};
