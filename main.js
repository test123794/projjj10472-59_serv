console.log("--> SERVER v0.0.3")

const WebSocket = require('ws');
const sha256 = require("sha256")
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const utils = require("./utils")
const items = require("./items")
const Player = require("./Player").class
require("./vector")()

const MAP_SIZE = 10000
const TICK = 60;
const INTERVAL = 1000/TICK;
const MOVE_PER_SECOND = 250;
const MAX_SPEED = MOVE_PER_SECOND/TICK;
const RADIUS = 40;
const MIN_X = RADIUS;
const MIN_Y = RADIUS;
const MAX_X = MAP_SIZE - RADIUS;
const MAX_Y = MAP_SIZE - RADIUS;

const secret_string = "9e11ce5ad1753cd0957ddf9311b1d6f82b"

const adapter = new FileSync('db.json')
const db = low(adapter)

global.MAP_SIZE = MAP_SIZE
global.db = db;
global.secret_string = secret_string
global.sha256 = sha256;
global.items = items;
global.utils = utils;

db.defaults({
    users: [{
        nickname: "TimiT",
        shaToken: "6bfcf0ffb79c2fea8a10bdab77f694db6e3b5756668592f67e5ce7ae1b776ea1",
        admin: true
    }]
})
    .write()

let LAST_ROOM_ID = 1;

const wss = new WebSocket.Server({ port: 8979 });

let sockets = [];
let rooms = []
global.rooms = rooms;

