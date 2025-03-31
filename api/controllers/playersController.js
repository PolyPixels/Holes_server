const { getGlobals } = require("../../globals");
const dotenv = require("dotenv");
dotenv.config();

exports.getPlayerInfo = (req, res) => {
    const globals = getGlobals();
    const { players } = globals;

    if (!players) {
        return res.status(500).json({ error: "Player data not available." });
    }

    const playerList = Object.values(players).map(p => ({
        name: p.name || "Unknown",
        kills: p.kills || 0,
        ping: p.ping || 0
    }));

    res.json(playerList);
};
