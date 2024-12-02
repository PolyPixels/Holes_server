const { createNoise2D } = require('simplex-noise');
const noise2D = createNoise2D();

const TILESIZE = 16;

class Map{
    constructor(){
        this.chunks = {}; //referance with a string "x,y"     {ex. chunks["0,0"]}
        this.getChunk(0,0);
    }

    getChunk(x,y){
        if(this.chunks[x+","+y] == undefined){
            //generate that chunk
            this.chunks[x+","+y] = new Chunk(x,y);
            this.chunks[x+","+y].generate();
        }
        return this.chunks[x+","+y];
    }
}

class Chunk{
    constructor(x,y){
        this.data = []; // Data is very obvious, -1 is unbreakable, 0 is nothing, >0 is block
        this.size = {};
        this.size.x = 800 / TILESIZE;
        this.size.y = 800 / TILESIZE;
        this.NOISE_SCALE = TILESIZE * 0.013; //changing the multiplication number changes the size of natual air pockets
        this.cx = x;
        this.cy = y;
    }

    generate(){
        for (let x = 0; x < this.size.x; x++) {
            for (let y = 0; y < this.size.y; y++) {
                // if (x === 0 || y === 0 || x === this.size.x - 1 || y === this.size.y - 1) {
                //     this.data[index] = -1.0; //outer walls
                //     continue;
                // }
                const OFF = TILESIZE * TILESIZE;
                const index = x + (y / this.size.x);
                const nx = this.NOISE_SCALE * (x + OFF + (this.cx * TILESIZE * this.size.x));
                const ny = this.NOISE_SCALE * (y + OFF + (this.cy * TILESIZE * this.size.y));
                this.data[x + (y / this.size.x)] = (noise2D(this.NOISE_SCALE * (x + 1), this.NOISE_SCALE * (y + 1)) / 2) + 0.5; //! why doing this 2 times?
                this.data[index] -= ((noise2D(nx, ny) / 2) + 0.5) * 0.25; //! why doing this 2 times?
                this.data[index] *= 1.5;

                //this.data[index] = 1;
                const CUT_OFF = 0.3;
                if (this.data[index] < CUT_OFF) this.data[index] = 0; //air pockets
            }
        }
    }
}

module.exports = {Map, Chunk, TILESIZE };