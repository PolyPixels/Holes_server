/**
 * Optimized multiplayer game server.
 * - Removes unnecessary .broadcast.emit loops
 * - Fixes incorrect io.emit usage in per-player logic
 * - Cleans up minor inefficiencies
 */

const express = require('express');
const socket = require("socket.io");
const cors = require("cors");
const path = require('path');
const { validColors } = require('./utils/color');
const { Map, Chunk, Placeable, TILESIZE, CHUNKSIZE } = require('./utils/map');
const { getGlobals } = require("./globals");
const allRoutes = require('./api/routes/Routes');

const globals = getGlobals();
let { players, traps, serverMap, chatMessages } = globals;

const app = express();
const port = 3000;
const ServerWelcomeMessage = process.env.Welcome || "Please Welcome";

app.use(cors({ origin: true, methods: ['GET', 'POST'], credentials: true }));
app.use(express.static(path.join(__dirname, '../Holes_Client')));

const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

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
        console.log('New connection: ' + socket.id);

        io.to(socket.id).emit("OLD_DATA", { players, traps });
        let newColor = validColors.pop();
        io.to(socket.id).emit("YOUR_ID", { id: socket.id, color: newColor });

        socket.on('new_player', (data) => {
            players[data.id] = data;
            socket.broadcast.emit('NEW_PLAYER', data);
            socket.broadcast.emit("UPDATE_POS", players);
            io.emit("NEW_CHAT_MESSAGE", {
                message: ServerWelcomeMessage + " " + data.name,
                x: 0,
                y: 0,
                user: "SERVER"
            });
        });

        socket.on("update_pos", (data) => {
            if (!players[data.id]) return;
            players[data.id].pos = data.pos;
            players[data.id].statBlock.stats.hp = data.statBlock.stats.hp;
            players[data.id].holding = data.holding;
            players[data.id].animationType = data.animationType;
            players[data.id].animationFrame = data.animationFrame;
            socket.broadcast.emit("UPDATE_POS", {
                id: data.id,
                pos: data.pos,
                hp: data.statBlock.stats.hp,
                holding: data.holding,
                animationType: data.animationType,
                animationFrame: data.animationFrame
            });
        });

        socket.on("update_node", (data) => {
            const [x, y] = data.chunkPos.split(',').map(Number);
            let chunk = serverMap.getChunk(x, y);
            chunk.data[data.index] = data.val;
            socket.broadcast.emit("UPDATE_NODE", data);
        });

        socket.on("disconnect", (data) => {
            console.log(`${socket.id} disconnected`);
            validColors.push(data.color);
            delete players[socket.id];
            socket.broadcast.emit("REMOVE_PLAYER", socket.id);
        });

        socket.on("new_object", (data) => {
            let chunk = serverMap.getChunk(data.cx, data.cy);
            chunk.objects.push(data.obj);
            socket.broadcast.emit("NEW_OBJECT", data);
        });

        socket.on("delete_obj", (data) => {
            let chunk = serverMap.getChunk(data.cx, data.cy);
            for (let i = chunk.objects.length - 1; i >= 0; i--) {
                let obj = chunk.objects[i];
                if (data.pos.x === obj.pos.x && data.pos.y === obj.pos.y && data.z === obj.z && data.objName === obj.objName) {
                    socket.broadcast.emit("DELETE_OBJ", data);
                    chunk.objects.splice(i, 1);

                    if (data.cost?.length > 0) {
                        let itemBag = new Placeable("ItemBag", data.pos.x, data.pos.y, 0, 36, 39, 1, 11, "", "");
                        itemBag.type = "InvObj";
                        itemBag.invBlock = { items: {} };
                        for (let item of data.cost) {
                            const [name, amount] = item;
                            if (name !== "dirt") {
                                itemBag.invBlock.items[name] = {
                                    amount: Math.round(amount * ((Math.random() * 0.4) + 0.5))
                                };
                            }
                        }
                        chunk.objects.push(itemBag);
                        io.emit("NEW_OBJECT", { cx: chunk.cx, cy: chunk.cy, obj: itemBag });
                    }
                    break;
                }
            }
        });

        socket.on("update_obj", (data) => {
            let chunk = serverMap.getChunk(data.cx, data.cy);
            for (let obj of chunk.objects) {
                if (data.pos.x === obj.pos.x && data.pos.y === obj.pos.y && data.z === obj.z && data.objName === obj.objName) {
                    obj[data.update_name] = data.update_value;
                    socket.broadcast.emit("UPDATE_OBJ", data);
                    break;
                }
            }
        });

        socket.on("new_proj", (data) => {
            let chunk = serverMap.getChunk(data.cPos.x, data.cPos.y);
            chunk.projectiles.push(data);
            socket.broadcast.emit("NEW_PROJECTILE", data);
        });

        socket.on("delete_proj", (data) => {
            let chunk = serverMap.getChunk(data.cPos.x, data.cPos.y);
            for (let i = chunk.projectiles.length - 1; i >= 0; i--) {
                let proj = chunk.projectiles[i];
                if (data.id === proj.id && data.lifeSpan === proj.lifeSpan && data.name === proj.name && data.ownerName === proj.ownerName) {
                    socket.broadcast.emit("DELETE_PROJ", data);
                    chunk.projectiles.splice(i, 1);
                    break;
                }
            }
        });

        socket.on("get_chunk", (data) => {
            let [x, y] = data.split(",").map(Number);
            let chunk = serverMap.getChunk(x, y);
            let tempData = {};
            for (let i = 0; i < CHUNKSIZE; i++) {
                for (let j = 0; j < CHUNKSIZE; j++) {
                    tempData[i + (j / CHUNKSIZE)] = chunk.data[i + (j / CHUNKSIZE)];
                }
            }
            io.to(socket.id).emit("GIVE_CHUNK", {
                x, y,
                data: tempData,
                objects: chunk.objects,
                projectiles: chunk.projectiles
            });
        });

        socket.on("send_message", (data) => {
            let parts = data.split(",");
            let x = parseFloat(parts[0]);
            let y = parseFloat(parts[1]);
            let message = parts.slice(2).join(",");
            let user = players[socket.id]?.name || socket.id;
            let chatMsg = { message, x, y, user };

            for (let id in players) {
                let player = players[id];
                if (player?.pos && typeof player.statBlock.stats.hearing === 'number') {
                    let dx = player.pos.x - x;
                    let dy = player.pos.y - y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= 5000 + (player.statBlock.stats.hearing * 20 * players[socket.id].statBlock.stats.speakingRange)) {
                        io.to(id).emit("NEW_CHAT_MESSAGE", chatMsg);
                    }
                }
            }
        });

        socket.on("player_dies", (data) => {
            const { x, y, id, attacker, name } = data;
            if (players[id]) players[id].isDead = true;

            for (let pid in players) {
                let player = players[pid];
                if (player?.pos && typeof player.statBlock.stats.hearing === 'number') {
                    let dx = player.pos.x - x;
                    let dy = player.pos.y - y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= 1115000 + (player.statBlock.stats.hearing * 20)) {
                        io.to(pid).emit("NEW_CHAT_MESSAGE", {
                            message: `${name} Has been killed by ${attacker}`,
                            x, y,
                            user: "SERVER"
                        });
                    }
                }
            }

            io.emit("PLAYER_MARKED_DEAD", { id });
        });

    } catch (e) {
        console.error("Connection error:", e);
    }
}
