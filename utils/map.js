const { createNoise2D } = require('simplex-noise');
const noise2D = createNoise2D();

const TILESIZE = 16;
const CHUNKSIZE = 50;

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
        this.NOISE_SCALE = TILESIZE * 0.009; //changing the multiplication number changes the size of natual air pockets
        this.cx = x;
        this.cy = y;
        this.objects = [];
    }

    generate(){
        for (let x = 0; x < CHUNKSIZE; x++) {
            for (let y = 0; y < CHUNKSIZE; y++) {
                // if (x === 0 || y === 0 || x === CHUNKSIZE - 1 || y === CHUNKSIZE - 1) {
                //     this.data[index] = -1.0; //outer walls
                //     continue;
                // }
                const OFF = TILESIZE * TILESIZE;
                const index = x + (y / CHUNKSIZE);
                const nx = this.NOISE_SCALE * (x + OFF + (this.cx * TILESIZE * CHUNKSIZE));
                const ny = this.NOISE_SCALE * (y + OFF + (this.cy * TILESIZE * CHUNKSIZE));
                this.data[x + (y / CHUNKSIZE)] = (noise2D(this.NOISE_SCALE * (x + 1), this.NOISE_SCALE * (y + 1)) / 2) + 0.5; //! why doing this 2 times?
                this.data[index] -= ((noise2D(nx, ny) / 2) + 0.5) * 0.25; //! why doing this 2 times?
                this.data[index] *= 1.5;

                //this.data[index] = 1;
                const CUT_OFF = 0.3;
                if (this.data[index] < CUT_OFF) this.data[index] = 0; //air pockets
            }
        }
    }
}

/*
Z heights:
    3=decorations (ex. mugs, plates, flowers, papers)
    2=walls,doors,tables,chairs,chests
    1=rugs,traps
    0=floors
*/

class Placeable{
    constructor(x,y,rot,w,h,z){
        this.pos = {x: x, y: y};
        this.rot = rot;
        this.size = {w: w, h: h};
        this.openBool = true;
        this.deleteTag = false;
        this.z = z;
    }


}

class Trap extends Placeable{
    constructor(x,y,rot, health, id, color, ownerName){
        super(x,y,rot,30,20,1);
        this.hp = health;
        this.mhp = 10;
        this.id = id;
        this.name = ownerName;
        this.color = color;
        this.type = "trap";
    }
}

class Cup extends Placeable{
    constructor(x,y,rot,color){
        super(x,y,rot, 10, 10, 3);
        this.color = color;
        this.type = "cup";
    }
}

class Wall extends Placeable{
    constructor(x,y,rot,color){
        super(x,y,rot, 60, 60, 2);
        this.color = color;
        this.type = "wall";
    }
}

class Door extends Placeable{
    constructor(x,y,rot,color){
        super(x,y,rot, 20, 60, 2);
        this.color = color;
        this.type = "door";
        this.open = false;
    }
}

class Rug extends Placeable{
    constructor(x,y,rot,color){
        super(x,y,rot, 80, 80, 1);
        this.color = color;
        this.type = "rug";
    }
}

class Floor extends Placeable{
    constructor(x,y,rot,color){
        super(x,y,rot, 60, 60, 0);
        this.color = color;
        this.type = "floor";
    }
}

module.exports = {Map, Chunk, Placeable, Trap, Wall, Door, Cup, Rug, Floor, TILESIZE, CHUNKSIZE };