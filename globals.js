const {Map} = require("./utils/map")

let players = {};
let traps = {};
let serverMap = new Map()
function getGlobals() {
    return { players, traps, serverMap };
}

// Ensure correct export
module.exports = { getGlobals };
