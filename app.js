var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var Room = require('./room.js');
var uuid = require('node-uuid');
var _ = require('underscore')._;
var mongo = require('mongodb').MongoClient;



var people = {};
var sockets = [];
var rooms = {};
var chatHistory = {};
var WhisperChek = false;
var room1 = new Room("Oda1", 1);
var room2 = new Room("Oda2", 2);
var room3 = new Room("Oda3", 3);
rooms[1] = room1;
rooms[2] = room2;
rooms[3] = room3;

app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/css', express.static(__dirname + '/css'));


app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

function purge(s, action) {
	if (people[s.id].inroom) { //user is in a room
		var room = rooms[people[s.id].inroom]; //check which room user is in.
		if (s.id === room.owner) { //user in room and owns room
			if (action === "disconnect") {
				io.sockets.in(s.room).emit("update", "Odanın sahibi(" + people[s.id].name + ") server'dan ayrıldı.Oda kaldırıldı ve sende odadan çıkarıldın");
				var socketids = [];
				for (var i = 0; i < sockets.length; i++) {
					socketids.push(sockets[i].id);
					if (_.contains((socketids)), room.people) {
						sockets[i].leave(room.name);
					}
				}
				if (_.contains((room.people)), s.id) {
					for (var i = 0; i < room.people.length; i++) {
						people[room.people[i]].inroom = null;
					}
				}
				room.people = _.without(room.people, s.id); //remove people from the room:people{}collection
				delete rooms[people[s.id].owns]; //delete the room
				delete people[s.id]; //delete user from people collection
				delete chatHistory[room.name]; //delete the chat history
				sizePeople = _.size(people);
				sizeRooms = _.size(rooms);
				io.sockets.emit("update-people", { people: people, count: sizePeople });
				io.sockets.emit("roomList", { rooms: rooms, count: sizeRooms });
				var o = _.findWhere(sockets, { 'id': s.id });
				sockets = _.without(sockets, o);
			} else if (action === "removeRoom") { //room owner removes room
				io.sockets.in(s.room).emit("update", "Odanın sahibi(" + people[s.id].name + ") odayı kaldırdı ve sende odadan çıkarıldın.");
				var socketids = [];
				for (var i = 0; i < sockets.length; i++) {
					socketids.push(sockets[i].id);
					if (_.contains((socketids)), room.people) {
						sockets[i].leave(room.name);
					}
				}
				if (_.contains((room.people)), s.id) {
					for (var i = 0; i < room.people.length; i++) {
						people[room.people[i]].inroom = null;
					}
				}
				delete rooms[people[s.id].owns];
				people[s.id].owns = null;
				room.people = _.without(room.people, s.id); //remove people from the room:people{}collection
				delete chatHistory[room.name]; //delete the chat history
				sizeRooms = _.size(rooms);
				io.sockets.emit("roomList", { rooms: rooms, count: sizeRooms });
			} else if (action === "leaveRoom") { //room owner leaves room
				io.sockets.in(s.room).emit("update", "Odanın sahibi(" + people[s.id].name + ") odadan ayrıldı.Oda kaldırıldı ve odadan çıkarıldın.");
				var socketids = [];
				for (var i = 0; i < sockets.length; i++) {
					socketids.push(sockets[i].id);
					if (_.contains((socketids)), room.people) {
						sockets[i].leave(room.name);
					}
				}
				if (_.contains((room.people)), s.id) {
					for (var i = 0; i < room.people.length; i++) {
						people[room.people[i]].inroom = null;
					}
				}
				delete rooms[people[s.id].owns];
				people[s.id].owns = null;
				room.people = _.without(room.people, s.id); //remove people from the room:people{}collection
				delete chatHistory[room.name]; //delete the chat history
				sizeRooms = _.size(rooms);
				io.sockets.emit("roomList", { rooms: rooms, count: sizeRooms });
			}
		} else {//user in room but does not own room
			if (action === "disconnect") {
				io.sockets.emit("update", people[s.id].name + " server'dan ayrıldı.");
				if (_.contains((room.people), s.id)) {
					var personIndex = room.people.indexOf(s.id);
					room.people.splice(personIndex, 1);
					s.leave(room.name);
				}
				delete people[s.id];
				sizePeople = _.size(people);
				io.sockets.emit("update-people", { people: people, count: sizePeople });
				var o = _.findWhere(sockets, { 'id': s.id });
				sockets = _.without(sockets, o);
			} else if (action === "removeRoom") {
				s.emit("update", "Sadece sahibi odayı kaldırabilir.");
			} else if (action === "leaveRoom") {
				if (_.contains((room.people), s.id)) {
					var personIndex = room.people.indexOf(s.id);
					room.people.splice(personIndex, 1);
					people[s.id].inroom = null;
					//io.sockets.emit("update", people[s.id].name + "odadan ayrıldı.");
					s.leave(room.name);
				}
			}
		}
	} else {
		//The user isn't in a room, but maybe he just disconnected, handle the scenario:
		if (action === "disconnect") {
			io.sockets.emit("update", people[s.id].name + " server'dan ayrıldı.");
			delete people[s.id];
			sizePeople = _.size(people);
			io.sockets.emit("update-people", { people: people, count: sizePeople });
			var o = _.findWhere(sockets, { 'id': s.id });
			sockets = _.without(sockets, o);
		}
	}
}
io.sockets.on("connection", function (socket) { //BAĞLANDIĞINDA BURASI ÇALIŞIR

	socket.on("joinserver", function (name) {
		var exists = false;
		var ownerRoomID = inRoomID = null;

		mongo.connect('mongodb://127.0.0.1/SohbetUygulamasi', function (err, db) {
			if (err) {
				throw err;
			}
			var collection = db.collection('Mesajlar');

			collection.find().toArray(function (err,res) {
				
				for (var x = 0; x < res.length; x += 1) {
                //console.log(res[x].name);

				if(res[x].alan==people[socket.id].name && res[x].cevrimdisi)
				{
					
					var whisperStr = res[x].mesaj.split(":");
						var output = {
						gonderen: res[x].gonderen,
						alan: res[x].alan,
						mesaj:  whisperStr[2],
						zaman: res[x].zaman,
						grup: "genel",
						cevrimdisi:res[x].cevrimdisi
					};
					
					io.sockets.to(socket.id).emit("whisper", output.zaman, output.mesaj,output.gonderen,output.alan, output.grup);
				}
                



            }

			});
		});
		people[socket.id] = { "name": name, "inroom": inRoomID };
		socket.emit("update", "Server'a bağlandın");
		io.sockets.emit("update", people[socket.id].name + " online.")
		sizePeople = _.size(people);
		sizeRooms = _.size(rooms);
		io.sockets.emit("update-people", { people: people, count: sizePeople });
		socket.emit("roomList", { rooms: rooms, count: sizeRooms });
		socket.emit("joined"); //extra emit for GeoLocation
		sockets.push(socket);
		//}
	});


	socket.on("getOnlinePeople", function (fn) {
		fn({ people: people });
	});

	// socket.on("countryUpdate", function (data) { //we know which country the user is from
	// 	country = data.country.toLowerCase();
	// 	people[socket.id].country = country;
	// 	io.sockets.emit("update-people", { people: people, count: sizePeople });
	// });

	socket.on("typing", function (data) {
		if (typeof people[socket.id] !== "undefined")
			io.sockets.emit("isTyping", { isTyping: data, person: people[socket.id].name });
	});

	socket.on("send", function (msTime, msg, name) {

		var re = /^[w]:.*:/;
		WhisperChek = re.test(msg);
		var whisperStr = msg.split(":");
		var found = false;
		var cevrimdisi=false;
		if (WhisperChek) {
			var whisperTo = whisperStr[1];
			var keys = Object.keys(people);
			if (keys.length != 0) {
				for (var i = 0; i < keys.length; i++) {
					if (people[keys[i]].name === whisperTo) {
						var whisperId = keys[i];
						found = true;
						if (socket.id === whisperId) { //can't whisper to ourselves
							socket.emit("update", "You can't whisper to yourself.");
						}
						break;
					}
				}
			}
		}
		if (name!="genel") {
			if (found && socket.id !== whisperId) {
				var whisperTo = whisperStr[1];
				var whisperMsg = whisperStr[2];
				socket.emit("whisper", msTime, whisperMsg, people[socket.id], whisperTo, name);
				io.sockets.to(whisperId).emit("whisper", msTime, whisperMsg, people[socket.id], whisperTo, name);
			} else {
				if(WhisperChek==true && found==false)
				{
					cevrimdisi=true;
				}
				io.sockets.in(socket.room).emit("room-chat", msTime, people[socket.id], msg, name);
				socket.emit("isTyping", true);
			}

		}
		else {
			if (found && socket.id !== whisperId) {
				var whisperTo = whisperStr[1];
				var whisperMsg = whisperStr[2];
				socket.emit("whisper", msTime, whisperMsg, people[socket.id], whisperTo, name);
				io.sockets.to(whisperId).emit("whisper", msTime, whisperMsg, people[socket.id], whisperTo, name);
			} else {
				if(WhisperChek==true && found==false)
				{
					cevrimdisi=true;
				}
				io.sockets.emit("chat", msTime, people[socket.id], msg);
			}
		}
		mongo.connect('mongodb://127.0.0.1/SohbetUygulamasi', function (err, db) {
			if (err) {
				throw err;
			}
			else {
				console.log("geldi");
			}
			var collection = db.collection('Mesajlar');

			var kayit = {
				gonderen: people[socket.id],
				alan: whisperTo,
				mesaj: msg,
				zaman: msTime,
				grup: name,
				cevrimdisi:cevrimdisi
			}
			collection.insert(kayit, function () {
				console.log(kayit.gonderen.name + ' inserted a message into db');
			});
		});

	});

	socket.on("disconnect", function () {
		if (typeof people[socket.id] !== "undefined") { //this handles the refresh of the name screen
			purge(socket, "disconnect");
		}
	});



	socket.on("check", function (name, fn) {
		var match = false;
		_.find(rooms, function (key, value) {
			if (key.name === name)
				return match = true;
		});
		fn({ result: match });
	});

	
	socket.on("joinRoom", function (id) {
		if (typeof people[socket.id] !== "undefined") {
			var room = rooms[id];
			if (_.contains((room.people), socket.id)) {
				socket.emit("update", "Sen zaten bu odaya bağlandın");
			} else {
				room.addPerson(socket.id);
				people[socket.id].inroom = id;
				socket.room = room.name;
				socket.join(socket.room);
				user = people[socket.id];
				io.sockets.in(socket.room).emit("update-room", user.name + " " + room.name + " odasına bağlandı", room.name);
				socket.emit("update-room", room.name + " odasına hoşgeldin", room.name);
				socket.emit("sendRoomID", { id: id });
				var keys = _.keys(chatHistory);
				if (_.contains(keys, socket.room)) {
					socket.emit("history", chatHistory[socket.room]);
				}
			}

		} else {
			socket.emit("update", "Lütfen uygun bir kullanıcı adı giriniz");
		}
	});

	socket.on("leaveRoom", function (id) {
		var room = rooms[id];
		if (room)
			purge(socket, "leaveRoom");
	});
});


http.listen(3000, function () {
	console.log('listening on *:3000');
});