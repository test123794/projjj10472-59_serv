

module.exports.genToken = (nickname, password) => {
    return sha256(nickname + "_" + password + "_" + secret_string)
}
module.exports.checkToken = (token, nickname, password) => {
    return token === this.genToken(nickname, password)
}
module.exports.addUserInDatabase = (nickname, password) => {
    let user = {
        nickname,
        shaToken: this.genToken(nickname, password ? password : Math.random() + ":" + Math.random()),
        isGuest: password ? undefined : true
    }
    db.get("users").push(user).write()
    return user.shaToken
}
module.exports.getRoomObject = (roomId) => {
    let width = 125, height = 125;
    return {
        id: roomId,
        time: 60*60*1000,
        players: [],
        objects: generateObjects(100),
        buildings: generateBuildings(width, height),
        width,
        height,
        size: 80
    }
}
module.exports.getAngle = (x, y) => {
    let angle = Math.atan(X/Y) * 180 / Math.PI;
    if (Y < 0){
        angle += 180;
    }
    if (Y === 0){
        angle = 0;
    }
    angle -= 90;
    return angle;
}
module.exports.random = (min, max) => {
    return Math.floor( min + Math.random() * (max + 1 - min) );
}
module.exports.isCircleBeaten = (x0, y0, x, y, x1, y1, r1, maxAngle = 60) =>{
    let r0 = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
    let r = Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2))
    if (r1 + r0 < r) return false;
    let vX = x1 - x0;
    let vY = y1 - y0;
    let angle = Vector.angle(x, y, vX, vY);

    if (angle <= maxAngle) return true;

    let rot1 = Vector.rotate(x, y, 60)
    let rot2 = Vector.rotate(x, y, -60)

    let l1 = this.fromDotToLine([x0, y0, x0+rot1[0], y0+rot1[1]], x1, y1)[0];
    if (l1 <= r1) return true;

    let l2 = this.fromDotToLine([x0, y0, x0+rot2[0], y0+rot2[1]], x1, y1)[0];
    return l2 <= r1;
}
module.exports.fromDotToLine = ([x0, y0, x1, y1], dX, dY, needToDots = false) => {
    let a = Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2);
    let b = Math.pow(x0 - dX, 2) + Math.pow(y0 - dY, 2);
    let c = Math.pow(x1 - dX, 2) + Math.pow(y1 - dY, 2);

    if (Math.min(b, c) + a <= Math.max(b, c)) {
        if (needToDots){
            let sqrtB = Math.sqrt(b);
            let sqrtC = Math.sqrt(c);
            return [Math.min(sqrtB, sqrtC), sqrtB, sqrtC]
        }
        return [Math.sqrt(Math.min(b, c)), Infinity, Infinity]
    }

    return [this.fromDotToFullLine([x0, y0, x1, y1], dX, dY), Infinity, Infinity];
}
module.exports.fromDotToDot = (d1X, d1Y, d2X, d2Y) => {
    return Math.sqrt(
        (d2X - d1X)**2 + (d2Y - d1Y)**2
    )
}
module.exports.fromDotToFullLine = ([x0, y0, x1, y1], dX, dY) => {
    let _a = y1 - y0;
    let _b = x0 - x1;
    let _c = y0 * (x1 - x0) - x0 * (y1 - y0);

    return Math.abs(_a * dX + _b * dY + _c) / Math.sqrt(_a * _a + _b * _b);
}


// map generators
function generateObjects(count){
    let objects = []
    let types = ["tree", "stone"]
    for (let i = 0; i < count; i++){
        let _res = Math.floor(Math.random() * 30) + 30;
        let obj = {
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            type:  types[Math.floor(Math.random()*types.length)],
            resource: [_res, _res],
            radius: Math.floor(Math.random() * 20) + 50,
            id: i+1
        }
        objects.push(obj)
    }
    return objects;
}
function generateBuildings(w, h){
    let buildings = Array.apply(null, Array(h)).map(() => {
        return Array.apply(null, Array(w)).map(() => {
            return null
        })
    });
    return buildings;
}