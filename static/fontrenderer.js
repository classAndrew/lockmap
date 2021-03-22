const bitmapWidth = 128;
const bitmapHeight = 64;
// chars aren't packed tightly for some reason >.>
const charWidth = 5+2;
const charHeight = 7+2;
const bitmapRatio = bitmapWidth/bitmapHeight;

const txtCtx = document.createElement("canvas").getContext("2d");

// key is the string and value is the buffer
const textCache = {}

class WorldFontRenderer {
    shader;
    gl;
    charBuffer;
    mapWidth;
    mapHeight;
    offsetX;
    offsetY;
    mView;
    mWorld;
    mProj;
    mViewLoc;
    mWorldLoc;
    mProjLoc;

    // vertices for a single character (will get subbuffered to change the character)
    // charVertices = [-1.0, -1.0, 0.0, 0.0, 0.0,
    //                 1.0, -1.0, 0.0, 0.0, 0.0,
    //                 -1.0, 1.0, 0.0, 0.0, 0.0,

    //                 1.0, 1.0, 0.0, 0.0, 0.0,
    //                 -1.0, 1.0, 0.0, 0.0, 0.0,
    //                 1.0, -1.0, 0.0, 0.0, 0.0];
    
    constructor(shader, gl, mapWidth, mapHeight, offsetX, offsetY, mView, mProj, mWorld) {
        [this.shader, this.gl, this.mapWidth, this.mapHeight, this.offsetX, this.offsetY, this.mView, this.mProj, this.mWorld] = 
            [shader, gl, mapWidth, mapHeight, offsetX, offsetY, mView, mProj, mWorld];
        // actually just use ortho
        this.mProj = new Float32Array(16);
        mat4.ortho(this.mProj, -2, 2, -2, 2, 0, 2);
        this.mapRatio = mapWidth/mapHeight;
        gl.useProgram(shader);
        this.mWorldLoc = gl.getUniformLocation(shader, "world");
        this.mProjLoc = gl.getUniformLocation(shader, "proj");
        this.mViewLoc = gl.getUniformLocation(shader, "view");
        gl.uniformMatrix4fv(this.mProjLoc, false, mProj);
        // initialize the char buffer. one buffer per char

        this.charBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.charBuffer);

        const vertices = [
            -1, -1, 0.00, 0, 0,
            1, -1, 0.00, 1, 0, 
            -1, 1, 0.00, 0, 1,
    
            1, 1, 0.00, 1, 1, 
            -1, 1, 0.00, 0, 1, 
            1, -1, 0.00, 1, 0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5*4, 3*4);
        gl.enableVertexAttribArray(1);

        // have to switch program to load uniform
        let uniLoc = gl.getUniformLocation(shader, "uSampler");
        // gl.activeTexture(gl.TEXTURE1);
        
        gl.uniform1i(uniLoc, 1);
    }
    
    // take in-game coordinates and render directly using vertices (no model matrix involved)
    // not a hud text renderer. Renders text into the world
    renderText(text, x, y, size) {
        this.gl.useProgram(this.shader);
        let tex = textCache[text];
        if (!tex) {
            var canvtext = canvText(text, 140*text.length/10, 120*text.length/10);
            tex = this.gl.createTexture();
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvtext);
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            textCache[text] = tex;
        }
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
        this.gl.uniformMatrix4fv(this.mViewLoc, false, this.mView);
        let temp = new Float32Array(this.mWorld);
        [x, y] = this.coordConv(x, y);
        // console.log(x, y)
        
        mat4.translate(temp, temp, [x, y, 0.002]);
        mat4.scale(temp, temp, [size, size, 1]);
        this.gl.uniformMatrix4fv(this.mWorldLoc, false, temp);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.charBuffer);
        // attribpointer can be set outside loop
        this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 5*4, 0);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 5*4, 3*4);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 3); 
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 3, 3);
        
        // can use textvertices as an instance var instead of new instantiatio

    }
    // in-game coordinates to opengl [-1, 1] coordinates
    coordConv(x, y) {
        let t = [(x+this.offsetX)/this.mapWidth, (this.mapHeight-y+this.offsetY)/this.mapHeight];
        return [-this.mapRatio+t[0]*this.mapRatio*2, -1+t[1]*2]
    }

}

function canvText(text, width, height) {
    txtCtx.canvas.width = width;
    txtCtx.canvas.height = height;
    txtCtx.font = "20px Sans-serif";
    txtCtx.textAlign = "center";
    txtCtx.textBaseline = "middle";
    txtCtx.fillStyle = "white";
    txtCtx.clearRect(0, 0, width, height);
    txtCtx.lineWidth = 2;
    txtCtx.strokeStyle = "#000000";
    txtCtx.strokeText(text, width/2, height/2);
    txtCtx.fillText(text, width/2, height/2);
    return txtCtx.canvas;
}