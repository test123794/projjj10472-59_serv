class Vector {
    static scalar (x1, y1, x2, y2){
        return x1*x2 + y1*y2;
    }
    static abs(x, y){
        return Math.sqrt(
            x*x + y*y
        )
    }
    static angle(x1, y1, x2, y2){
        let scalar = this.scalar(x1, y1, x2, y2);
        let abs1 = this.abs(x1, y1);
        let abs2 = this.abs(x2, y2);
        return Math.acos(
            scalar / (abs1 * abs2)
        ) / Math.PI * 180
    }
    static rotate(x, y, angle){
        let sin = Math.sin(angle*Math.PI/180)
        let cos = Math.cos(angle*Math.PI/180);

        return [
            x*cos - y*sin,
            x*sin + y*cos
        ]
    }
}

function init (){
    global.Vector = Vector;
}

module.exports = init;