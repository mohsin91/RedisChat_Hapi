'use strict';
/* global $ io Cookies */

$(document).ready(function () {
  var loggedInUser = {
    UserMsisdn: Cookies.get('msisdn'),
    UserName: Cookies.get('name')
  }
  var socket = io('http://192.168.0.171:8056?user_id=' + loggedInUser.UserMsisdn); // initialise socket.io connection
  var modal = document.getElementById('myModal');
  var activeChatChannel = "";
  var activeChatIndex = 0;
  var totalChatDialogs = 0;

  $('#logout').on("click", function (e) {
    Cookies.set('name', '');
    socket.disconnect();
    window.location.href = "/";
  });

  function subscribeToChatDialogs() {
    //Subscribe to new contact requests
    var channelName = loggedInUser.UserMsisdn + ':contacts';
    socket.emit('subscribe:channel', channelName);
    //get Chat Dialogs
    // socket.emit('io:getcontacts', loggedInUser.UserMsisdn);
  }

  function getName() {
    // prompt for person's name before allowing to post
    var name = loggedInUser.UserName;

    if (name === 'Mohsin') {
      $('#opponentName').text('Usama');
    }
    else {
      $('#opponentName').text('Mohsin');
    }

    if (!name || name === 'null') {
      name = window.prompt('What is your name/handle?'); // eslint-disable-line
      Cookies.set('name', name);
    }
    socket.emit('io:name', name);
    $('#m').focus(); // focus cursor on the message input

    return name;
  }

  function leadZero(number) {
    return (number < 10) ? '0' + number : number;
  }

  function getTime(timestamp) {
    var t, h, m, s;

    t = new Date(timestamp);
    h = leadZero(t.getHours());
    m = leadZero(t.getMinutes());
    s = leadZero(t.getSeconds());

    return String(h) + ':' + m + ':' + s;
  }

  /**
   * renders messages to the DOM. nothing fancy. want fancy? ask!
   * @param {String} message - the message (stringified object) to be displayed.
   * @returns {Boolean} false;
   */
  function renderMessage(messageObj) {
    // var msg = JSON.parse(message);
    var html = '<li class=\'row\'>';

    html += '<small class=\'time\'>' + ' </small>';
    html += '<span class=\'name\'>' + messageObj.senderUserName + '</span>';
    html += '<p class=\'msg\'>' + messageObj.message + '</p>';
    html += '</li>';
    var html1;
    if (loggedInUser.UserName == messageObj.senderUserName) {
      html1 = '<div style="position:relative"  msgIndex=\"' + messageObj.index + '\" class="outgoing_msg">';
      html1 += '<div class="sent_msg row">';
      html1 += '<p>' + messageObj.message + '</p>'
      html1 += '<span class="time_date"> 11:01 AM    |    June 9</span>'
      if (messageObj.messageDeliveryStatus == 0) {
        html1 += '<span class="checkmark" id="spnDelStatus_' + messageObj.id + '" class="time_date">'
        html1 += '<div class="checkmark_stem_unfilled"></div>';
        html1 += '<div class="checkmark_kick_unfilled"></div>';
        html1 += '</span>';
        html1 += '<span style="display:none" class="checkmark2" id="spnDelStatus2_' + messageObj.id + '" class="time_date">';
        html1 += '<div class="checkmark_stem_unfilled"></div>';
        html1 += '<div class="checkmark_kick_unfilled"></div>';
        html1 += '</span> </div>';
      }
      else if (messageObj.messageDeliveryStatus == 1) {
        html1 += '<span class="checkmark" id="spnDelStatus_' + messageObj.id + '" class="time_date">';
        html1 += '<div class="checkmark_stem_unfilled"></div>';
        html1 += '<div class="checkmark_kick_unfilled"></div>';
        html1 += '</span>';
        html1 += '<span class="checkmark2" id="spnDelStatus2_' + messageObj.id + '" class="time_date">';
        html1 += '<div class="checkmark_stem_unfilled"></div>';
        html1 += '<div class="checkmark_kick_unfilled"></div>';
        html1 += '</span> </div>';
      }
      else if (messageObj.messageDeliveryStatus == 2) {
        html1 += '<span class="checkmark" id="spnDelStatus_' + messageObj.id + '" class="time_date">';
        html1 += '<div class="checkmark_stem"></div>';
        html1 += '<div class="checkmark_kick"></div>';
        html1 += '</span>';
        html1 += '<span class="checkmark2" id="spnDelStatus2_' + messageObj.id + '" class="time_date">';
        html1 += '<div class="checkmark_stem"></div>';
        html1 += '<div class="checkmark_kick"></div>';
        html1 += '</span> </div>';
      }
      html1 += '</div>';
    }
    else {
      html1 = '<div msgIndex=\"' + messageObj.index + '\" class="incoming_msg">';
      html1 += '<div class="incoming_msg_img"> <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil"> </div>';
      html1 += '<div class="received_msg">';
      html1 += '<div class="received_withd_msg">'
      html1 += '<p>' + messageObj.message + '</p>';
      html1 += '<span class="time_date"> 11:01 AM    |    June 9</span> </div>';
      html1 += '</div>';
    }
    $('#messages').append(html1);  // append to list
  }

  $('#m').keypress(function (e) {
    if (e.which == 13) {
      $("#btnSend").trigger("click");
      return false;
    }
    else {
      var TypingStatus = {
        senderUserName: loggedInUser.UserName,
        senderUserId: loggedInUser.UserMsisdn,
        channel: activeChatChannel,
        messageType: 2,
        mediaURL: "",
        message: ""
      };

      socket.emit('io:message', TypingStatus);
    }
  });

  $('#btnSend, #iButtonSend').click(function () {
    var msg;
    var msgText = $('#m').val();
    var msg1 = {
      message: msgText,
      senderUserName: loggedInUser.UserName,
      senderUserId: loggedInUser.UserMsisdn,
      channel: activeChatChannel,
      messageType: 0,
      messageDeliveryStatus: 0,
      messageStatusType: 0
    };

    // if input is empty or white space do not send message
    if ($('#m').val()
      .match(/^[\s]*$/) !== null) {
      $('#m').val('');
      $('#m').attr('placeholder', 'please enter your message here');
    } else if (!loggedInUser.UserName || loggedInUser.UserName.length < 1
      || loggedInUser.UserName === 'null') {
      getName();
    } else {
      msg = $('#m').val();
      socket.emit('io:message', msg1);
      $('#m').val(''); // clear message form ready for next/new message
      $('#m').attr('placeholder', ''); // clears placeholder once a msg is successfully sent
    }

    return false;
  });

  $('form').submit(function () {
    var msg;

    // if input is empty or white space do not send message
    if ($('#m').val()
      .match(/^[\s]*$/) !== null) {
      $('#m').val('');
      $('#m').attr('placeholder', 'please enter your message here');
    } else if (!loggedInUser.UserName || loggedInUser.UserName.length < 1
      || loggedInUser.UserName === 'null') {
      getName();
    } else {
      msg = $('#m').val();
      socket.emit('io:message', msg);
      $('#m').val(''); // clear message form ready for next/new message
      $('#m').attr('placeholder', ''); // clears placeholder once a msg is successfully sent
    }

    return false;
  });

  // keeps latest message at the bottom of the screen
  // http://stackoverflow.com/a/11910887/2870306
  function scrollToBottom() {
    // $(window).scrollTop($('#mesgs').height());
    var $t = $('#messages');
    $t.animate({ "scrollTop": $('#messages')[0].scrollHeight }, "slow");
  }

  window.onresize = function () {
    scrollToBottom();
  };

  socket.on(loggedInUser.UserMsisdn + ':contacts', function (contact) {
    var contact = JSON.parse(contact);
    var chatDialogIndex = 0;
    var html = "";
    if (totalChatDialogs > 0) {
      chatDialogIndex = totalChatDialogs;
      html += "<div style=\"cursor:pointer\" index=\"" + chatDialogIndex + "\" msisdn=\"" + contact.Msisdn + "\" channel=\"" + contact.Channel + "\" id=\"divChatList_" + chatDialogIndex + "\" class=\"chat_list\">";
    }
    else {
      html += "<div style=\"cursor:pointer\" index=\"" + chatDialogIndex + "\" msisdn=\"" + contact.Msisdn + "\" channel=\"" + contact.Channel + "\" id=\"divChatList_" + chatDialogIndex + "\" class=\"chat_list active_chat\">";
    }
    html += "<div  index=\"" + chatDialogIndex + "\" class=\"chat_people\">";
    html += "<div class=\"chat_img\"> <img src=\"https://ptetutorials.com/images/user-profile.png\" alt=\"sunil\">";
    html += "<label style=\"font-size:15px\" id=\"lblStatus_" + contact.Msisdn + "\">Offline</label>"
    html += "</div>"
    html += "<div index=\"" + chatDialogIndex + "\" class=\"chat_ib\">";
    html += "<h5>" + contact.UserName + "<span class=\"chat_date\">Dec 25</span></h5>";
    html += "<p id=\"lstMsg_" + contact.Channel + "\" lstMsgIndex=\"\">This is default msg, development in progress along with unread count.</p>";
    html += "<p id=\"typing_" + contact.Msisdn + "\" style=\"display:none; color:darkred\" >Stopped</p>";
    html += "</div>";
    html += "</div>";
    html += "</div>";

    $('#chatDialogs').append(html);
    document.getElementById("divChatList_" + chatDialogIndex).addEventListener("click", ChatDialogClicked, false);
    //subscribe to the newly created channel
    socket.emit("subscribe:channel", contact.Channel);
    subscribeToMessageChannel(contact.Channel);
    subscribeToPresenceChannel(contact.Msisdn);
    if (totalChatDialogs == 0) {
      totalChatDialogs = 1;
      activeChatIndex = 0;
      activeChatChannel = contact.Channel;
    }
    else {
      totalChatDialogs = totalChatDialogs + 1;
    }

    socket.emit('userstatus');
  });

  socket.on('io:contactsreceived', function (data) {
    totalChatDialogs = data.length;
    data.forEach(function (element, i) {
      var contact = JSON.parse(element);
      var html = "";
      if (i == 0) {
        activeChatChannel = contact.Channel;
        html += "<div style=\"cursor:pointer\" index=\"" + i + "\" msisdn=\"" + contact.Msisdn + "\" channel=\"" + contact.Channel + "\" id=\"divChatList_" + i + "\" class=\"chat_list active_chat\">";
      }
      else {
        html += "<div style=\"cursor:pointer\" index=\"" + i + "\" msisdn=\"" + contact.Msisdn + "\" channel=\"" + contact.Channel + "\" id=\"divChatList_" + i + "\" class=\"chat_list\">";
      }
      html += "<div index=\"" + i + "\" id=\"divChatPeople_" + i + "\" class=\"chat_people\">";
      html += "<div index=\"" + i + "\" class=\"chat_img\"> <img src=\"https://ptetutorials.com/images/user-profile.png\" alt=\"sunil\">";
      html += "<label style=\"font-size:15px\" id=\"lblStatus_" + contact.Msisdn + "\">Offline</label>"
      html += "</div>"
      html += "<div index=\"" + i + "\" class=\"chat_ib\">";
      html += "<h5>" + contact.UserName + "<span index=\"+i+\" class=\"chat_date\">Dec 25</span></h5>";
      html += "<p id=\"lstMsg_" + contact.Channel + "\" lstMsgIndex=\"\">This is default msg, development in progress along with unread count.</p>";
      html += "<p id=\"typing_" + contact.Msisdn + "\" style=\"display:none; color:darkred\" >Stopped</p>";
      html += "</div>";
      html += "</div>";
      html += "</div>";

      $('#chatDialogs').append(html);
      document.getElementById("divChatList_" + i).addEventListener("click", ChatDialogClicked, false);
      socket.emit('subscribe:channel', contact.Channel);
      subscribeToMessageChannel(contact.Channel);
      subscribeToPresenceChannel(contact.Msisdn);
    });
    loadMessages(0);
  });

  function subscribeToMessageChannel(channel) {
    socket.on(channel, function (msg) {
      var parsedMsg = JSON.parse(msg);

      if (parsedMsg.messageType == 0) {                                      //// Text message
        var lstMsg = document.getElementById('lstMsg_' + parsedMsg.channel);
        var lstMsgIndex = parseInt(lstMsg.getAttribute('lstMsgIndex') || -1);
        if (parsedMsg.channel == activeChatChannel) {                       //// Active channel
          //Check if new message or only status change of message sent


          if (parsedMsg.messageDeliveryStatus == 0) {                      //// New messgage
            lstMsg.textContent = parsedMsg.message;
            //Get the index of last message and increment.
            lstMsgIndex = lstMsgIndex + 1;
            lstMsg.setAttribute('lstMsgIndex', lstMsgIndex);
            parsedMsg.index = lstMsgIndex;
            renderMessage(parsedMsg);
            scrollToBottom();
            //// If user is on screen send read status
            if (parsedMsg.senderUserId != loggedInUser.UserMsisdn && parsedMsg.messageDeliveryStatus < 2) {
              parsedMsg.messageDeliveryStatus = 2;        //Message Seen
              socket.emit('io:messageRead', parsedMsg);
            }
          }
          else if (parsedMsg.messageDeliveryStatus == 1 && parsedMsg.senderUserId == loggedInUser.UserMsisdn) {
            var stem = $('#spnDelStatus_' + parsedMsg.id + '> div:first-child');
            var secondTick = $('#spnDelStatus2_' + parsedMsg.id)[0];

            if (secondTick == undefined) {
              var htmlSecondTick = '<span class="checkmark2" id="spnDelStatus2_' + parsedMsg.id + '" class="time_date">';
              htmlSecondTick += '<div class="checkmark_stem_unfilled"></div>';
              htmlSecondTick += '<div class="checkmark_kick_unfilled"></div>';
              htmlSecondTick += '</span>';
              $(htmlSecondTick).insertAfter(stem);
            }
            secondTick.style.display = "block";
          }
          else if (parsedMsg.messageDeliveryStatus == 2 && parsedMsg.senderUserId == loggedInUser.UserMsisdn) {
            var stem = $('#spnDelStatus_' + parsedMsg.id + '> div:first-child');
            var stem2 = $('#spnDelStatus2_' + parsedMsg.id + '> div:first-child');

            var kick = stem.next();
            var kick2 = stem2.next();
            stem.removeClass("checkmark_stem_unfilled");
            stem.addClass("checkmark_stem");
            kick.removeClass("checkmark_kick_unfilled");
            kick.addClass("checkmark_kick");
            stem2.removeClass("checkmark_stem_unfilled");
            stem2.addClass("checkmark_stem");
            kick2.removeClass("checkmark_kick_unfilled");
            kick2.addClass("checkmark_kick");
            stem2[0].parentElement.style.display = "block";
          }
        }
        else {
          if (parsedMsg.senderUserId != loggedInUser.UserMsisdn && parsedMsg.messageDeliveryStatus == 0) {
            // var lstMsg = document.getElementById('lstMsg_' + parsedMsg.channel);
            // var lstMsgIndex = parseInt(lstMsg.getAttribute('lstMsgIndex')) || -1;
            lstMsg.textContent = parsedMsg.message;
            lstMsgIndex = lstMsgIndex + 1;
            lstMsg.setAttribute('lstMsgIndex', lstMsgIndex);
            parsedMsg.messageDeliveryStatus = 1;        //Message Delivered
            parsedMsg.index = lstMsgIndex;
            socket.emit('io:messageDelivered', parsedMsg);
          }
          //Update the count of chatDialog
        }
      }
      else if (parsedMsg.messageType == 2) {
        renderTypingStatus(parsedMsg);
      }
    });
  }

  function renderTypingStatus(typing) {
    if (typing.senderUserId == loggedInUser.UserMsisdn) {
      return;
    }
    $('#typing_' + typing.senderUserId).text(typing.senderUserName + " is typing...");
    document.getElementById("typing_" + typing.senderUserId).style.display = "block";
    setTimeout(function () {
      document.getElementById("typing_" + typing.senderUserId).style.display = "none";
    },
      1500);
  }

  function subscribeToPresenceChannel(msisdn) {
    socket.on(msisdn + ':presence', function (presence) {
      var lblStatus = document.getElementById('lblStatus_' + presence.Msisdn);
      if (presence.IsOnline == true) {
        //Tell opponent you are online only if he comes online from offline - 1 time
        if (lblStatus.textContent == "Online") {
          return;
        }
        $('#lblStatus_' + presence.Msisdn).text("Online");
        lblStatus.style.color = "limegreen";
        lblStatus.style.fontWeight = "bold";
        socket.emit('userstatus', true);
      }
      else {
        $('#lblStatus_' + msisdn).text("Offline");
        lblStatus.style.color = "black";
        lblStatus.style.fontWeight = "normal";
      }

    });
  }
  getName();

  subscribeToChatDialogs();

  function loadMessages(channelIndex) {
    var divActiveChatDialog = $('#divChatList_' + channelIndex)[0];
    if (divActiveChatDialog != undefined) {
      var channel = divActiveChatDialog.getAttribute('channel');
      var lstMsg = document.getElementById('lstMsg_' + channel);
    }

    var path = "/load?channelName=" + activeChatChannel;
    $.get(path, function (data) {
      var msgIndex = 0;
      data.forEach(function (msg) {
        var parsedMsg = JSON.parse(msg);
        if (parsedMsg.messageDeliveryStatus < 2 && parsedMsg.senderUserId != loggedInUser.UserMsisdn) {
          parsedMsg.messageDeliveryStatus = 2;
          parsedMsg.index = msgIndex;
          socket.emit('io:messageRead', parsedMsg);
        }
        parsedMsg.index = msgIndex;
        renderMessage(parsedMsg);
        msgIndex = msgIndex + 1;
      });
      if (divActiveChatDialog != undefined) {
        lstMsg.setAttribute('lstMsgIndex', msgIndex - 1);
      }
      scrollToBottom();
    });
  }

  $('#btnAddContact').on("click", function () {
    modal.style.display = "block";
  });

  $('#spnCloseModal').on("click", function () {
    modal.style.display = "none";
  });

  $('#submitAddContact').on("click", function () {
    var name = $('#txtNameContact').val();
    var msisdn = $('#txtNumberContact').val();

    if (name != "" || msisdn != "") {
      //Call the Chat:Request on socket
      var objChatRequest = {
        sender_username: loggedInUser.UserName,
        sender_id: loggedInUser.UserMsisdn,
        reciever_username: name,
        receiver_id: msisdn
      }

      socket.emit('Chat:Request', objChatRequest);

      //Clear the fields and close modal
      $('#txtNameContact').val('');
      $('#txtNumberContact').val('');
      modal.style.display = "none";
    }
  });

  function ChatDialogClicked(event) {
    var chatDialogIndex = this.getAttribute("index");
    //Below check is whether chat channel has been changed.
    if (chatDialogIndex != activeChatIndex) {
      var channelName = this.getAttribute("channel");
      //unactivate the previous active chat dialog
      document.getElementById('divChatList_' + activeChatIndex).classList.remove("active_chat");
      //update active Chat Index and active Chat Channel
      activeChatIndex = chatDialogIndex;
      activeChatChannel = channelName;
      //empty the existing messages from the div
      $('#messages').html("");
      //activate the clicked chat dialog
      this.classList.add("active_chat");
      //Load messages for the new active chat
      loadMessages(chatDialogIndex);
    }
  }

  socket.on('HeartBeat:undefined', function (data) {
    data.forEach(element => {
      if (element.onlineStatus == true) {
        var lblStatus = document.getElementById('lblStatus_' + element.userId);
        if (lblStatus == null) {
          return;
        }
        $('#lblStatus_' + element.userId).text("Online");
        lblStatus.style.color = "limegreen";
        lblStatus.style.fontWeight = "bold";
      }
      else {
        var lblStatus = document.getElementById('lblStatus_' + element.userId);
        $('#lblStatus_' + element.userId).text("Offline");
        lblStatus.style.color = "black";
        lblStatus.style.fontWeight = "normal";
      }
    });

    for (let i = 0; i < totalChatDialogs; i++) {
      var msisdn = document.getElementById('divChatList_' + i).getAttribute("msisdn");
      var msisdnExists = data.find(function (item) {
        return item.userId == msisdn;
      });
      if (msisdnExists == null) {
        var lblStatus = document.getElementById('lblStatus_' + msisdn);
        $('#lblStatus_' + msisdn).text("Offline");
        lblStatus.style.color = "black";
        lblStatus.style.fontWeight = "normal";
      }

    }
  });
});
