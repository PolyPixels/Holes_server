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
        this.brains = [];
        this.getChunk(0,0);
    }

    getChunk(x,y){
        if(this.chunks[x+","+y] == undefined){
            //generate that chunk
            this.chunks[x+","+y] = new Chunk(x,y);
            this.chunks[x+","+y].generate();

            if(Math.random() < 0.5){
                let ant = new Placeable("Ant", Math.floor(Math.random()*CHUNKSIZE)+(x*CHUNKSIZE) * TILESIZE, Math.floor(Math.random()*CHUNKSIZE)+(y*CHUNKSIZE) * TILESIZE, 0, 17*2, 13*2, 2, 0, "Server", "", 100);
                ant.brainID = Math.random()*10000;
                this.brains.push({id: ant.brainID, target: null});
                this.chunks[x+","+y].objects.push(ant);
            }
        }
        return this.chunks[x+","+y];
    }
}

class Chunk{
    constructor(x,y){
        this.data = []; // Data is very obvious, -1 is unbreakable, 0 is nothing, >0 is block
        this.iron_data = [];
        this.NOISE_SCALE = TILESIZE * 0.004; //changing the multiplication number changes the size of natual air pockets
        this.cx = x;
        this.cy = y;
        this.objects = [];
        this.projectiles = [];
        this.soundObjs = [];
    }

    generate(){
        if(Math.abs(this.cx) > 5 || Math.abs(this.cy) > 5){
            for (let x = 0; x < CHUNKSIZE; x++) {
                for (let y = 0; y < CHUNKSIZE; y++) {
                    const index = x + (y / CHUNKSIZE);
                    this.data[index] = 0;
                    this.iron_data[index] = 0;

                    if(x%2==0 && y%2==0){
                        let temp = new Placeable("BearTrap", (x+(this.cx*CHUNKSIZE)) * TILESIZE, (y+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 68, 48, 1, 0, "", "", 1000);
                        this.objects.push(temp);
                    }
                }
            }
            return;
        }

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
                if (this.data[index] < CUT_OFF){
                    this.data[index] = 0; //air pockets
                    this.iron_data[index] = 0; //no iron in air pockets
                }
                else{
                    const iron_scale = 0.2;
                    const nx2 = this.NOISE_SCALE * iron_scale * (x + OFF + (this.cx * TILESIZE * CHUNKSIZE));
                    const ny2 = this.NOISE_SCALE * iron_scale * (y + OFF + (this.cy * TILESIZE * CHUNKSIZE));
                    this.iron_data[x + (y / CHUNKSIZE)] = (noise2D(this.NOISE_SCALE * iron_scale * (x + 1 + 2000), this.NOISE_SCALE * iron_scale * (y + 1 - 2000)) / 2) + 0.5; //! why doing this 2 times?
                    this.iron_data[index] -= ((noise2D(nx2 + 2000, ny2 - 2000) / 2) + 0.5) * 0.25; //! why doing this 2 times?
                    this.iron_data[index] *= 1.5;
                    
                    const CUT_OFF2 = 1.0;
                    if (this.iron_data[index] < CUT_OFF2){
                        this.iron_data[index] = 0; //air pockets
                    }
                }
            }
        }

