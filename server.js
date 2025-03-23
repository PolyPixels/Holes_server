const express = require('express');
const socket = require("socket.io");
const cors = require("cors");
const { validColors } = require('./utils/color');
const { Map, Chunk, Placeable, TILESIZE, CHUNKSIZE } = require('./utils/map');
const { getGlobals } = require("./globals"); // Ensure correct import

const globals = getGlobals(); // Now it correctly retrieves global variables
let { players, traps,serverMap,chatMessages} = globals;

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
        players[data.id].statBlock.stats.hp = data.statBlock.stats.hp;
        players[data.id].holding = data.holding;
        players[data.id].animationType = data.animationType;
        players[data.id].animationFrame = data.animationFrame;
    
        // Broadcast the updated position to other clients
        socket.broadcast.emit("UPDATE_POS", {
            id: data.id,
            pos: data.pos,
            hp: data.statBlock.stats.hp,
            holding: data.holding,
            animationType: data.animationType,
            animationFrame: data.animationFrame
        });
      }
      
        socket.on("update_node", update_map);

        function update_map(data) {
            let chunkPos = data.chunkPos.split(",");
            chunkPos[0] = parseInt(chunkPos[0]);
            chunkPos[1] = parseInt(chunkPos[1]);
            let chunk = serverMap.getChunk(chunkPos[0], chunkPos[1]);
            chunk.data[data.index] = data.val;
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
            chunk.objects.push(data.obj);

            socket.broadcast.emit("NEW_OBJECT", data);
        }

        socket.on("delete_obj", delete_obj);

        function delete_obj(data){
            let chunk = serverMap.getChunk(data.cx, data.cy);
            for(let i = chunk.objects.length-1; i >= 0; i--){
                if(data.pos.x == chunk.objects[i].pos.x && data.pos.y == chunk.objects[i].pos.y && data.z == chunk.objects[i].z && data.objName == chunk.objects[i].objName){
                    socket.broadcast.emit("DELETE_OBJ", data);
                    chunk.objects.splice(i, 1);
                }
            }
        }

        socket.on("update_obj", update_obj);

        function update_obj(data){
            let chunk = serverMap.getChunk(data.cx, data.cy);
            for(let i = chunk.objects.length-1; i >= 0; i--){
                if(data.pos.x == chunk.objects[i].pos.x && data.pos.y == chunk.objects[i].pos.y && data.z == chunk.objects[i].z && data.objName == chunk.objects[i].objName){
                    chunk.objects[i][data.update_name] = data.update_value;
                    socket.broadcast.emit("UPDATE_OBJ", data);
                }
            }
        }

        socket.on("new_proj", new_projectile);

        function new_projectile(data){
            //add projectiles to server map
            let chunk = serverMap.getChunk(data.cPos.x, data.cPos.y);
            chunk.projectiles.push(data);
            socket.broadcast.emit("NEW_PROJECTILE", data);
        }

        socket.on("delete_proj", delete_projectile);

        function delete_projectile(data){
            let chunk = serverMap.getChunk(data.cPos.x, data.cPos.y);
            for(let i = chunk.projectiles.length-1; i >= 0; i--){
                if(
                    data.id == chunk.projectiles[i].id &&
                    data.lifeSpan == chunk.projectiles[i].lifeSpan &&
                    data.name == chunk.projectiles[i].name &&
                    data.ownerName == chunk.projectiles[i].ownerName
                ){
                    socket.broadcast.emit("DELETE_PROJ", data);
                    chunk.projectiles.splice(i, 1);
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
            io.to(socket.id).emit("GIVE_CHUNK", {x: pos[0], y: pos[1], data: tempData, objects: chunk.objects, projectiles: chunk.projectiles});
        }


        socket.on("send_message", send_message);

        function send_message(data) {
            //console.log("send", data);
            // Expecting data in the format "x,y,message"
            let parts = data.split(",");
            let x = parseFloat(parts[0]);
            let y = parseFloat(parts[1]);
            let message = parts.slice(2).join(","); // Handles commas in the message
            
            // Retrieve the sender's name if available; otherwise, fallback to socket.id.
            let user = players[socket.id] && players[socket.id].name ? players[socket.id].name : socket.id;
            
            // Create the chat message object.
            let chatMsg = { message, x, y, user };
            

            //console.log("send", chatMsg);
            
            // For each connected player, check if they are within hearing distance.
            for (let id in players) {
                //console.log(id)
                if (players.hasOwnProperty(id)) {
                    let player = players[id];
                    //console.log(id)
                    // Ensure player has a position and hearing range defined
                    if (player && player.pos && typeof player.statBlock.stats.hearing === 'number') {
                        //console.log("num")
                        let dx = player.pos.x - x;
                        let dy = player.pos.y - y;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        //console.log("NUMBERS",distance, player.statBlock.stats.hearing*20)
                        // If the player is within their hearing range, send the chat message.
                        if (distance <= 5000+(player.statBlock.stats.hearing*20 * players[socket.id].statBlock.stats.speakingRange)) {
                            //console.log("???????",chatMsg)
                            io.to(id).emit("NEW_CHAT_MESSAGE", chatMsg);
                        }
                    }
                }
            }
        }
        
   
    } catch (e) {
        console.log(e);
    }
}
