const express = require('express');
const socket = require("socket.io");
const cors = require("cors");
const { validColors } = require('./utils/color');
const { Map, Chunk, Placeable, Trap, Wall, Door, Cup, Rug, Floor, Turret, Bomb, TILESIZE, CHUNKSIZE } = require('./utils/map');
const { getGlobals } = require("./globals"); // Ensure correct import

const globals = getGlobals(); // Now it correctly retrieves global variables
let { players, traps,serverMap} = globals;

const allRoutes = require('./api/routes/Routes');
const port = 3000;
const app = express();

app.use(cors({
    origin: true,  // This automatically reflects the request's origin
    methods: ['GET', 'POST'],
    credentials: true
}));



const path = require('path');

// Serve static files using an absolute path
app.use(express.static(path.join(__dirname, '../Holes_Client')));
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Configure Socket.io with CORS
const io = socket(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.sockets.on('connection', newConnection);


app.use(allRoutes);


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
        players[data.id].animationType = data.animationType;
        players[data.id].animationFrame = data.animationFrame;
    
        // Broadcast the updated position to other clients
        socket.broadcast.emit("UPDATE_POS", {
            id: data.id,
            pos: data.pos,
            hp: data.hp,
            holding: data.holding,
            animationType: data.animationType,
            animationFrame: data.animationFrame
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

        socket.on("new_object", new_object);

        function new_object(data){
            let chunk = serverMap.getChunk(data.cx, data.cy);
            let temp;
            if(data.type == "trap"){
                temp = new Trap(data.pos.x, data.pos.y, data.rot, data.hp, data.ownerId, data.color, data.ownerName);
            }
            else if(data.type == "wall"){
                temp = new Wall(data.pos.x, data.pos.y, data.rot, data.color);
            }
            else if(data.type == "door"){
                temp = new Door(data.pos.x, data.pos.y, data.rot, data.color);
            }
            else if(data.type == "floor"){
                temp = new Floor(data.pos.x, data.pos.y, data.rot, data.color);
            }
            else if(data.type == "rug"){
                temp = new Rug(data.pos.x, data.pos.y, data.rot, data.color);
            }
            else if(data.type == "cup"){
                temp = new Cup(data.pos.x, data.pos.y, data.rot, data.color);
            }
            else if(data.type == "turret"){
                temp = new Turret(data.pos.x, data.pos.y, data.rot, data.hp, data.ownerId, data.color, data.ownerName);
            }
            else if(data.type == "bomb"){
                temp = new Bomb(data.pos.x, data.pos.y, data.rot, data.hp, data.ownerId, data.color, data.ownerName);
            }
            else{
                temp = new Placeable(data.pos.x, data.pos.y, data.rot);
            }
            chunk.objects.push(temp);

            socket.broadcast.emit("NEW_OBJECT", data);
        }

        socket.on("delete_obj", delete_obj);

        function delete_obj(data){
            let chunk = serverMap.getChunk(data.cx, data.cy);
            for(let i = chunk.objects.length-1; i >= 0; i--){
                if(data.pos.x == chunk.objects[i].pos.x && data.pos.y == chunk.objects[i].pos.y && data.z == chunk.objects[i].z && data.type == chunk.objects[i].type){
                    socket.broadcast.emit("DELETE_OBJ", data);
                    chunk.objects.splice(i, 1);
                }
            }
        }

        socket.on("update_obj", update_obj);

        function update_obj(data){
            let chunk = serverMap.getChunk(data.cx, data.cy);
            for(let i = chunk.objects.length-1; i >= 0; i--){
                if(data.pos.x == chunk.objects[i].pos.x && data.pos.y == chunk.objects[i].pos.y && data.z == chunk.objects[i].z && data.type == chunk.objects[i].type){
                    chunk.objects[i][data.update_name] = data.update_value;
                    socket.broadcast.emit("UPDATE_OBJ", data);
                }
            }
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
