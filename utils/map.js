const { createNoise2D } = require('simplex-noise');
const noise2D = createNoise2D();

const TILESIZE = 32;
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
        this.NOISE_SCALE = TILESIZE * 0.004; //changing the multiplication number changes the size of natual air pockets
        this.cx = x;
        this.cy = y;
        this.objects = [];
        this.projectiles = [];
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

        //add trees
        if(Math.random() < 0.2){
            let treeX = Math.floor(Math.random()*CHUNKSIZE);
            let treeY = Math.floor(Math.random()*CHUNKSIZE);
            if(Math.random() < 0.5){
                this.objects.push(new Placeable("AppleTree", (treeX+(this.cx*CHUNKSIZE)) * TILESIZE, (treeY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0));
            }
            else{
                let possibleites = [-3,-2,-1,1,2,3];
                let randX1 = possibleites[Math.floor(Math.random()*possibleites.length)];
                let randY1 = possibleites[Math.floor(Math.random()*possibleites.length)];
                let randX2 = possibleites[Math.floor(Math.random()*possibleites.length)];
                let randY2 = possibleites[Math.floor(Math.random()*possibleites.length)];
                this.objects.push(new Placeable("Mushroom", (treeX+(this.cx*CHUNKSIZE)) * TILESIZE, (treeY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0));
                this.objects.push(new Placeable("Mushroom", (treeX+randX1+(this.cx*CHUNKSIZE)) * TILESIZE, (treeY+randY1+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0));
                this.objects.push(new Placeable("Mushroom", (treeX+randX2+(this.cx*CHUNKSIZE)) * TILESIZE, (treeY+randY2+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0));
            }
            for(let x = treeX-5; x < treeX+5; x++){
                for(let y = treeY-5; y < treeY+5; y++){
                    if(x >= 0 && x < CHUNKSIZE && y >= 0 && y < CHUNKSIZE){
                        this.data[x + (y / CHUNKSIZE)] = 0;
                    }
                }
            }
        }
    }
}

class Placeable{
    constructor(objName,x,y,rot,w,h,z,color,ownerName,id){
        this.objName = objName;
        this.pos = {x: x, y: y};
        this.rot = rot;
        this.size = {w: w, h: h};
        this.openBool = true;
        this.deleteTag = false;
        this.z = z;
        this.color = color;
        this.ownerName = ownerName;
        this.id = id;
    }
}

module.exports = {Map, Chunk, Placeable, TILESIZE, CHUNKSIZE };