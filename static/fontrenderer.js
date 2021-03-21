const bitmapWidth = 128;
const bitmapHeight = 64;
// chars aren't packed tightly for some reason >.>
const charWidth = 5+2;
const charHeight = 7+2;
const bitmapRatio = bitmapWidth/bitmapHeight;

class WorldFontRenderer {
    shader;
    gl;
    charBuffer;
    fontmap;
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
    
    // fontmap is font bitmap and will be a texture that is already loaded
    constructor(shader, gl, mapWidth, mapHeight, offsetX, offsetY, fontmap, mView, mProj, mWorld) {
        [this.shader, this.gl, this.mapWidth, this.mapHeight, this.offsetX, this.offsetY, this.fontmap, this.mView, this.mProj, this.mWorld] = 
            [shader, gl, mapWidth, mapHeight, offsetX, offsetY, fontmap, mView, mProj, mWorld];
        this.mapRatio = mapWidth/mapHeight;
        this.mWorldLoc = gl.getUniformLocation(shader, "world");
        this.mProjLoc = gl.getUniformLocation(shader, "proj");
        this.mViewLoc = gl.getUniformLocation(shader, "view");
        gl.useProgram(shader);
        gl.uniformMatrix4fv(this.mProjLoc, false, mProj);
        // initialize the char buffer. one buffer per char
        this.charBuffer = Array(90);
        for (let i = 0; i <= 90; i++) {
            this.charBuffer[i] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.charBuffer[i]);
            let c = i;
            // TODO: optimize precompute
            let row = 1.0-(c/18*charHeight)/bitmapHeight;
            let col = ((c % 18)*charWidth)/bitmapWidth;
            let dx = charWidth/bitmapWidth;
            let dy = charHeight/bitmapHeight;
            let charVertices = [
                -1.0/bitmapRatio, -1.0, 0.0, col, row,
                1.0/bitmapRatio, -1.0, 0.0, (col+dx), row, 
                -1.0/bitmapRatio, 1.0, 0.0, col, row+dy,

                1.0/bitmapRatio, 1.0, 0.0, (col+dx), row+dy,
                -1.0/bitmapRatio, 1.0, 0.0, col, row+dy,
                1.0/bitmapRatio, -1.0, 0.0, (col+dx), row
            ];
            // let charVertices = [
            //     -1.0*bitmapRatio, -1.0, 0.1, 0.5, 0.5,
            //     1.0*bitmapRatio, -1.0, 0.1, 0.6, 0.5, 
            //     -1.0*bitmapRatio, 1.0, 0.1, 0.5, 0.6,

            //     1.0*bitmapRatio, 1.0, 0.1, 0.6, 0.6,
            //     -1.0*bitmapRatio, 1.0, 0.1, 0.5, 0.6,
            //     1.0*bitmapRatio, -1.0, 0.1, 0.6, 0.5
            // ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(charVertices), gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5*4, 3*4);
            gl.enableVertexAttribArray(1);
        }
        // load the bitmap
        // have to switch program to load uniform
        gl.useProgram(shader);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fontmap);
        let uniLoc = gl.getUniformLocation(shader, "uSampler");
        gl.uniform1i(uniLoc, 1);
    }
    
    // take in-game coordinates and render directly using vertices (no model matrix involved)
    // not a hud text renderer. Renders text into the world
    renderText(text, x, y, size) {
        // length = num letters * 3 * 2
        // I spent too long trying to figure textures out. The uniforms are alreay binded to the textures at init time
        this.gl.useProgram(this.shader);
        this.gl.uniformMatrix4fv(this.mViewLoc, false, this.mView);
        let temp = new Float32Array(16);
        let shift = this.coordConv(-876, -1577).concat(0.0002);
        // shift[2] = 0.01;
        mat4.scale(temp, this.mWorld, [1.0, 1.0, 1.0]);
        let translation = vec3.create();
        vec3.set(translation, shift[0]/size, shift[1]/size, shift[2]);
        mat4.scale(temp, temp, [size, size, 1.0]);
        mat4.translate(temp, temp, translation);
        
        this.gl.uniformMatrix4fv(this.mWorldLoc, false, temp);
        for (let i = 0; i < text.length; i++) {
            let c = text.charCodeAt(i)-32;
            this.gl.bindBuffer(gl.ARRAY_BUFFER, this.charBuffer[c]);
            // attribpointer can be set outside loop
            this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 5*4, 0);
            this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 5*4, 3*4);
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 3); 
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 3, 3);
            mat4.translate(temp, temp, [1, 0.0, 0]);
            this.gl.uniformMatrix4fv(this.mWorldLoc, false, temp);
        }
        // can use textvertices as an instance var instead of new instantiatio

    }
    // in-game coordinates to opengl [-1, 1] coordinates
    coordConv(x, y) {
        let t = [(x+this.offsetX)/this.mapWidth, (this.mapHeight-y+this.offsetY)/this.mapHeight];
        return [-this.mapRatio+t[0]*this.mapRatio*2, -1+t[1]*2]
    }

}