let LAST_USER_ID = 1;
class Player {
    constructor(ws) {
        this.x = 200;
        this.y = 200;

        this.kX = 0;
        this.kY = 0;

        this.id = LAST_USER_ID++;

        this.damaged = undefined;
        this.healed = undefined;

        this.ws = ws;
    }

    updateJoystick(kX, kY){
        if (kX === 0 && kY === 0) {
            this.isStaying = true;
        } else {
            this.isStaying = false; 
            let gip = Math.sqrt(Math.pow(kX, 2) + Math.pow(kY, 2))

            if (gip > 1.000001) {
                kX = kX / gip;
                kY = kY / gip;
            }
            this.kX = kX;
            this.kY = kY;
        }
    }

    joinRoom (room){
        this.isStaying = true;
        this.isUsingItem = false;
        this.lockRotation = false;
        this.room = room
        this.activeSlot = 0;
        this.health = 222;
        this.maxHealth = this.health
        this.level = 1;
        this.exp = [0, 50]
        this.createInventory();

        room.players.push(this);

        this.ws.send(JSON.stringify({
            method: "updateLocation",
            data: {
                locationStates: {
                    objects: room.objects.map(o => {
                        return {x: o.x, y: o.y, type: o.type, id: o.id, radius: o.radius}
                    }),
                    buildings: room.buildings,
                    players: room.players.map(p => p.getProfile()),
                    width: room.width,
                    height: room.height,
                    size: room.size
                }
            }
        }))
    }

    login (nickname, token, guest= false){
        this.nickname = nickname;
        this.canJoin = true;
        this.token = token

        this.ws.send(JSON.stringify({
            method: "login",
            data: {
                loginData: {
                    token, guest, nickname, id: this.id
                }
            }
        }))
    }

    loginAsGuest(nickname, token){
        this.login(nickname, token, true)
        this.isGuest = true
    }

    getProfile() {
        return {
            nickname: this.nickname,
            id: this.id,
            x: this.x,
            y: this.y,
            kX: this.lockRotation ? this._kX : this.kX,
            kY: this.lockRotation ? this._kY : this.kY,
            holdingItem: this.getInventoryItem().name,
            health: [this.health, this.maxHealth],
            exp: this.exp, 
            level: this.level,
            damaged: this.damaged
        }
    }

    error (errorTag, errorMessage, otherData={}){
        this.ws.send(JSON.stringify({
            method: "error",
            data: Object.assign({
                message: errorTag + ": " + errorMessage
            }, otherData)
        }))
    }

    logout() {
        if (this.room){
            this.leaveRoom()
        }
        if (this.isGuest){
            db.get("users").remove({shaToken: this.token}).write()
        }
        delete this.token;
    }

    leaveRoom() {
        this.room.players = this.room.players.filter(p => p.id !== this.id)
        this.room.players.forEach(p => {
            p.ws.send(JSON.stringify({
                method: "playerLeave",
                data: {
                    player: {
                        id: this.id
                    }
                }
            }))
        })
        if (this.room.players.length === 0){
            rooms = rooms.filter(r => r.id !== this.room.id)
        }
        delete this.inventory;
        delete this.room;
    }

    createInventory() {
        this.inventory = []
        for (let i = 0; i < 20; i++){
            this.inventory[i] = {}
        }
        this.addItem({name: "wooden_ax", count: 1});
        this.addItem({name: "wood", count: 10}, true)
    }

    addItem(item, notify=false){
        if (!this.inventory) return;

        let globalItem = items.getItemStats(item.name)
        let count = item.count;

        for (let i = 0; i < this.inventory.length; i++){
            if (count <= 0) break;
            if (this.inventory[i].name === item.name){
                let _count = Math.min(
                    globalItem.maxCount - this.inventory[i].count,
                    count
                )
                count -= _count;
                this.inventory[i].count += _count;
            }
        }
        for (let  i = 0; i < this.inventory.length; i++){
            if (count <= 0) break;
            if (!this.inventory[i].name){
                let _count = Math.min(
                    globalItem.maxCount,
                    count
                )
                count -= _count
                this.inventory[i] = {name: item.name, count: _count}
            }
        }

        if (notify){
            this.updateInventory()
        }
    }

