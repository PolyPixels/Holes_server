let players = {};
let traps = {};
let serverMap = {};

function getGlobals() {
    return { players, traps, serverMap };
}

// Ensure correct export
module.exports = { getGlobals };
