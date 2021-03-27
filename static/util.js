
function unproject(view, proj, mx, my, screenWidth, screenHeight, zoom) {
    // console.log(view, proj, mx, my);
    let x = 2.0 * mx / screenWidth - 1.0;
    let y = 1.0 - (2.0 * my) / screenHeight;
    let z = 1.0;
    // let ray_nds = vec3.fromValues(x, y, z);
    let ray_clip = vec4.fromValues(x, y, -1.0, 1.0);
    let projinv = new Float32Array(16);
    mat4.invert(projinv, proj);
    let ray_eye = vec4.create();
    mat4.mul(ray_eye, projinv, ray_clip);
    ray_eye = vec4.fromValues(ray_eye[0], ray_eye[1], -1.0, 0.0);
    // view inverse should be the same anyways since it's identity
    let viewinv = new Float32Array(16);
    mat4.invert(viewinv, view);
    let ray_wor = vec4.create();
    mat4.mul(ray_wor, viewinv, ray_eye);
    ray_wor = vec3.fromValues(ray_wor[0], ray_wor[1], ray_wor[2]);
    vec3.normalize(ray_wor, ray_wor);
    // plane normal. it's just <0, 0, 1>
    let n = vec3.fromValues(0, 0, 1);
    // distance from camera
    let d = -(1 + zoom);
    // origin of the ray. again, no view so it's just 0,0,0
    let O = vec3.fromValues(0, 0, 0);
    // compute t
    let t = -(dot3(O, n) + d) / dot3(ray_wor, n);
    vec3.scale(ray_wor, ray_wor, t);
    vec3.add(O, O, ray_wor);
    return O;
}

function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function getVertices(mapResX, mapResY, offsetX, offsetY, startX, startY, endX, endY) {
    let mapRatio = mapResX/mapResY;
    let [startx, starty, endx, endy] = [(startX+offsetX)/mapResX, (mapResY-startY+offsetY)/mapResY,
         (endX+offsetX)/mapResX, (mapResY-endY+offsetY)/mapResY];
    const terrVertices = [
        -mapRatio+startx*mapRatio*2, -1+starty*2, 0.001, 
        -mapRatio+endx*mapRatio*2, -1+starty*2, 0.001,
        -mapRatio+startx*mapRatio*2, -1+endy*2, 0.001,
        
        -mapRatio+endx*mapRatio*2, -1+endy*2, 0.001,
        -mapRatio+startx*mapRatio*2, -1+endy*2, 0.001,
        -mapRatio+endx*mapRatio*2, -1+starty*2, 0.001
    ];
    return terrVertices;
}

function getVerticesColor(mapResX, mapResY, offsetX, offsetY, startX, startY, endX, endY, color) {
    let mapRatio = mapResX/mapResY;
    let [startx, starty, endx, endy] = [(startX+offsetX)/mapResX, (mapResY-startY+offsetY)/mapResY,
         (endX+offsetX)/mapResX, (mapResY-endY+offsetY)/mapResY];
    const terrVertices = [
        -mapRatio+startx*mapRatio*2, -1+starty*2, 0.001, 
        ...color,
        -mapRatio+endx*mapRatio*2, -1+starty*2, 0.001,
        ...color,
        -mapRatio+startx*mapRatio*2, -1+endy*2, 0.001,
        ...color,
        -mapRatio+endx*mapRatio*2, -1+endy*2, 0.001,
        ...color,
        -mapRatio+startx*mapRatio*2, -1+endy*2, 0.001,
        ...color,
        -mapRatio+endx*mapRatio*2, -1+starty*2, 0.001,
        ...color
    ];
    return terrVertices;
}

// in-game coordinates (aka annoying offset time). 
function getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y1, thickness) {
    [x0, y0, x1, y1] = [(x0+offsetX)/mapResX, (mapResY-y0+offsetY)/mapResY,
        (x1+offsetX)/mapResX, (mapResY-y1+offsetY)/mapResY];
    let mapRatio = mapResX/mapResY;
    // compute perpendicular vectors (unit vec)
    let u = [(y1-y0), -(x1-x0)*mapRatio];
    vec2.normalize(u, u);
    vec2.scale(u, u, thickness);

    const lineVertices = [
        -mapRatio+(x0)*mapRatio*2-u[0], -1+(y0)*2-u[1], 0.0012, 
        -mapRatio+(x0)*mapRatio*2+u[0], -1+(y0)*2+u[1], 0.0012,
        -mapRatio+(x1)*mapRatio*2+u[0], -1+(y1)*2+u[1], 0.0012,

        -mapRatio+(x1)*mapRatio*2-u[0], -1+(y1)*2-u[1], 0.0012,
        -mapRatio+(x0)*mapRatio*2-u[0], -1+(y0)*2-u[1], 0.0012,
        -mapRatio+(x1)*mapRatio*2+u[0], -1+(y1)*2+u[1], 0.0012
    ];
    return lineVertices;
}

// in-game coordinates to opengl [-1, 1] coordinates
function coordConv(mapResX, mapResY, offsetX, offsetY, x, y) {
    return [(x+offsetX)/mapResX, (mapResY-y+offsetY)/mapResY]
}

// gets the bounding box vertices from points
function getBoxVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y1, thickness) {
    const vertices = [].concat(
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y0, thickness),
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x1, y0, x1, y1, thickness),
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x1, y1, x0, y1, thickness),
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y1, x0, y0, thickness),
    );
    return vertices;
}

// turns a hex color string into 3 normalized rgb. Otherwise hashes, then repeats
function hexToRGB (hx, name) {
    let a = hx ? parseInt(hx.substr(1)) : name.hashCode();
    return [((a >> 16) & 0xFF) / 255, ((a >> 8) & 0xFF) / 255, (a & 0xFF) / 255];
}

// fast hash
// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

class Info {

    static territories;
    
    // gets the territory WITH IN GAME COORDINATES
    static getLocation(x, y) {

    }
}

export {unproject, dot3, getVertices, getVerticesColor, getLineVertices, getBoxVertices, coordConv, hexToRGB, Info};