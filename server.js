var express = require('express');
var socket = require("socket.io");
const { createNoise2D } = require('simplex-noise');

var port = 3000;
var app = express();
var server = app.listen(port);
app.use(express.static('../Holes_client'));
console.log("Server is running on port: " + port);

var io = socket(server);
io.sockets.on('connection', newConnection);

const noise2D = createNoise2D();

var players = {}; //All players
var serverMap = new Map(800/16, 800/16, 16);
serverMap.generate();
serverMap.createRooms();

function newConnection(socket){
    console.log('New connection: ' + socket.id);
    io.to(socket.id).emit("OLD_PLAYERS", players);
    io.to(socket.id).emit("YOUR_ID", socket.id);
    let tempData = {};
    for(let x=0; x<serverMap.WIDTH; x++){
        for(let y=0; y<serverMap.HEIGHT; y++){
            tempData[(x+(y/serverMap.HEIGHT))] = serverMap.data[(x+(y/serverMap.HEIGHT))];
        }
    }
    io.to(socket.id).emit("GIVE_MAP", tempData);
    
    socket.on('new_player', new_player);
    function new_player(data){
        //console.log(data);
        players[data.id] = data;
        socket.broadcast.emit('NEW_PLAYER', data);
        socket.broadcast.emit("UPDATE_POS", players);
    }

    socket.on("update_pos", update_pos);
    function update_pos(data){
        //console.log("updating " + data.id);
        players[data.id] = data;
        socket.broadcast.emit("UPDATE_POS", data);
    }

    socket.on("update_node", update_map);
    function update_map(data){
        serverMap.data[data.index] = data.val;
        socket.broadcast.emit("UPDATE_NODE", data);
    }
}

function Map(w, h, ts) // FIXME: This whole thing could be way more performant
{
  this.data = [];
  this.WIDTH = w
  this.HEIGHT = h;
  this.tileSize = ts;
  const NOISE_SCALE = this.tileSize * 0.013;
  
  this.generate = function()
  {
    for (let x = 0; x < this.WIDTH; x++)
      for (let y = 0; y < this.HEIGHT; y++) // I'm avoiding x=0 and y=0 by adding 1, heckling ensues
        this.data[x + (y / this.WIDTH)] = (noise2D(NOISE_SCALE * (x + 1), NOISE_SCALE * (y + 1))/2) + 0.5;
  }
  
  this.createRooms = function()
  {
    for (let x = 0; x < this.WIDTH; x++)
    {
      for (let y = 0; y < this.HEIGHT; y++)
      {
        const OFF = this.tileSize * this.tileSize;
        const index = x + (y / this.WIDTH);
        if (x == 0 || y == 0 || x == this.WIDTH -1 || y == this.HEIGHT - 1)
        {
          this.data [index] = -1.0;
          continue;
        }
        
        // FIXME: Don't use so many hard coded values
        const nx = NOISE_SCALE * (x + OFF);
        const ny = NOISE_SCALE * (y + OFF);
        this.data[index] -= ((noise2D(nx, ny)/2)+0.5) * 0.25;
        this.data[index] *= 1.5
        
        const CUT_OFF = 0.2; // Ew, you're gross, use map
        if (this.data[index] < CUT_OFF) this.data[index] = 0; // No
      }
    }
  }
}