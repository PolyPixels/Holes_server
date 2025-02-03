const { getGlobals } = require("../../globals");
const dotenv = require("dotenv");
dotenv.config();

const globals = getGlobals();
let { players } = globals;

// Define the server logo URL
const ServerLogo = process.env.SERVER_LOGO || "https://publicholesinfo.s3.us-east-1.amazonaws.com/smudge_laughing_yawn.jpg";

exports.getStatus = (req, res) => {
    console.log("Status requested");

    res.json({
        status: "Online",
        playerCount: players ? Object.keys(players).length : 0,
        image: ServerLogo
    });
};
