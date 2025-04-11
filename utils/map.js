const { createNoise2D } = require('simplex-noise');
const alea = require('alea');
var noise2D = createNoise2D(alea());


const TILESIZE = 32;
const CHUNKSIZE = 50;

class Map{
    constructor(seed){
        noise2D = createNoise2D(alea(seed));
        this.seed = seed;
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

        let rand = Math.random();
        if(rand < 0.2){ //add mushrooms
            let sructX = Math.floor(Math.random()*CHUNKSIZE);
            let structY = Math.floor(Math.random()*CHUNKSIZE);
            let possibleites = [-3,-2,-1,1,2,3];
            let randX1 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randY1 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randX2 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randY2 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let m1 = new Placeable("Mushroom", (sructX+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 11, "", "", 100);
            let m2 = new Placeable("Mushroom", (sructX+randX1+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+randY1+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 11, "", "", 100);
            let m3 = new Placeable("Mushroom", (sructX+randX2+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+randY2+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 11, "", "", 100);
            m1.stage = 2;
            m2.stage = 2;
            m3.stage = 2;
            this.objects.push(m1);
            this.objects.push(m2);
            this.objects.push(m3);
            for(let x = sructX-5; x < sructX+5; x++){
                for(let y = structY-5; y < structY+5; y++){
                    if(x >= 0 && x < CHUNKSIZE && y >= 0 && y < CHUNKSIZE){
                        this.data[x + (y / CHUNKSIZE)] = 0;
                    }
                }
            }
        }
        else if(rand < 0.4){ //forest chunk
            for(let x = 3; x < CHUNKSIZE-3; x++){
                for(let y = 3; y < CHUNKSIZE-3; y++){
                    this.data[x + (y / CHUNKSIZE)] = 0;

                    if(x > 4 && x < CHUNKSIZE-4 && y > 4 && y < CHUNKSIZE-4){
                        if(Math.random() < 0.05){
                            let temp;
                            if(Math.random() < 0.3){
                                temp = new Placeable("AppleTree", (x+(this.cx*CHUNKSIZE)) * TILESIZE, (y+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 11, "", "", 100);
                            }
                            else{
                                temp = new Placeable("Tree", (x+(this.cx*CHUNKSIZE)) * TILESIZE, (y+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 11, "", "", 100);
                            }
                            temp.stage = 0;
                            this.objects.push(temp);
                        }
                    }
                }
            }
        }
        else if(rand < 0.5){ //chest structure
            let sructX = Math.floor(Math.random()*CHUNKSIZE);
            let structY = Math.floor(Math.random()*CHUNKSIZE);
            let temp = new Placeable("Chest", (sructX+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 11, "", "", 100);
            //add items to the chest
            temp.invBlock = {items: {}};
            temp.invBlock.items["Gem"] = {amount: Math.floor(Math.random()*10)+1};
            this.objects.push(temp);
            for(let x = sructX-5; x < sructX+5; x++){
                for(let y = structY-5; y < structY+5; y++){
                    if(x >= 0 && x < CHUNKSIZE && y >= 0 && y < CHUNKSIZE){
                        this.data[x + (y / CHUNKSIZE)] = 0;
                    }
                }
            }
        }
    }
}

class Placeable{
    constructor(objName,x,y,rot,w,h,z,color,ownerName,id,hp){
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
        this.hp = hp;
    }
}

module.exports = {Map, Chunk, Placeable, TILESIZE, CHUNKSIZE};