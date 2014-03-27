var socket = io.connect('https://dogechat.net:443',{secure: true});
var username = "";
var balance = 0;
var currentRoom = "";
var badge = "none";
var smilies = ["smile", "tongue", "happy", "wink", "wow", "sad", "angry", "mad", "meh", "rolleye", "zzz", "high", "candy", "gift", "teddy", "moon", "sun"];
var smiliesConvert = [[":)", "(:", ":-)"], [":P", ":p", ":-P"], [":D", ":-D"], [";)"], [":o", ":O"], [":(", "):"], [">:("], ["D:<", "D:"], [":/"], ["8)"], ["zzz"], ["^_"], ["(candy)"], ["(gift)"], [":hug:"], ["(moon)"], ["(sun)"]];
var roomInput = [];
var roomMessages = {};
var myRooms = [];
var myPMs = [];
var color = "000";
var badge = "none";
var mentioned = false;

$(document).ready(function(){
	if (getCookie('session') != "") socket.emit('login', {session: getCookie('session')});
	$('#login-btn').click(function(){
		socket.emit("accounts", {action: "login", username: $("#login-username").val(), password: $("#login-password").val()});
	})
	$('#logout-btn').click(function() {
		setCookie("session", "", -1);
		document.location.reload();
	});
	$('#join-room-btn').click(function() {
		if (myRooms.indexOf($("#room-to-join").val()) == -1) {
			socket.emit("joinroom", {join: $('#room-to-join').val()});
		}
		changeRoom($("#room-to-join").val());
		$("#room-to-join").val("");
	});
	$('#pm-user-btn').click(function() {
		var users = [$("#pm-to-join").val().toLowerCase(), username.toLowerCase()];
		users.sort();
		if(myPMs.indexOf([$("#pm-to-join").val().toLowerCase(), users.join(":")]) == -1) {
			socket.emit("joinroom", {join: users.join(":")});
		}
		$("#pm-to-join").val("");
		changeRoom(users.join(":"));
	});
	$('#message-bar').focus(function() {
		$('#chat-header').hide();
		$('.content').css('top', -40);
		$('#chat-content').scrollTop($('#chattext').outerHeight());
	});
	$('#rooms-btn').click(function() {
		$('#chat-content').hide();
		$('#chat-header').hide();
		$('.bar-footer').hide();
		$('#rooms-content').show();
		$('#rooms-header').show();
	});
	$('#style-btn').click(function() {
		$('#chat-content').hide();
		$('#chat-header').hide();
		$('.bar-footer').hide();
		$('#style-content').show();
		$('#style-header').show();
	});
	$('#chat-btn').click(function() {
		styleToChat();
	});
	$('#message-bar').blur(function() {
		$('#chat-header').show();
		$('.content').css('top', 0);
		$('#chat-content').scrollTop($('#chattext').outerHeight());
	});
	$('#message-bar').on('keypress', function (e) {
		if (e.which == 13) {
			sendMsg();
		}
	});
	$('#send-btn').click(function() {
		sendMsg();
	});
});

socket.on("chat", function(data) {
	if (data.message.substr(0, 3).toLowerCase() == "/me") data.message = '<i>' + data.message.substr(3) + '</i>';
	if (data.message.indexOf(username) != -1) {
		data.message = '<b>' + data.message + '</b>';
		$("[data-room='" + data.room + "']").next('.msgCount').addClass('badge-negative').removeClass('badge-primary');
		mentioned = true;
		$('#beep')[0].play();
	}
	data.message - data.message.replace("class='label label-success'", 'class="badge badge-positive"');
	var id = Math.floor(Math.random() * 90000) + 10000;
	theMsg = '<li id="' + id + '" class="table-view-cell chat-line"><p style="color:#' + data.color + ';"><b>' + data.user + ':</b> ' + data.message + '<span class="badge badge-primary badge-inverted">' + data.timestamp.substr(11, 5) + '</span>' + (data.winbtc > 0 ? ('<span class="badge' + (data.user == username ? ' badge-positive' : '') + '">+' + data.winbtc + '</span>') : '') + '</p></li>'
	roomMessages[data.room] = roomMessages[data.room] ? roomMessages[data.room] : [];
	roomMessages[data.room].push(theMsg);
	while (roomMessages[data.room].length > 200) {
		roomMessages[data.room].shift();
	}
	if (data.room == currentRoom) {
		$('#chattext').append(theMsg);
		$('#chat-content').scrollTop($('#chat-content').scrollTop() + $('#' + id).outerHeight() + 1);
	} else {
		counter = $("[data-room='" + data.room + "']").next('.msgCount');
		counter.show();
		counter.html(Number(counter.html()) + 1);
		$('#rooms-btn').css('color', (mentioned ? "#E83127" : "#E88827"))
	}
});

