const express = require('express');
const socket = require("socket.io");
const cors = require("cors");
const { validColors } = require('./utils/color');
const { Map, Chunk, Placeable, TILESIZE, CHUNKSIZE } = require('./utils/map');

const port = 3000;
const app = express();

// Use CORS middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    credentials: true
}));

// Serve static files
app.use(express.static('../Holes_client'));

const server = app.listen(port, () => {
    console.log("Server is running on port: " + port);
});

// Configure Socket.io with CORS
const io = socket(server, {
    cors: {
        origin: 'http://127.0.0.1:5500',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.sockets.on('connection', newConnection);

const players = {}; // All players
const traps = []
const serverMap = new Map();

function newConnection(socket) {
    try {
        //all caps means it came from the server
        //all lower means it came from the client

        console.log('New connection: ' + socket.id);
        io.to(socket.id).emit("OLD_DATA", {players:players,traps:traps });
        let newColor = validColors.pop();
        io.to(socket.id).emit("YOUR_ID", {id:socket.id, color:newColor});

        socket.on('new_player', new_player);

        function new_player(data) {
            players[data.id] = data;
            socket.broadcast.emit('NEW_PLAYER', data);
            socket.broadcast.emit("UPDATE_POS", players);
        }

        socket.on("update_pos", update_pos);

        function update_pos(data) {
        if (!players[data.id]) {
            console.error(`Player with id ${data.id} not found.`);
            return;
        }
      
        // Only update mutable properties (dynamic data like position, health, etc.)
        players[data.id].pos = data.pos;
        players[data.id].hp = data.hp;
        players[data.id].holding = data.holding;
    
        // Broadcast the updated position to other clients
        socket.broadcast.emit("UPDATE_POS", {
            id: data.id,
            pos: data.pos,
            hp: data.hp,
            holding: data.holding
        });
      }
      
        socket.on("update_node", update_map);

        function update_map(data) {
            serverMap.chunks[data.chunkPos].data[data.index] = data.val;
            socket.broadcast.emit("UPDATE_NODE", data);
        }

        socket.on("disconnect", disconnect);

        function disconnect(data){
            console.log(socket.id + " disconnected");
            validColors.push(data.color)
            players[socket.id] = []
            delete players[socket.id];
            socket.broadcast.emit("REMOVE_PLAYER", socket.id);
        }

        socket.on("spawn_trap", spawnTrap);

        function spawnTrap(data){
            console.log("spawn trap  ", data)
            traps.push(data)
            socket.broadcast.emit("spawn_trap", data);
        }

        socket.on("new_object", new_object);

        function new_object(data){
            let chunk = serverMap.getChunk(data.cx, data.cy);
            let temp = new Placeable(data.pos.x, data.pos.y, data.rot);
            chunk.objects.push(temp);

            socket.broadcast.emit("NEW_OBJECT", data);
        }

        socket.on("get_chunk", get_chunk);

        function get_chunk(data){
            let pos = data.split(",");
            pos[0] = parseInt(pos[0]);
            pos[1] = parseInt(pos[1]);
            let chunk = serverMap.getChunk(pos[0],pos[1]);
            let tempData = {};
            for (let x = 0; x < CHUNKSIZE; x++) {
                for (let y = 0; y < CHUNKSIZE; y++) {
                    tempData[(x + (y / CHUNKSIZE))] = chunk.data[(x + (y / CHUNKSIZE))];
                }
            }
            io.to(socket.id).emit("GIVE_CHUNK", {x: pos[0], y: pos[1], data: tempData, objects: chunk.objects});
        }
    } catch (e) {
        console.log(e);
    }
}
