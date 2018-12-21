
import * as SocketIO from 'socket.io';
import * as moment from 'moment';

import { IMessage, IMessageViewModel, IMessageRead } from '../model/Message';
import { ChatRequestViewModel } from '../model/ChatRequest';
// import { ChatRequest, ChatRequestViewModel, HeartBeatViewModel, UserViewModel } from '../model/ChatRequest';
import { MessageSendingType, MessageStatusType, MessageDeliveryType } from '../helper/enumerations';
import { ConstantVariable } from '../helper/constants';
import { Socket } from 'net';
// import { func } from '../../node_modules/@types/joi';
// import { HttpRequest } from '../helper/request';
// import * as Configs from "../configurations";

let _pub = require('redis-connection')();
let _sub = require('redis-connection')('subscriber');
var handleError = require('hapi-error').handleError;

//  const SocketIO = require("socket.io");
let _io: any;
let ConnectionList: SocketIO = [];


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
    let socket: SocketIO = this;
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

  // socket.on('disconnect', function () {
  //   UserStatus(socket, true);
  // });

  // socket.on('userstatus', function () {
  //   UserStatus(socket, false);
  // });

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


function ChatRequestCallBack(requestObj: ChatRequestViewModel): void {
  let socket: SocketIO = this;
  try {
    var channel = requestObj.sender_id + ':' + requestObj.receiver_id;

    let senderObj = {
      UserName: requestObj.reciever_username,
      Channel: channel,
      Msisdn: requestObj.receiver_id
    }
    let receiverObj = {
      UserName: requestObj.sender_username,
      Channel: channel,
      Msisdn: requestObj.sender_id
    }

    let senderContactString = '' + JSON.stringify(senderObj) + '';
    let receiverContactString = '' + JSON.stringify(receiverObj) + '';

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

function MessageCallBack(messageObject: IMessageViewModel): void {
  let socket: SocketIO = this;
  try {
    let message: IMessage = {
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
      messageDeliveryStatus: MessageDeliveryType.sent,
      messageStatusType: MessageStatusType.none
    };

    let messageString = '' + JSON.stringify(message) + '';

    // _pub.hget('people', socket.client.conn.id, (error, name) => {
      if (messageObject.messageType === MessageSendingType.TEXT) {
        //SendPushNotification(messageString, messageObject.channel, messageObject.receiverUserId, socket);
        _pub.rpush(message.channel, messageString);

      }
      // messageString = "aa";
      _pub.publish(message.channel, messageString);
      // _pub.rpush('chat:messages', message.message);   // chat history
      // _pub.publish('chat:messages:latest', message.message);  // lates
    // });

  } catch (ex) {
    throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
  }
}

function MessageReadCallback(msgObj: IMessageViewModel): void {
  let socket: SocketIO = this;
  try {
    let message: IMessageRead = {
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
      messageDeliveryStatus: MessageDeliveryType.seen,
      messageStatusType: MessageStatusType.none,
      index: msgObj.index
    };

    let messagedata = '' + JSON.stringify(message) + '';
    _pub.LSET(msgObj.channel, msgObj.index, messagedata);
    _pub.publish(msgObj.channel, messagedata);
  } catch (ex) {
    throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
  }
}

function MessageDeliveredCallback(msgObj: IMessageViewModel): void {
  let socket: SocketIO = this;
  try {
    let message: IMessageRead = {
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
      messageDeliveryStatus: MessageDeliveryType.delivered,
      messageStatusType: MessageStatusType.none,
      index: msgObj.index
    };

    let messagedata = '' + JSON.stringify(message) + '';
    _pub.LSET(msgObj.channel, msgObj.index, messagedata);
    _pub.publish(msgObj.channel, messagedata);
  } catch (ex) {
    throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
  }
}

function UserStatus(socket, isOffline) {
  ConnectionList = [];
  for (var i in socket.server.sockets.connected) {
    if (socket.server.sockets.connected.hasOwnProperty(i)) {
      var s = socket.server.sockets.connected[i];
      let connect = ConnectionList.find(x => x.handshake.query.user_id === s.handshake.query.user_id);
      if (!connect) {
        ConnectionList.push(s);
      }
    }
  }
  //Socket Managements HeartBeat
  let connectedSocket = null;
  if (ConnectionList.length > 0) {
    connectedSocket = ConnectionList.find(x => x.handshake.query.user_id === socket.handshake.query.user_id);
  }
  if (connectedSocket) {
    ConnectionList = ConnectionList.filter((el) => socket.handshake.query.user_id !== el.handshake.query.user_id);
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
  let onlineUserList = [];
  ConnectionList.forEach(connection => {
    if (connection.handshake && connection.handshake.query.user_id !== undefined) {
      onlineUserList.push({ userId: connection.handshake.query.user_id, onlineStatus: true });
    }
  });
  // if (onlineUserList && onlineUserList.length > 0) {
  // socket.server.sockets.emit(ConstantVariable._heartBeatLiveUser, onlineUserList);
  // socket.emit(socket.handshake.query.user_id + ':presence', !isOffline);
  var presenceObj =
  {
    Msisdn: socket.handshake.query.user_id,
    IsOnline: !isOffline
  }
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