socket.on("loggedin", function(data) {
	console.log("Logged in");
	username = data.username;
	session = data.session;
	setCookie('session', data.session, 365);
	$('#login-content').hide();
	$('#login-header').hide();
	$('#rooms-content').show();
	$('#rooms-header').show();
});

socket.on("getcolors", function(data) {
	if(color == "000" && getCookie("color")) {
		color = getCookie("color");
	}
	newHTML = "";
	for (i in data.colors) {
		newHTML += '<li class="table-view-cell" onClick="setColor(this)" style="color: #' + data.colors[i] + ';">' + data.colors[i] + '</li>';
	}
	$('#mycolors').html(newHTML);
	if(badge == "none" && getCookie("badge")) {
		badge = getCookie("badge");
	}
	newHTML = "";
	for (i in data.badges) {
		newHTML += '<li class="table-view-cell" onClick="setBadge(this)">' + data.badges[i] + '</li>';
	}
	$('#mybadges').html(newHTML);
});

socket.on("joinroom", function(data){
	if (myRooms.indexOf(data.room) == -1 || myPMs.indexOf([data.room.split(":")[0] == username ? data.room.split(":")[1] : data.room.split(":")[0], data.room])) {
		if(data.room.indexOf(":") == -1) {
			myRooms.push(data.room);
			myRooms.sort();
		} else {
			otherUser = data.room.split(":")[0] == username ? data.room.split(":")[1] : data.room.split(":")[0];
			myPMs.push([otherUser, data.room]);
			myPMs.sort();
		}
		updateRoomList();
	}
});

socket.on("balance", function(data) {
	if (data.credits) {
		balance = data.credits;
	} else if (data.change) {
		balance += data.change;
	}
	$('#balance').html(balance + " doge");
});



function updateRoomList() {
	newHTML = "";
	for (i in myRooms) {
		newHTML += '<li class="table-view-cell"><a data-room="' + myRooms[i] + '" onClick="changeRoom(this)">' + myRooms[i] + '</a><span class="badge badge-primary pull-right msgCount">0</span><button class="btn btn-negative" onClick="quitRoom(this)">X</button></li>';
	}
	$('#room-list').html(newHTML);
	newHTML = "";
	for (i in myPMs) {
		newHTML += '<li class="table-view-cell"><a data-room="' + myPMs[i][1] + '" onClick="changeRoom(this)">' + myPMs[i][0] + '</a><span class="badge badge-primary pull-right msgCount">0</span><button class="btn btn-negative" onClick="quitRoom(this)">X</button></li>';
	}
	$('#pm-list').html(newHTML);
}

function setColor(elem) {
	color = $(elem).html();
	styleToChat();
	setCookie("color", color, 365);
}

function setBadge(elem) {
	badge = $(elem).html();
	styleToChat();
	setCookie("badge", badge, 365);
}

function changeRoom(elem) {
	room = $(elem).attr('data-room');
	if (room != currentRoom) {
		$('#chattext').html("");
		$('#chattext').html(roomMessages[room] ? roomMessages[room].join("") : []);
		$('#room-name').html('#' + room);
		currentRoom = room;
		$("[data-room='" + room + "']").next('.msgCount').html("0").hide();
		$("[data-room='" + room + "']").next('.msgCount').removeClass('badge-negative').addClass('badge-primary');
		if ($('.badge-negative').length == 0) {
			$('#rooms-btn').css('color', '#428bca');
			mentioned = false;
		}
	}
	$('#rooms-content').hide();
	$('#rooms-header').hide();
	$('#chat-content').show();
	$('#chat-header').show();
	$('.bar-footer').show();
	$('#chat-content').scrollTop($('#chattext').outerHeight());
}