        let rand = Math.random();
        if(rand < 0.2){ //add mushrooms
            let structX = Math.floor(Math.random()*CHUNKSIZE);
            let structY = Math.floor(Math.random()*CHUNKSIZE);
            if(structX > CHUNKSIZE-4) structX = CHUNKSIZE-4;
            if(structX < 4) structX = 4;
            if(structY > CHUNKSIZE-4) structY = CHUNKSIZE-4;
            if(structY < 4) structY = 4;
            let possibleites = [-3,-2,-1,1,2,3];
            let randX1 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randY1 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randX2 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randY2 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let m1 = new Placeable("Mushroom", (structX+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "Server", "", 50);
            let m2 = new Placeable("Mushroom", (structX+randX1+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+randY1+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "Server", "", 50);
            let m3 = new Placeable("Mushroom", (structX+randX2+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+randY2+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "Server", "", 50);
            m1.stage = 2;
            m2.stage = 2;
            m3.stage = 2;
            this.objects.push(m1);
            this.objects.push(m2);
            this.objects.push(m3);
            for(let x = structX-5; x < structX+5; x++){
                for(let y = structY-5; y < structY+5; y++){
                    if(x >= 0 && x < CHUNKSIZE && y >= 0 && y < CHUNKSIZE){
                        this.data[x + (y / CHUNKSIZE)] = 0;
                        this.iron_data[x + (y / CHUNKSIZE)] = 0;
                    }
                }
            }
        }
        if(rand < 0.3){ //add turrets
            let structX = Math.floor(Math.random()*CHUNKSIZE);
            let structY = Math.floor(Math.random()*CHUNKSIZE);
            if(structX > CHUNKSIZE-6) structX = CHUNKSIZE-6;
            if(structX < 6) structX = 6;
            if(structY > CHUNKSIZE-6) structY = CHUNKSIZE-6;
            if(structY < 6) structY = 6;
            let possibleites = [-5,-3,-2,2,3,5];
            let randX1 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randY1 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randX2 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let randY2 = possibleites[Math.floor(Math.random()*possibleites.length)];
            let m1 = new Placeable("Turret", (structX+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 2, 0, "Server", "", 100);
            let m2 = new Placeable("Turret", (structX+randX1+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+randY1+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 2, 0, "Server", "", 100);
            let m3 = new Placeable("Turret", (structX+randX2+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+randY2+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 2, 0, "Server", "", 100);
            
            this.objects.push(m1);
            this.objects.push(m2);
            this.objects.push(m3);
            for(let x = structX-5; x < structX+5; x++){
                for(let y = structY-5; y < structY+5; y++){
                    if(x >= 0 && x < CHUNKSIZE && y >= 0 && y < CHUNKSIZE){
                        this.data[x + (y / CHUNKSIZE)] = 0;
                        this.iron_data[x + (y / CHUNKSIZE)] = 0;
                    }
                }
            }
        }
        else if(rand < 0.4){ //forest chunk
            for(let x = 3; x < CHUNKSIZE-3; x++){
                for(let y = 3; y < CHUNKSIZE-3; y++){
                    this.data[x + (y / CHUNKSIZE)] = 0;
                    this.iron_data[x + (y / CHUNKSIZE)] = 0;

                    if(x > 4 && x < CHUNKSIZE-4 && y > 4 && y < CHUNKSIZE-4){
                        if(Math.random() < 0.05){
                            let temp;
                            if(Math.random() < 0.3){
                                temp = new Placeable("AppleTree", (x+(this.cx*CHUNKSIZE)) * TILESIZE, (y+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "Server", "", 80);
                                temp.stage = 2;
                            }
                            else if(Math.random() < 0.4){
                                temp = new Placeable("Mushroom", (x+(this.cx*CHUNKSIZE)) * TILESIZE, (y+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "Server", "", 50);
                                temp.stage = 2;
                            }
                            else{
                                temp = new Placeable("Tree", (x+(this.cx*CHUNKSIZE)) * TILESIZE, (y+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "Server", "", 80);
                                temp.stage = 2;
                            }
                            this.objects.push(temp);
                        }
                    }
                }
            }
        }
        else if(rand < 0.6){ //chest structure
            let sructX = Math.floor(Math.random()*CHUNKSIZE);
            let structY = Math.floor(Math.random()*CHUNKSIZE);
            let temp = new Placeable("Chest", (sructX+(this.cx*CHUNKSIZE)) * TILESIZE, (structY+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 120, 120, 0, 0, "", "", 100);
            //add items to the chest
            temp.invBlock = {items: {}};
            temp.invBlock.invId = Math.random()*100000;
            temp.invBlock.items["Gem"] = {amount: Math.floor(Math.random()*10)+1};
            if(Math.random() < 0.7) temp.invBlock.items["Bomb"] = {amount: Math.floor(Math.random()*5)+1};
            if(Math.random() < 0.5) temp.invBlock.items["Tech"] = {amount: Math.floor(Math.random()*3)+1};
            if(Math.random() < 0.2) temp.invBlock.items["Fire Staff"] = {amount: 1};
            if(Math.random() < 0.2) temp.invBlock.items["Laser Gun"] = {amount: 1};
            if(Math.random() < 0.05) temp.invBlock.items["Philosopher's Stone"] = {amount: Math.floor(Math.random()*5)+1};
            if(Math.random() < 0.05) temp.invBlock.items["Black Gem"] = {amount: Math.floor(Math.random()*5)+1};
            this.objects.push(temp);
            for(let x = sructX-5; x < sructX+5; x++){
                for(let y = structY-5; y < structY+5; y++){
                    if(x >= 0 && x < CHUNKSIZE && y >= 0 && y < CHUNKSIZE){
                        this.data[x + (y / CHUNKSIZE)] = 0;
                        this.iron_data[x + (y / CHUNKSIZE)] = 0;
                    }
                }
            }
        }
        else if (rand < 0.8) {
            let old_dirt = [];
            for(let x = 7; x < CHUNKSIZE-7; x++){
                for(let y = 7; y < CHUNKSIZE-7; y++){
                    old_dirt[x + (y / CHUNKSIZE)] = this.data[x + (y / CHUNKSIZE)];
                    this.data[x + (y / CHUNKSIZE)] = 0;
                    this.iron_data[x + (y / CHUNKSIZE)] = 0;
                }
            }
            for(let x = 0; x < 9; x++){
                for(let y = 0; y < 9; y++){
                    let temp;
                    if(x == 0 || x == 8 || y == 0 || y == 8){
                        if(x == 4){
                            if(Math.random() < 0.9){
                                temp = new Placeable("Floor", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "Server", "", 100);
                                this.objects.push(temp);
                                if(Math.random() < 0.9) temp = new Placeable("Door", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 90, 128, 128, 0, 0, "Server", "", 200);
                            }
                        }
                        else if(y == 4){
                            if(Math.random() < 0.9){
                                temp = new Placeable("Floor", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "Server", "", 100);
                                this.objects.push(temp);
                                if(Math.random() < 0.9) temp = new Placeable("Door", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "Server", "", 200);
                            }
                        }
                        else{
                            if(Math.random() < 0.9) temp = new Placeable("Wall", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "Server", "", 200);
                            else{
                                for(let i = 0; i < 4; i++){
                                    for(let j = 0; j < 4; j++){
                                        this.data[(x*4)+7+i+(((y*4)+7+j) / CHUNKSIZE)] = old_dirt[(x*4)+7+i+(((y*4)+7+j) / CHUNKSIZE)];
                                    }
                                }
                            }
                        }
                    }
                    else if(x == 4 && y == 4){
                        temp = new Placeable("Floor", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "Server", "", 100);
                        this.objects.push(temp);
                        temp = new Placeable("Chest", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+1.7)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "", "", 100);
                        //add items to the chest
                        temp.invBlock = {items: {}};
                        temp.invBlock.invId = Math.random()*100000;
                        temp.invBlock.items["Gem"] = {amount: Math.floor(Math.random()*20)+1};
                        if(Math.random() < 0.7) temp.invBlock.items["Bomb"] = {amount: Math.floor(Math.random()*8)+1};
                        if(Math.random() < 0.5) temp.invBlock.items["Tech"] = {amount: Math.floor(Math.random()*6)+1};
                        if(Math.random() < 0.2) temp.invBlock.items["Fire Staff"] = {amount: 1};
                        if(Math.random() < 0.2) temp.invBlock.items["Laser Gun"] = {amount: 1};
                        if(Math.random() < 0.05) temp.invBlock.items["Philosopher's Stone"] = {amount: Math.floor(Math.random()*9)+1};
                        if(Math.random() < 0.05) temp.invBlock.items["Black Gem"] = {amount: Math.floor(Math.random()*10)+1};
                        this.objects.push(temp);
                        temp = new Placeable("Chest", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.4)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "", "", 100);
                        //add items to the chest
                        temp.invBlock = {items: {}};
                        temp.invBlock.invId = Math.random()*100000;
                        if(Math.random() < 0.7) temp.invBlock.items["Bomb"] = {amount: Math.floor(Math.random()*8)+1};
                        if(Math.random() < 0.5) temp.invBlock.items["Tech"] = {amount: Math.floor(Math.random()*6)+1};
                        if(Math.random() < 0.2) temp.invBlock.items["Fire Staff"] = {amount: 1};
                        if(Math.random() < 0.2) temp.invBlock.items["Laser Gun"] = {amount: 1};
                        if(Math.random() < 0.05) temp.invBlock.items["Philosopher's Stone"] = {amount: Math.floor(Math.random()*9)+1};
                        if(Math.random() < 0.05) temp.invBlock.items["Black Gem"] = {amount: Math.floor(Math.random()*10)+1};
                    }
                    else{
                        if(Math.random() < 0.9) temp = new Placeable("Floor", (((x+2.1)*3.98)+(this.cx*CHUNKSIZE)) * TILESIZE, (((y+2.1)*3.98)+(this.cy*CHUNKSIZE)) * TILESIZE, 0, 128, 128, 0, 0, "Server", "", 100);
                        else{
                            for(let i = 0; i < 4; i++){
                                for(let j = 0; j < 4; j++){
                                    this.data[(x*4)+7+i+(((y*4)+7+j) / CHUNKSIZE)] = old_dirt[(x*4)+7+i+(((y*4)+7+j) / CHUNKSIZE)];
                                }
                            }
                        }
                        if(Math.random() < 0.3){
                            for(let i = 0; i < 4; i++){
                                for(let j = 0; j < 4; j++){
                                    this.data[(x*4)+7+i+(((y*4)+7+j) / CHUNKSIZE)] = old_dirt[(x*4)+7+i+(((y*4)+7+j) / CHUNKSIZE)];
                                }
                            }
                        }
                    }
                    if(temp != undefined) this.objects.push(temp);
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