    updateInventory(){
        this.ws.send(JSON.stringify({
            method: "updateInventory",
            data: {
                inventory: this.inventory.map((i) => {
                    if (!i.name) return null;
                    return {
                        name: i.name,
                        count: i.count
                    }
                })
            }
        }))
    }

    removeItem(slot){
        this.inventory[slot] = {}
    }

    setItem(slot, item){
        this.inventory[slot] = Object.assign({}, item)
    }

    moveItem(fromSlot, toSlot){
        let from = this.inventory[fromSlot];
        let to = this.inventory[toSlot];

        if (!to.name){
            this.setItem(toSlot, from)
            this.removeItem(fromSlot);
        } else if (to.name !== from.name){
            this.setItem(toSlot, from)
            this.setItem(fromSlot, to)
        } else {
            let toGlobal = items.getItemStats(to.name)
            if (toGlobal.maxCount >= to.count + from.count){
                to.count += from.count;
                this.removeItem(fromSlot);
            } else {
                from.count = to.count + from.count - toGlobal.count
                to.count = toGlobal.maxCount
            }
        }
    }

    setActiveSlot(slot){
        this.activeSlot = slot;
    }

    getInventoryItem(slot=this.activeSlot){
        return this.inventory[slot];
    }

    useWeapon(item, k=item.length / Math.sqrt(this.kX * this.kX + this.kY * this.kY)) {
        for (let p of this.room.players){
            if (p.id === this.id) continue;
            if (utils.isCircleBeaten(this.x, this.y, k*this.kX, k*this.kY, p.x, p.y, 40)){
                let dam = utils.random(item.damage[0], item.damage[1]);
                if (p.damage(dam)){
                    this.addExp(100);
                }
            }
        }
    }

    useTool(item){
        let k = item.length / Math.sqrt(this.kX * this.kX + this.kY * this.kY);
        this.useWeapon(item, k)

        for (let o of this.room.objects){
            if (utils.isCircleBeaten(this.x, this.y, k*this.kX, k*this.kY, o.x, o.y, o.radius)){
                let res = item.canMine.find(i => i.res === items.mineFromObject(o.type))
                if (!res) return;
                this.addItem({name: res.res, count: res.amount}, true)
                this.addExp(res.amount);
            }
        }
    }

    getCount(item){
        let c = 0;
        for (let i = 0; i < this.inventory.length; i++){
            if (item === this.inventory[i].name){
                c += this.inventory[i].count;
            }
        }
        return c;
    }

    removeCountOfItems(name, count=1){
        for (let i = 0; i < this.inventory.length && count > 0; i++){
            if (this.inventory[i].name === name){
                if (count >= this.inventory[i].count){
                    count -= this.inventory[i].count;
                    this.removeItem(i);
                } else {
                    this.inventory[i].count -= count;
                    count = 0;
                }
            }
        }
    }

    damage(dam){
        this.health -= dam;

        for (let p of this.room.players){
            p.ws.send(JSON.stringify({
                method: "damaged",
                data: {
                    damaged: {
                        id: this.id,
                        damage: dam
                    }
                }
            }))
        }

        if (this.health <= 0){
            this.die();
            return true;
        }
        return false
    }

    die() {
        this.leaveRoom()

        this.ws.send(JSON.stringify({
            method: "died"
        }))
    }

    addExp(exp){
        this.exp[0] += exp;
        while (this.exp[0] >= this.exp[1]){
            this.exp[0] -= this.exp[1]
            this.exp[1] *= 2;
        }
    }
}

exports.class = Player;