function quitRoom(elem) {
	room = $(elem).prev().attr('data-room');
	socket.emit("quitroom", {room: room});
	if(room.indexOf(":") == -1) {
		myRooms.splice(myRooms.indexOf(room), 1);
	} else {
		otherUser = room.split(":")[0] == username ? room.split(":")[1] : room.split(":")[0];
		myPMs.splice(myPMs.indexOf([otherUser, room]), 1);
	}
	updateRoomList();
}

function sendMsg() {
	if (username != "") {
		var msg = $("#message-bar").val();
		$("#message-bar").val("");
		if(msg.substr(0,6) == "/query" || msg.substr(0,3) == "/pm" || msg.substr(0,3) == "/w " || msg.substr(0,4) == "/msg") {
			var usr = msg.split(" ")[1];
			if(msg.split(" ")[2] == ""){
				msg = msg.split(" ").slice(0,2).join(" ");
				console.log(msg.split(" ").length);
			}
			var usrStr = [usr.toLowerCase(), username.toLowerCase()].sort();
			if(msg.split(" ").length < 3) {
				srwrap(usrStr[0] + ":" + usrStr[1]);
			} else {
				var theMsg = msg.split(" ").slice(2).join(" ");
				socket.emit("chat", {room: usrStr[0] + ":" + usrStr[1], message: theMsg, color: color, badge: badge});
				alert("PM'd");
			}
			return;
		}
		if(msg.substr(0, 5) == "/type") {
			if(msg.split(" ").length == 3) {
				socket.emit("settype", {user: msg.split(" ")[1], type: msg.split(" ")[2]});
				return;
			}
		}
		if(msg.substr(0, 7) == "/ignore") {
			if(msg.split(" ").length >1 && msg.split(" ")[1] != "list") {
				var usr = msg.split(" " )[1].replace(/[^a-z0-9]/gi,'').toLowerCase();
				addSystemMessage(currentRoom, "You have ignored " + usr);
				ignored.push(usr);
				socket.emit("ignore", {ignore: ignored});
				setCookie("ignored", ignored.join("/"));
			} else {
				addSystemMessage(currentRoom, "You are currently ignoring: " + ignored.join(" "));
			}
			return;
		}
		if(msg.substr(0,5) == "/help") {
			addSystemMessage(currentRoom, "Commands: /ignore [user to ignore OR list] /unignore [user to uningore] /join [room] /pm [user] /tip [user] [amount] [note]");
			addSystemMessage(currentRoom, "Room owner / op commands: /op [user] /deop [user] /listop [user] /kick [user] /unkick [user] /set private /unset private (private: only your friends can join) /topic [new channel topic]");
			return;
		}
		if(msg.substr(0, 9) == "/unignore" && msg.split(" ").length>1) {
			var usr = msg.split(" ")[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
			if(ignored.indexOf(usr) != -1){
				ignored.splice(ignored.indexOf(usr), 1);
				socket.emit("ignore", {ignore: ignored});
				addSystemMessage(currentRoom, "You have unignored " + usr);
			}
			setCookie("ignored", ignored.join("/"));
			return;
		}
		if(msg.substr(0,5) == "/join") {
			msg = msg.replace("#", "");
			if(msg.split(" ").length==2){
			srwrap(msg.split(" ")[1]);
			return;
			}		
		}
		if(msg.substr(0,4) == "/set" || msg.substr(0,6) == "/unset") {
			if(msg.split(" ").length == 2){
				if(msg.substr(0,4) == "/set") {
					socket.emit("set", {room: currentRoom, set: msg.split(" ")[1]});
				} else {
					socket.emit("set", {room: currentRoom, unset: msg.split(" ")[1]});
				}
				return;
			}
		}
		if(msg.substr(0,4) == "/tip") {
			if(msg.split(" ").length > 2){
				var tipTo = msg.split(" ")[1];
				var tipAmount = msg.split(" ")[2];
				if(msg.split(" ")[3]){
				var tipMsg = msg.split(" ").slice(3).join(" ");
				} else {
					var tipMsg = "";
				}
				socket.emit("tip", {room: currentRoom, user: tipTo, tip: tipAmount, message: tipMsg});
				return;
			}
		}
		if(msg.substr(0,5) == "/kick" || msg.substr(0,7) == "/unkick") {
			if(msg.split(" ").length >= 2){
				if(msg.substr(0,5) == "/kick") {
					socket.emit("kick", {action: "kick", room: currentRoom, user: msg.split(" ")[1]});
				} else {
					socket.emit("kick", {action: "unkick", room: currentRoom, user: msg.split(" ")[1]});
				}
			}
			return;
		}
		if(msg.substr(0,5) == "/warn") {
			if(msg.split(" ").length <= 3) {
				return;
			}
			var warnMsg = msg.split(" ").slice(2).join(" ");
			warnMsg = (warnMsg == "spam" ? "Please do not spam the chat by repeatedly saying short messages, or nonsense. Thanks!" : warnMsg);
			socket.emit("warn", {target: msg.split(" ")[1], warn: warnMsg});
			return;
		}
		if(msg.substr(0,5) == "/nuke") {
			if(msg.split(" ").length < 1) {
				return;
			}
			socket.emit("nuke", {target: msg.split(" ")[1], reason: msg.split(" ").slice(2).join(" "), room: currentRoom});
			return;
		}
		if(msg.substr(0,6) == "/badge") {
			if(msg.split(" ").length < 2) {
				return;
			}
			socket.emit("badge", {action: "grant", user: msg.split(" ")[1], badge: msg.split(" ")[2]});
			return;
		}
		if(msg.substr(0,5) == "/mute") {
			if(msg.split(" ").length >= 3) {
				var reason = (msg.split(" ").length > 3 ? msg.split(" ").slice(3).join(" ") : "");
				socket.emit("mute", {mute: msg.split(" ")[2], target: msg.split(" ")[1], room: currentRoom, reason: reason});
				return;
			}
		}
		if(msg.substr(0, 3) == "/op" || msg.substr(0,5) == "/list" || msg.substr(0,7) == "/listop") {
			if(msg.split(" ").length >= 2) {
				socket.emit("op", {room: currentRoom, target: msg.split(" ")[1], action: "op"});
				return;
			} else {
				socket.emit("op", {room: currentRoom, target: "none", action: "list"});
				return;
			}
		}
		if(msg.substr(0,5) == "/deop") {
			if(msg.split(" ").length >= 2) {
				socket.emit("op", {room: currentRoom, target: msg.split(" ")[1], action: "deop"});
			}
			return;
		}
		if(msg.substr(0,10) == "/whitelist") {
			if(msg.split(" ").length >= 2) {
				socket.emit("whitelist", {action: "whitelist", target: msg.split(" ")[1]});
				return;
			}
		}
		if(msg.substr(0,12) == "/unwhitelist") {
			if(msg.split(" ").length >= 2) {
				socket.emit("whitelist", {action: "unwhitelist", target: msg.split(" ")[1]});
				return;
			}
		}
		if(msg.substr(0,8) == "/promote") {
			if(msg.split(" ").length >= 2) {
				socket.emit("whitelist", {action: "promote", target: msg.split(" ")[1]});
				return;
			}
		}
		if(msg.substr(0,10) == "/blacklist") {
			if(msg.split(" ").length >= 2) {
				socket.emit("whitelist", {action: "blacklist", target: msg.split(" ")[1]});
				return;
			}
		}
		msg = " " + msg;
		for(var i in smiliesConvert){
			for(var j in smiliesConvert[i]){
				msg = msg.replace(" " + smiliesConvert[i][j], " :" + smilies[i] + ":");
			}
		}
		msg = msg.trim();
		socket.emit("chat", {room: currentRoom, message: msg, color: color, badge: badge});
	}
}

function styleToChat() {
	$('#chat-content').show();
	$('#chat-header').show();
	$('.bar-footer').show();
	$('#style-content').hide();
	$('#style-header').hide();
}

function setCookie(cname,cvalue,exdays){var d = new Date();d.setTime(d.getTime()+(exdays*24*60*60*1000));var expires = "expires="+d.toGMTString();document.cookie = cname + "=" + cvalue + "; " + expires;}
function getCookie(cname){var name = cname + "=";var ca = document.cookie.split(';');for(var i=0; i<ca.length; i++){var c = ca[i].trim();if(c.indexOf(name)==0) return c.substring(name.length,c.length);}return "";}