wss.on('connection', async (ws) => {
    let player = new Player(ws);
    ws.player = player;
    sockets.push(ws)

    console.log("Connected: " + player.id);

    ws.send(JSON.stringify({
        method: "updateItems",
        data: {
            itemStates: items.getItemStates()
        }
    }))

    ws.on('message', (message) => {
        try {
            message = JSON.parse(message)
        } catch (e){
            return;
        }

        if (message.method === "reg"){
            let errorTag = "Ошибка при создании аккаунта"
            let nickname = String(message.data.nickname).replace("\n", "");

            if (nickname.length > 18) return player.error(errorTag, "никнейм должен быть не более 18 символов в длину")
            if (nickname.length < 3) return player.error(errorTag, "никнейм должен быть не менее 3 символов в длину")

            let password = String(message.data.password);

            if (password.length > 25) return player.error(errorTag, "пароль должен быть не более 25 символов в длину")
            if (password.length < 8) return player.error(errorTag, "пароль должен быть не менее 8 символов в длину")

            let hasUser = db.get("users").find({nickname}).value();
            if (hasUser){
                return player.error(errorTag, "пользователь с таким никнеймом (" + nickname + ") уже существует")
            }

            player.login(nickname, utils.addUserInDatabase(nickname, password))
        } else if (message.method === "login"){
            let errorTag = "Ошибка при входе в аккаунт"
            let nickname = String(message.data.nickname);
            let password = String(message.data.password);

            let user = db.get("users").find({nickname}).value();

            if (!user){
                return player.error(errorTag, "пользователя с таким никнеймом (" + nickname + ") не существует")
            }
            if (user.shaToken !== utils.genToken(nickname, password)){
                return player.error(errorTag, "неправильный пароль")
            }
            player.login(nickname, user.shaToken)
        } else if (message.method === "loginAsGuest"){
            let errorTag = "Ошибка при создании гостевого аккаунта"
            let nickname = String(message.data.nickname).replace("\n", "");

            if (nickname.length > 18) return player.error(errorTag, "никнейм должен быть не более 18 символов в длину")
            if (nickname.length < 3) return player.error(errorTag, "никнейм должен быть не менее 3 символов в длину")

            player.loginAsGuest(nickname, utils.addUserInDatabase(nickname))
        } else if (message.method === "loginUsingToken"){
            let token = String(message.data.token)

            let user = db.get("users").find({shaToken: token}).value();
            if (!user){
                return player.error("Ошибка проверки подписи", "неверная подпись. Попробуйте выполнить вход в аккаунт заново", {wrongToken: true})
            }
            player.login(user.nickname, token)
        } else if (message.method === "logout"){
            if (player.token){
                player.logout()
            }
        } else if (!player.token) return player.error("Ошибка проверки подписи", "не произведен вход в аккаунт");

        if (message.method === "joinRoom"){
            if (player.room) return;
            let room = rooms.find(r => r.players.length < 15);
            if (!room){
                room = utils.getRoomObject(LAST_ROOM_ID++)
                rooms.push(room)
            }
            player.joinRoom(room)
        } else if (message.method === "updateJoystick"){
            if (!player.room) return
            player.updateJoystick(message.data.kX, message.data.kY)
            // console.log(message.data)
        } else if (message.method === "useCurrentThing") {
            if (!player.room) return;
            if (player.isUsingItem) return;
            if (!player.getInventoryItem().name) return;

            let item = items.getItemStats(player.getInventoryItem().name);

            if (item.type === "weapon"){
                player.useWeapon(item);
            } else if (item.type === "tool"){
                player.useTool(item)
            } else {
                return;
            }

            player.isUsingItem = true;
            player.lockRotation = true;
            setTimeout(() => {
                player.lockRotation = false;
            }, 500)
            setTimeout(() => {
                player.isUsingItem = false;
            }, item.oneUseTime)

            player.room.players.forEach(p => {
                p.ws.send(JSON.stringify({
                    method: "updateStates",
                    data: {
                        newStatesData: {
                            useWeapon: {
                                useItemTime: item.oneUseTime,
                                degrees: item.degrees,
                                length: item.length,
                                user_id: player.id
                            }
                        }
                    }
                }))
            })

            player._kX = player.kX;
            player._kY = player.kY;
        } else if (message.method === "setActiveSlot"){
            if (!player.room) return;

            let slot = Math.floor(Number(message.data));
            if (slot < 1 || slot > 5){
                return;
            }

            player.activeSlot = slot - 1;
        } else if (message.method === "moveItem"){
            if (!player.room) return;

            let fromSlot = message.data ? Math.floor(Number(message.data[0])) : -1;
            let toSlot = message.data ? Math.floor(Number(message.data[1])) : -1;

            if (fromSlot < 1 || fromSlot > 20 || toSlot < 1 || toSlot > 20 || toSlot === fromSlot) return;

            player.moveItem(fromSlot-1, toSlot-1)
        } else if (message.method === "craft"){
            if (!player.room) return;

            let item = items.getItemStats(message.data);
            if (!item) return;

            let allowedCraft = true;

            for (let i = 0; i < item.crafts.length; i++){
                if (item.crafts[i].count > player.getCount(item.crafts[i].name)){
                    allowedCraft = false;
                    break;
                }
            }

            if (allowedCraft){
                for (let i = 0; i < item.crafts.length; i++){
                    player.removeCountOfItems(item.crafts[i].name, item.crafts[i].count);
                }
                player.addItem({name: item.name, count: 1}, true);
            }
        } else if (message.method === "build"){
            if (!player.room) return;
            let x = message.data.x, y = message.data.y;
            if (message.data.name === undefined ||
                player.room.buildings[x] === undefined ||
                player.room.buildings[x][y] != null) return;

            let invItem = player.inventory.find(i => i.name === message.data.name)
            if (invItem === undefined) return;

            player.removeCountOfItems(invItem.name, 1);
            player.updateInventory();

            player.room.buildings[x][y] = {name: message.data.name, size: [80, 80]}

            player.room.players.forEach(p => {
                p.ws.send(JSON.stringify({
                    method: "updateBuilding",
                    data: {
                        updateBuilding: {
                            x, y,
                            building: player.room.buildings[x][y]
                        }
                    }
                }));
            });
        }
    })
    ws.on("close", () => {
        console.log("Disconnected: " + player.id)
        sockets = sockets.filter(s => s.player.id !== player.id)
        player.logout()
    })
});


