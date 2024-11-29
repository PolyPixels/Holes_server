const express = require('express');
const socket = require("socket.io");
const { createNoise2D } = require('simplex-noise');
const cors = require("cors");

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

const noise2D = createNoise2D();
const players = {}; // All players
const serverMap = new Map(800 / 16, 800 / 16, 16);
serverMap.generate();
serverMap.createRooms();

function newConnection(socket) {
    try {
        //all caps means it came from the server
        //all lower means it came from the client

        console.log('New connection: ' + socket.id);
        io.to(socket.id).emit("OLD_PLAYERS", players);
        io.to(socket.id).emit("YOUR_ID", socket.id);

        let tempData = {};
        for (let x = 0; x < serverMap.WIDTH; x++) {
            for (let y = 0; y < serverMap.HEIGHT; y++) {
                tempData[(x + (y / serverMap.HEIGHT))] = serverMap.data[(x + (y / serverMap.HEIGHT))];
            }
        }
        io.to(socket.id).emit("GIVE_MAP", tempData);

        socket.on('new_player', new_player);

        function new_player(data) {
            players[data.id] = data;
            console.log("new player Data", data)
            socket.broadcast.emit('NEW_PLAYER', data);
            socket.broadcast.emit("UPDATE_POS", players);
        }

        socket.on("update_pos", update_pos);

        function update_pos(data) {
            players[data.id] = data;
            socket.broadcast.emit("UPDATE_POS", data);
        }

        socket.on("update_node", update_map);

        function update_map(data) {
            serverMap.data[data.index] = data.val;
            socket.broadcast.emit("UPDATE_NODE", data);
        }

        socket.on("disconnect", disconnect);

        function disconnect(data){
            console.log(socket.id + " disconnected");
            delete players[socket.id];
            socket.broadcast.emit("REMOVE_PLAYER", socket.id);
        }
    } catch (e) {
        console.log(e);
    }
}

function Map(w, h, ts) {
    this.data = [];
    this.WIDTH = w;
    this.HEIGHT = h;
    this.tileSize = ts;
    const NOISE_SCALE = this.tileSize * 0.013; //changing the multiplication number changes the size of natual air pockets

    this.generate = function () {
        for (let x = 0; x < this.WIDTH; x++) {
            for (let y = 0; y < this.HEIGHT; y++) {
                this.data[x + (y / this.WIDTH)] = (noise2D(NOISE_SCALE * (x + 1), NOISE_SCALE * (y + 1)) / 2) + 0.5; //! why doing this 2 times?
            }
        }
    };

    this.createRooms = function () {
        for (let x = 0; x < this.WIDTH; x++) {
            for (let y = 0; y < this.HEIGHT; y++) {
                const OFF = this.tileSize * this.tileSize;
                const index = x + (y / this.WIDTH);
                if (x === 0 || y === 0 || x === this.WIDTH - 1 || y === this.HEIGHT - 1) {
                    this.data[index] = -1.0; //outer walls
                    continue;
                }
                const nx = NOISE_SCALE * (x + OFF);
                const ny = NOISE_SCALE * (y + OFF);
                this.data[index] -= ((noise2D(nx, ny) / 2) + 0.5) * 0.25; //! why doing this 2 times?
                this.data[index] *= 1.5;

                const CUT_OFF = 0.2;
                if (this.data[index] < CUT_OFF) this.data[index] = 0; //air pockets
            }
        }
    };
}
