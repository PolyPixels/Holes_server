const {Map} = require("./utils/map")

let players = {};
let traps = {};
let serverMap = new Map()
let chatMessages = [
    {
      message: "Hello, welcome to the chat!",
      x: 0,
      y: 0,
      user: "Server"
    }
  ];
  

function getGlobals() {
    return { players, traps, serverMap,chatMessages };
}

// Ensure correct export
module.exports = { getGlobals };
