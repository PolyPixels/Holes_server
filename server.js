var express = require('express');
var socket = require("socket.io");

var port = 3000;
var app = express();
var server = app.listen(port);
app.use(express.static('../Holes_client'));
console.log("Server is running on port: " + port);

var io = socket(server);
io.sockets.on('connection', newConnection);

var players = {}; //All players

function newConnection(socket){
    console.log('New connection: ' + socket.id);
    io.to(socket.id).emit("OLD_PLAYERS", players);
    io.to(socket.id).emit("YOUR_ID", socket.id);
    
    socket.on('new_player', new_player);
    function new_player(data){
        //console.log(data);
        players[data.id] = data;
        socket.broadcast.emit('NEW_PLAYER', data);
        socket.broadcast.emit("UPDATE_POS", players);
    }

    socket.on("update_pos", update_pos);
    function update_pos(data){
        console.log("updating " + data.id);
        players[data.id] = data;
        socket.broadcast.emit("UPDATE_POS", data);
    }
}