setInterval(() => {
    rooms.forEach(room => {
        let t1 = +new Date();
        for (let player of room.players){
            updatePosition(player)
        }
        let t2 = +new Date()
        if (t2 - t1 > 0){
            console.log("Time: " + (t2 - t1) + "ms")
        }
        room.players.forEach(player => {
            player.ws.send(JSON.stringify({
                method: "updateStates",
                data: {
                    newStatesData: {
                        time: room.time,
                        players: room.players.map(p => p.getProfile())
                    }
                }
            }))
        })
        for (let player of room.players){
            player.damaged = undefined;
        }
    })
}, INTERVAL)

function updatePosition(player){
    if (player.isStaying) return;
    let changeX = player.kX * MAX_SPEED;
    let changeY = player.kY * MAX_SPEED;
    player.x += changeX;
    player.y += changeY;

    // check walls

    if (player.x > MAX_X) player.x = MAX_X;
    if (player.y > MAX_Y) player.y = MAX_Y;
    if (player.x < MIN_X) player.x = MIN_X;
    if (player.y < MIN_Y) player.y = MIN_Y;

    // check objects

    for (let obj of player.room.objects){
        let r = Math.sqrt(Math.pow(obj.x - player.x, 2) + Math.pow(obj.y - player.y, 2));
        let minRadius = RADIUS + obj.radius;
        if (r < minRadius){
            let k = minRadius / r;
            let curDX = obj.x - player.x;
            let curDY = obj.y - player.y;

            let sin = curDX / r;
            let cos = curDY / r;

            player.x -= minRadius * sin - curDX;
            player.y -= minRadius * cos - curDY;
        }
    }

    // check buildings

    let step = 2;
    for (let i = Math.max(Math.floor(player.x / player.room.size - step), 0); i < Math.min(player.room.width, Math.floor(player.x / player.room.size + step)); i++){
        for (let j = Math.max(Math.floor(player.y / player.room.size - step), 0); j < Math.min(player.room.width, Math.floor(player.y / player.room.size + step)); j++){
            let building = player.room.buildings[i][j];
            if (building){
                let startX = player.room.size * i;
                let startY = player.room.size * j;

                let left = utils.fromDotToLine([startX, startY, startX, startY + player.room.size], player.x, player.y, true);
                let right = utils.fromDotToLine([startX + player.room.size, startY, startX + player.room.size, startY + player.room.size], player.x, player.y, true);

                if (left[0] < RADIUS){
                    if (left[1] !== Infinity){
                        if (left[1] < left[2]) byDotHelper(player, [startX, startY], left[0]);
                        else byDotHelper(player, [startX, startY+player.room.size], left[0]);
                    } else player.x -= RADIUS - left[0];
                } else if (right[0] < RADIUS){
                    if (right[1] !== Infinity){
                        if (right[1] < right[2]) byDotHelper(player, [startX+player.room.size, startY], right[0]);
                        else byDotHelper(player, [startX+player.room.size, startY+player.room.size], right[0]);
                    } else player.x += RADIUS - right[0];
                }

                let bottom = utils.fromDotToLine([startX, startY + player.room.size, startX + player.room.size, startY + player.room.size], player.x, player.y, true);
                let top = utils.fromDotToLine([startX, startY, startX + player.room.size, startY], player.x, player.y, true);

                if (top[0] < RADIUS){
                    player.y -= RADIUS - top[0];
                } else if (bottom[0] < RADIUS){
                    player.y += RADIUS - bottom[0];
                }
            }
        }
    }
}

function byDotHelper(player, [dotX, dotY], distance){
    let curDX = dotX - player.x;
    let curDY = dotY - player.y;

    let sin = curDX / distance;
    let cos = curDY / distance;

    player.x -= RADIUS * sin - curDX;
    player.y -= RADIUS * cos - curDY;
}