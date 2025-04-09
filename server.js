const express = require('express');
const socket = require("socket.io");
const cors = require("cors");
const { validColors } = require('./utils/color');
const { Map, Chunk, Placeable, TILESIZE, CHUNKSIZE } = require('./utils/map');
const { getGlobals } = require("./globals"); // Ensure correct import
const { exec } = require('child_process');
const globals = getGlobals(); // Now it correctly retrieves global variables
let { players, traps,serverMap,chatMessages} = globals;

let countdown = 15 * 60; // 15 minutes in seconds

const allRoutes = require('./api/routes/Routes');
const port = 3000;
const app = express();

app.use(cors({
    origin: true,  // This automatically reflects the request's origin
    methods: ['GET', 'POST'],
    credentials: true
}));

const ServerWelcomeMessage = process.env.Welcome || "Please Welcome";
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

        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        console.log('New connection: ' + socket.id);
        io.to(socket.id).emit("OLD_DATA", {players:players,traps:traps });
        let newColor = validColors.pop();
        io.to(socket.id).emit("YOUR_ID", {id:socket.id, color:newColor});

        io.to(socket.id).emit("sync_time", {minutes, seconds})

        socket.on('new_player', new_player);
        function new_player(data) {
            const originalName = data.name;
            let name = originalName;
            let suffix = 1;
        
            // ✅ Basic bad word filter (case-insensitive)
            const badWords = ['shit', 'fuck', 'bitch', 'cunt', 'nigg', 'asshole', 'cock', 'dick','fag'];
            const badWordRegex = new RegExp(badWords.join('|'), 'i');
            
        
            // Replace bad words with asterisks or generic fallback
            if (badWordRegex.test(name)) {
                name = "Player" + Math.random()
            }
        
            // ✅ Ensure uniqueness
            const nameExists = (n) => {
                return Object.values(players).some(player => player && player.name === n);
            };
        
            while (nameExists(name)) {
                name = `${originalName}_${suffix}`;
                suffix++;
            }
        
            // ✅ Only notify if the name was changed
            if (name !== originalName) {
                io.to(socket.id).emit("change_name", name);
            }
        
            data.name = name;
            players[data.id] = data;
        
            socket.broadcast.emit('NEW_PLAYER', data);
            socket.broadcast.emit("UPDATE_POS", players);
            io.emit("NEW_CHAT_MESSAGE", {
                message: `${ServerWelcomeMessage} ${data.name}`,
                x: 0,
                y: 0,
                user: "SERVER"
            });
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

                    if(data.cost != undefined){
                        if(data.cost.length > 0){
                            let itemBag = new Placeable("ItemBag", data.pos.x, data.pos.y, 0, 12*3, 13*3, 1, 11, "", "");
                            itemBag.type = "InvObj";
                            itemBag.invBlock = {items: {}};
                            for(let i = 0; i < data.cost.length; i++){
                                if(data.cost[i][0] == "dirt"){
                
                                }
                                else{
                                    itemBag.invBlock.items[data.cost[i][0]] = {};
                                    itemBag.invBlock.items[data.cost[i][0]].amount = Math.round(data.cost[i][1]*((Math.random()*0.4) + 0.5));
                                }
                            }
                            chunk.objects.push(itemBag);
                            io.emit("NEW_OBJECT", {
                                cx: chunk.cx, 
                                cy: chunk.cy, 
                                obj: itemBag
                            });
                        }
                    }
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

        //death sockets Player_Dies
        socket.on("player_dies", (data) => {
            console.log(data);
            const { x, y, id, attacker, name } = data;
            console.log("die mentions",x,y,id,attacker,name);
            // Mark the player as dead in the server-side state (optional, depends on your logic)
            if (players[id]) {
                players[id].isDead = true; // or players[id].status = "dead", etc.
            }
        
            // Notify all players within range of the death
            for (let pid in players) {
                if (players.hasOwnProperty(pid)) {
                    let player = players[pid];
                    if(player.name == attacker){
                        player.kills +=1;
                    }
                    if (player && player.pos && typeof player.statBlock.stats.hearing === 'number') {
                        let dx = player.pos.x - x;
                        let dy = player.pos.y - y;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        console.log(distance)
                        if (distance <= 1115000 + (player.statBlock.stats.hearing * 20)) {
                            console.log(name + " Has been killed by " + attacker , x,y )
                            io.emit("NEW_CHAT_MESSAGE", {message: name + " Has been killed by " + attacker , x,y , user:"SERVER"});
                        }else{
                            console.log("s2")
                        }
                    }
                }else{
                    console.log("????")
                }
            }
        

            // Instruct all clients to update the player’s render status
            io.emit("PLAYER_MARKED_DEAD", { id });
        });
        
        
   
    } catch (e) {
        console.log(e);
    }
}

let resetCalled = false
setInterval(() => {

    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;

    // Broadcast every minute
    if (seconds === 0 || countdown <= 15) {
        console.log("TIME change", minutes, seconds)
        io.emit("sync_time", {
            minutes,
            seconds
        });
    }
    // At 1 minute left
    if (countdown === 60) {
        io.emit("NEW_CHAT_MESSAGE", {
            message: "⚠️ One minute left!",
            x: 0,
            y: 0,
            user: "TIMER"
        });
    }

    // When timer hits 0, reset
    if (countdown <= 0) {

        if(!resetCalled){

        io.emit("server_ended")
        resetCalled = true
        
        countdown = 15*60;
        serverMap = new Map(Math.random());

        exec('pm2 restart holes-server', (err, stdout, stderr) => {
            if (err) {
                console.error(`Restart error: ${err.message}`);
                return;
            }
            console.log(`Server restart stdout: ${stdout}`);
            console.error(`Server restart stderr: ${stderr}`);
        });
        }

        //restart the server 
    
        
        
    }else {

    countdown--;
    }
}, 1000); // Runs every second

