const {Map} = require("./utils/map")

let players = {};
let traps = {};
let serverMap = new Map()
let chatMessages = [];

function getGlobals() {
    return { players, traps, serverMap,chatMessages };
}

// Ensure correct export
module.exports = { getGlobals };
